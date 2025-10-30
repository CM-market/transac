/**
 * PWA utilities for service worker registration and install prompts
 */

// Type definitions
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
  }
}

// Service Worker Registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      console.log('[PWA] Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('[PWA] Service worker registered successfully:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('[PWA] New service worker found, installing...');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker installed, prompting for reload');
              showUpdateAvailableNotification();
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
      return null;
    }
  } else {
    console.log('[PWA] Service workers are not supported');
    return null;
  }
}

// Install Prompt Management
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Listen for install prompt
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    console.log('[PWA] Install prompt triggered');
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Show custom install button
    showInstallButton();
  });

  // Also check if we can show install prompt immediately
  setTimeout(() => {
    if (!deferredPrompt && !isAppInstalled()) {
      console.log('[PWA] No install prompt available, but app not installed');
      // Show a fallback install instruction
      showInstallInstructions();
    }
  }, 1000);

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed successfully');
    deferredPrompt = null;
    hideInstallButton();
    
    // Track installation (if analytics is available)
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'App Installed'
      });
    }
  });
}

// Show install button
function showInstallButton(): void {
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'block';
  } else {
    // Create install button if it doesn't exist
    createInstallButton();
  }
}

// Hide install button
function hideInstallButton(): void {
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'none';
  }
}

// Show install instructions when prompt is not available
function showInstallInstructions(): void {
  const existingButton = document.getElementById('pwa-install-button');
  if (existingButton) return;

  console.log('[PWA] Creating fallback install button');

  const button = document.createElement('button');
  button.id = 'pwa-install-button';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Install App
  `;
  
  // Use inline styles to ensure visibility
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: #10B981;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    font-size: 14px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.background = '#059669';
    button.style.transform = 'translateY(-2px)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = '#10B981';
    button.style.transform = 'translateY(0)';
  });
  
  button.addEventListener('click', () => {
    console.log('[PWA] Install button clicked');
    showInstallModal();
  });
  
  document.body.appendChild(button);
  console.log('[PWA] Install button added to page');
}

// Show install instructions modal
function showInstallModal(): void {
  const modal = document.createElement('div');
  modal.id = 'pwa-install-modal';
  
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
  
  const modalContent = document.createElement('div');
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
      <p style="margin: 8px 0; font-size: 14px; color: #4B5563;"><strong>Chrome/Edge:</strong> Click the menu (⋮) → "Install Transac" or "Add to Home screen"</p>
      <p style="margin: 8px 0; font-size: 14px; color: #4B5563;"><strong>Safari:</strong> Tap Share button → "Add to Home Screen"</p>
      <p style="margin: 8px 0; font-size: 14px; color: #4B5563;"><strong>Firefox:</strong> Tap menu → "Install" or "Add to Home screen"</p>
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
  const closeBtn = modalContent.querySelector('#close-modal');
  const gotItBtn = modalContent.querySelector('#got-it-btn');
  
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeBtn?.addEventListener('click', closeModal);
  gotItBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Add hover effect to got it button
  gotItBtn?.addEventListener('mouseenter', () => {
    (gotItBtn as HTMLElement).style.background = '#059669';
  });
  gotItBtn?.addEventListener('mouseleave', () => {
    (gotItBtn as HTMLElement).style.background = '#10B981';
  });
  
  document.body.appendChild(modal);
}

// Create install button
function createInstallButton(): void {
  const button = document.createElement('button');
  button.id = 'pwa-install-button';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Install App
  `;
  
  button.className = `
    fixed bottom-4 right-4 z-50 bg-emerald-600 hover:bg-emerald-700 
    text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2
    transition-all duration-300 transform hover:scale-105
    font-medium text-sm border-0 cursor-pointer
  `;
  
  button.addEventListener('click', handleInstallClick);
  document.body.appendChild(button);
}

// Handle install button click
export async function handleInstallClick(): Promise<void> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return;
  }

  try {
    console.log('[PWA] Showing install prompt');
    await deferredPrompt.prompt();
    
    const choiceResult = await deferredPrompt.userChoice;
    console.log('[PWA] User choice:', choiceResult.outcome);
    
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }
    
    deferredPrompt = null;
    hideInstallButton();
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as { standalone?: boolean }).standalone === true ||
         document.referrer.includes('android-app://');
}

// Show update notification
function showUpdateAvailableNotification(): void {
  // Create update notification
  const notification = document.createElement('div');
  notification.id = 'pwa-update-notification';
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
  
  notification.className = 'fixed top-4 right-4 z-50';
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
    const statusElement = document.getElementById('network-status');
    
    if (!isOnline && !statusElement) {
      // Show offline indicator
      const offlineIndicator = document.createElement('div');
      offlineIndicator.id = 'network-status';
      offlineIndicator.innerHTML = `
        <div class="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium">
          <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636L5.636 18.364M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          </svg>
          You're offline - Some features may be limited
        </div>
      `;
      offlineIndicator.className = 'fixed top-0 left-0 right-0 z-40';
      document.body.appendChild(offlineIndicator);
    } else if (isOnline && statusElement) {
      // Remove offline indicator
      statusElement.remove();
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  // Initial check
  updateNetworkStatus();
}

// Initialize PWA features
export function initializePWA(): void {
  console.log('[PWA] Initializing PWA features...');
  
  // Register service worker
  registerServiceWorker();
  
  // Setup install prompt (only if not already installed)
  if (!isAppInstalled()) {
    setupInstallPrompt();
  }
  
  // Setup network monitoring
  setupNetworkMonitoring();
  
  console.log('[PWA] PWA features initialized');
}
