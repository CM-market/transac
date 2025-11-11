/**
 * PWA utilities for service worker registration and install prompts
 */

// Type definitions
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      parameters?: Record<string, unknown>,
    ) => void;
  }
}

// VitePWA handles service worker registration automatically
// This comment replaces the manual registration function

// Install Prompt Management
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Listen for install prompt
export function setupInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    console.log("[PWA] Install prompt triggered");
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  // Show install popup on page load if app is not installed and user hasn't dismissed it
  setTimeout(() => {
    if (!isAppInstalled() && !hasUserDismissedInstallPrompt()) {
      console.log("[PWA] App not installed, showing install popup");
      showInstallPopup();
    } else if (isAppInstalled()) {
      console.log("[PWA] App already installed, no popup needed");
    } else {
      console.log("[PWA] User dismissed install prompt, no popup shown");
    }
  }, 3000); // Give more time for Firefox to load manifest

  // Listen for successful installation
  window.addEventListener("appinstalled", () => {
    console.log("[PWA] App was installed successfully");
    deferredPrompt = null;
    hideInstallButton();

    // Track installation (if analytics is available)
    if (window.gtag) {
      window.gtag("event", "pwa_install", {
        event_category: "PWA",
        event_label: "App Installed",
      });
    }
  });
}

// Hide any existing install elements (cleanup)
function hideInstallButton(): void {
  const installButton = document.getElementById("pwa-install-button");
  if (installButton) {
    installButton.remove();
  }
  const installPopup = document.getElementById("pwa-install-popup");
  if (installPopup) {
    installPopup.remove();
  }
}

// Show install instructions modal
function showInstallModal(): void {
  const modal = document.createElement("div");
  modal.id = "pwa-install-modal";

  // Create modal with inline styles for better compatibility
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    border-radius: 8px;
    max-width: 400px;
    width: 100%;
    padding: 24px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  `;

  modalContent.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">Install Transac App</h3>
      <button id="close-modal" style="background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 4px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div style="margin-bottom: 16px;">
      <p style="margin: 8px 0; font-size: 14px; color: #4B5563;"><strong>Chrome/Edge:</strong> Click the menu (⋮) → "Install Transac" or look for install icon in address bar</p>
      <p style="margin: 8px 0; font-size: 14px; color: #4B5563;"><strong>Firefox:</strong> Click the menu (☰) → "Install this site as an app" or look for install icon in address bar</p>
      <p style="margin: 8px 0; font-size: 14px; color: #4B5563;"><strong>Safari:</strong> Tap Share button → "Add to Home Screen"</p>
    </div>
    <button id="got-it-btn" style="
      width: 100%;
      background: #10B981;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    ">
      Got it
    </button>
  `;

  modal.appendChild(modalContent);

  // Add event listeners
  const closeBtn = modalContent.querySelector("#close-modal");
  const gotItBtn = modalContent.querySelector("#got-it-btn");

  const closeModal = () => {
    document.body.removeChild(modal);
  };

  closeBtn?.addEventListener("click", closeModal);
  gotItBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Add hover effect to got it button
  gotItBtn?.addEventListener("mouseenter", () => {
    (gotItBtn as HTMLElement).style.background = "#059669";
  });
  gotItBtn?.addEventListener("mouseleave", () => {
    (gotItBtn as HTMLElement).style.background = "#10B981";
  });

  document.body.appendChild(modal);
}

// Check if app is installed
export function isAppInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true ||
    document.referrer.includes("android-app://")
  );
}

// Check if user has dismissed install prompt
function hasUserDismissedInstallPrompt(): boolean {
  const dismissed = localStorage.getItem("pwa-install-dismissed");
  if (!dismissed) return false;

  // Check if dismissal was more than 7 days ago
  const dismissedTime = parseInt(dismissed);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return dismissedTime > weekAgo;
}

// Mark install prompt as dismissed
function markInstallPromptDismissed(): void {
  localStorage.setItem("pwa-install-dismissed", Date.now().toString());
}

