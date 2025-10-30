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
