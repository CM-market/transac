import React, { useState, useEffect } from 'react';
import { isAppInstalled } from '../utils/pwa';

// This component is deprecated - we now use the popup approach in pwa.ts
// Keeping only the PWAStatusIndicator for backward compatibility

// PWA Status Indicator Component
export const PWAStatusIndicator: React.FC = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    setIsInstalled(isAppInstalled());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInstalled) return null;

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
        isOnline 
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </div>
    </div>
  );
};
