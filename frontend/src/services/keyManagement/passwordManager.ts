export class PasswordManager {
  static async getPassword(): Promise<string> {
    // Check sessionStorage for password
    const sessionPassword = sessionStorage.getItem("password");
    if (sessionPassword) {
      return sessionPassword;
    }

    // Check localStorage for password
    const localPassword = localStorage.getItem("password");
    if (localPassword) {
      sessionStorage.setItem("password", localPassword);
      return localPassword;
    }

    // If no password, generate a new one
    const newPassword = this.generateSecurePassword();
    sessionStorage.setItem("password", newPassword);
    localStorage.setItem("password", newPassword);
    return newPassword;
  }

  private static generateSecurePassword(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).slice(0, 32);
  }
}