// Show install popup on page load
function showInstallPopup(): void {
  const modal = document.createElement("div");
  modal.id = "pwa-install-popup";

  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.3s ease-out;
  `;

  const popupContent = document.createElement("div");
  popupContent.style.cssText = `
    background: white;
    border-radius: 16px;
    max-width: 400px;
    width: 100%;
    padding: 32px 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    text-align: center;
    transform: scale(0.9);
    animation: popIn 0.3s ease-out forwards;
  `;

  popupContent.innerHTML = `
    <div style="margin-bottom: 24px;">
      <div style="width: 80px; height: 80px; background: #10B981; border-radius: 20px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <h3 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Install Transac</h3>
      <p style="font-size: 16px; color: #6B7280; margin: 0; line-height: 1.5;">Get the full app experience with offline access and faster loading.</p>
    </div>
    
    <div style="display: flex; gap: 12px; flex-direction: column;">
      <button id="install-now-btn" style="
        width: 100%;
        background: #10B981;
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        border: none;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      ">
        Install Now
      </button>
      
      <button id="maybe-later-btn" style="
        width: 100%;
        background: transparent;
        color: #6B7280;
        padding: 12px 24px;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      ">
        Maybe Later
      </button>
    </div>
  `;

  // Add CSS animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes popIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  modal.appendChild(popupContent);

  // Event listeners
  const installBtn = popupContent.querySelector("#install-now-btn");
  const laterBtn = popupContent.querySelector("#maybe-later-btn");

  const closePopup = () => {
    modal.style.animation = "fadeIn 0.2s ease-out reverse";
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 200);
  };

  installBtn?.addEventListener("click", () => {
    if (deferredPrompt) {
      // Use native install prompt
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("[PWA] User accepted the install prompt");
        }
        deferredPrompt = null;
      });
    } else {
      // Show manual install instructions
      closePopup();
      setTimeout(() => showInstallModal(), 300);
    }
    closePopup();
  });

  laterBtn?.addEventListener("click", () => {
    markInstallPromptDismissed();
    closePopup();
  });

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      markInstallPromptDismissed();
      closePopup();
    }
  });

  // Hover effects
  installBtn?.addEventListener("mouseenter", () => {
    (installBtn as HTMLElement).style.background = "#059669";
    (installBtn as HTMLElement).style.transform = "translateY(-1px)";
  });
  installBtn?.addEventListener("mouseleave", () => {
    (installBtn as HTMLElement).style.background = "#10B981";
    (installBtn as HTMLElement).style.transform = "translateY(0)";
  });

  laterBtn?.addEventListener("mouseenter", () => {
    (laterBtn as HTMLElement).style.background = "#F9FAFB";
    (laterBtn as HTMLElement).style.borderColor = "#D1D5DB";
  });
  laterBtn?.addEventListener("mouseleave", () => {
    (laterBtn as HTMLElement).style.background = "transparent";
    (laterBtn as HTMLElement).style.borderColor = "#E5E7EB";
  });

  document.body.appendChild(modal);
}

// Show update notification
function showUpdateAvailableNotification(): void {
  // Create update notification
  const notification = document.createElement("div");
  notification.id = "pwa-update-notification";
  notification.innerHTML = `
    <div class="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between max-w-sm">
      <div class="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23,4 23,10 17,10"/>
          <polyline points="1,20 1,14 7,14"/>
          <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"/>
        </svg>
        <span class="text-sm font-medium">Update available!</span>
      </div>
      <button onclick="window.location.reload()" class="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-xs font-medium">
        Update
      </button>
    </div>
  `;

  notification.className = "fixed top-4 right-4 z-50";
  document.body.appendChild(notification);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 10000);
}

// Network status monitoring
export function setupNetworkMonitoring(): void {
  function updateNetworkStatus(): void {
    const isOnline = navigator.onLine;
    const statusElement = document.getElementById("network-status");

    if (!isOnline && !statusElement) {
      // Show offline indicator
      const offlineIndicator = document.createElement("div");
      offlineIndicator.id = "network-status";
      offlineIndicator.innerHTML = `
        <div class="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium">
          <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636L5.636 18.364M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          </svg>
          You're offline - Some features may be limited
        </div>
      `;
      offlineIndicator.className = "fixed top-0 left-0 right-0 z-40";
      document.body.appendChild(offlineIndicator);
    } else if (isOnline && statusElement) {
      // Remove offline indicator
      statusElement.remove();
    }
  }

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  // Initial check
  updateNetworkStatus();
}

// Initialize PWA features
export function initializePWA(): void {
  console.log("[PWA] Initializing PWA features...");

  // VitePWA handles service worker registration automatically
  // Just setup our custom features
  setupInstallPrompt();
  setupNetworkMonitoring();

  console.log("[PWA] PWA features initialized");
}
