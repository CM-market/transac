import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { addNetworkListener, removeNetworkListener, isOnline } from '../utils/offline';
import { offlineApi } from '../utils/offlineApi';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

interface SyncStatus {
  inProgress: boolean;
  lastSync: number;
  pendingItems: number;
  error?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    inProgress: false,
    lastSync: Date.now(),
    pendingItems: 0
  });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const handleNetworkChange = (isOnline: boolean) => {
      setOnline(isOnline);
      
      if (isOnline) {
        // Start sync when coming back online
        setSyncStatus(prev => ({ ...prev, inProgress: true }));
        
        // Simulate sync process (in real implementation, this would be handled by offlineManager)
        setTimeout(() => {
          setSyncStatus(prev => ({ 
            ...prev, 
            inProgress: false, 
            lastSync: Date.now(),
            pendingItems: 0
          }));
        }, 2000);
      }
    };

    addNetworkListener(handleNetworkChange);
    
    return () => {
      removeNetworkListener(handleNetworkChange);
    };
  }, []);

  const getStatusIcon = () => {
    if (syncStatus.inProgress) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (!online) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (syncStatus.error) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (syncStatus.inProgress) return 'Syncing...';
    if (!online) return 'Offline';
    if (syncStatus.error) return 'Sync Error';
    return 'Online';
  };

  const getStatusColor = () => {
    if (syncStatus.inProgress) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (!online) return 'bg-red-100 text-red-800 border-red-200';
    if (syncStatus.error) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const formatLastSync = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!showDetails) {
    // Simple indicator for header/toolbar
    return (
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center">
          {getStatusIcon()}
        </div>
        
        {showTooltip && (
          <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
            {!online && (
              <div className="text-xs text-gray-300 mt-1">
                Using cached data
              </div>
            )}
            <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        )}
      </div>
    );
  }

  // Detailed status card
  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Connection Status</h3>
        {getStatusIcon()}
      </div>
      
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
        {getStatusText()}
      </div>
      
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        {online ? (
          <>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Last sync: {formatLastSync(syncStatus.lastSync)}</span>
            </div>
            {syncStatus.pendingItems > 0 && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3 h-3" />
                <span>{syncStatus.pendingItems} items pending sync</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <CloudOff className="w-3 h-3" />
              <span>Working offline with cached data</span>
            </div>
            <div className="text-xs text-gray-500">
              Changes will sync when connection is restored
            </div>
          </>
        )}
      </div>
      
      {syncStatus.error && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Sync Error: {syncStatus.error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for mobile
export const CompactOfflineIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const handleNetworkChange = (isOnline: boolean) => {
      setOnline(isOnline);
    };

    addNetworkListener(handleNetworkChange);
    
    return () => {
      removeNetworkListener(handleNetworkChange);
    };
  }, []);

  if (online) return null; // Only show when offline

  return (
    <div className={`fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 text-sm text-center z-50 ${className}`}>
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>You're offline. Using cached data.</span>
      </div>
    </div>
  );
};

// Hook for using offline status in components
export const useOfflineStatus = () => {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const handleNetworkChange = (isOnline: boolean) => {
      setOnline(isOnline);
    };

    addNetworkListener(handleNetworkChange);
    
    return () => {
      removeNetworkListener(handleNetworkChange);
    };
  }, []);

  return {
    isOnline: online,
    isOffline: !online
  };
};
