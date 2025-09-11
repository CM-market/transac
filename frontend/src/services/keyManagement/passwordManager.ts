export class PasswordManager {
  private static isRegistering = false;
  private static isAuthenticating = false;
  private static webAuthnModule: {
    handleRegister: () => Promise<void>;
    handleAuthenticate: () => Promise<string[]>;
    saveMessage: () => Promise<void>;
  } | null = null;

  // Enhanced WebAuthn module loader with better error handling
  private static async loadWebAuthnModule() {
    if (this.webAuthnModule) {
      return this.webAuthnModule;
    }

    try {
      // Try to load the module with proper error handling
      const module = await import("@adorsys-gis/web-auth-prf");

      // Verify the module has the required functions
      if (
        typeof module.handleRegister === "function" &&
        typeof module.handleAuthenticate === "function" &&
        typeof module.saveMessage === "function"
      ) {
        this.webAuthnModule = module;
        return module;
      } else {
        throw new Error("WebAuthn module missing required functions");
      }
    } catch (error) {
      // Return a mock module that uses fallback behavior
      this.webAuthnModule = {
        handleRegister: async () => {
          return Promise.resolve();
        },
        handleAuthenticate: async () => {
          return Promise.resolve([this.generateSecurePassword()]);
        },
        saveMessage: async () => {
          return Promise.resolve();
        },
      };
      return this.webAuthnModule;
    }
  }

  static async initializeDOMElements() {
    // Remove existing elements first to avoid duplicates
    const existingInput = document.querySelector("#messageInput");
    if (existingInput) {
      existingInput.remove();
    }

    const existingList = document.querySelector("#messageList");
    if (existingList) {
      existingList.remove();
    }

    // Create new elements
    const input = document.createElement("input");
    input.type = "hidden";
    input.id = "messageInput";
    document.body.appendChild(input);

    const list = document.createElement("ul");
    list.id = "messageList";
    list.style.display = "none";
    document.body.appendChild(list);
  }

  static async getPassword(): Promise<string | undefined> {
    // Check sessionStorage for password
    const storedPassword = sessionStorage.getItem("password");
    if (storedPassword) {
      return storedPassword;
    }

    await this.initializeDOMElements();

    try {
      const messages = JSON.parse(localStorage.getItem("messages") ?? "[]");
      let password: string | undefined;

      if (messages.length > 0) {
        password = await this.attemptAuthentication();
      } else {
        password = await this.handleNewUserRegistration();
      }

      // If WebAuthn fails, fall back to generating a password
      if (!password) {
        password = this.generateSecurePassword();
      }

      // Store the password in sessionStorage
      sessionStorage.setItem("password", password);
      return password;
    } catch (error) {
      // Fallback to generating a password
      const fallbackPassword = this.generateSecurePassword();
      sessionStorage.setItem("password", fallbackPassword);
      return fallbackPassword;
    }
  }

  private static async attemptAuthentication(): Promise<string | undefined> {
    if (this.isAuthenticating) return undefined;
    this.isAuthenticating = true;

    try {
      await this.cancelPendingRequests();

      const module = await this.loadWebAuthnModule();

      const decryptedPassword = await module.handleAuthenticate();

      if (decryptedPassword && decryptedPassword.length > 0) {
        return decryptedPassword[0];
      } else {
        return undefined;
      }
    } catch (error) {
      return undefined;
    } finally {
      this.isAuthenticating = false;
    }
  }

  private static async handleNewUserRegistration(): Promise<
    string | undefined
  > {
    if (this.isRegistering) return undefined;
    this.isRegistering = true;

    try {
      await this.cancelPendingRequests();

      const module = await this.loadWebAuthnModule();

      // Remove timeout - let WebAuthn registration continue until completion or user cancellation
      await module.handleRegister();

      const newPassword = this.generateSecurePassword();

      const input = document.querySelector<HTMLInputElement>("#messageInput");

      if (input) {
        input.value = newPassword;
        await module.saveMessage();
      }

      return newPassword;
    } catch (error) {
      return undefined;
    } finally {
      this.isRegistering = false;
    }
  }

  private static async cancelPendingRequests(): Promise<void> {
    try {
      const abortController = new AbortController();
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      setTimeout(() => abortController.abort(), 100);
      await navigator.credentials.get({
        signal: abortController.signal,
        publicKey: { challenge, allowCredentials: [] },
      });
    } catch (error) {
      // Expected abort error
    }
  }

  private static generateSecurePassword(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).slice(0, 32);
  }
}
