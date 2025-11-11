/**
 * React hooks for offline data management
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineApi, ApiResponse } from '../utils/offlineApi';
import { useOfflineStatus } from '../components/OfflineIndicator';

interface UseOfflineDataOptions {
  cacheFirst?: boolean;
  networkFirst?: boolean;
  staleWhileRevalidate?: boolean;
  refetchOnReconnect?: boolean;
  retryOnError?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  lastUpdated: number;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// Hook for fetching data with offline support
export function useOfflineData<T = any>(
  endpoint: string,
  options: UseOfflineDataOptions = {}
): UseOfflineDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  
  const { isOnline } = useOfflineStatus();
  
  const {
    cacheFirst = true,
    networkFirst = false,
    staleWhileRevalidate = false,
    refetchOnReconnect = true,
    retryOnError = true
  } = options;

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const strategy = {
        cacheFirst,
        networkFirst,
        staleWhileRevalidate
      };

      const response: ApiResponse<T> = await offlineApi.get<T>(endpoint, strategy);
      
      setData(response.data);
      setFromCache(response.fromCache);
      setLastUpdated(response.lastUpdated);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      
      if (retryOnError && !isOnline) {
        // Try to get cached data as fallback
        try {
          const cachedResponse = await offlineApi.get<T>(endpoint, { cacheOnly: true });
          setData(cachedResponse.data);
          setFromCache(true);
          setLastUpdated(cachedResponse.lastUpdated);
          setError(null);
        } catch (cacheError) {
          console.error('Failed to get cached data:', cacheError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, cacheFirst, networkFirst, staleWhileRevalidate, retryOnError, isOnline]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && refetchOnReconnect && fromCache) {
      fetchData(false); // Don't show loading spinner for background refresh
    }
  }, [isOnline, refetchOnReconnect, fromCache, fetchData]);

  // Check if data is stale (older than 1 hour)
  const isStale = lastUpdated > 0 && (Date.now() - lastUpdated) > 60 * 60 * 1000;

  return {
    data,
    loading,
    error,
    fromCache,
    lastUpdated,
    refetch: () => fetchData(),
    isStale
  };
}

// Hook for managing offline mutations (POST/PUT/DELETE)
interface UseOfflineMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  invalidateQueries?: string[];
}

interface UseOfflineMutationResult {
  mutate: (data?: any) => Promise<void>;
  loading: boolean;
  error: string | null;
  isQueued: boolean;
}

export function useOfflineMutation(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options: UseOfflineMutationOptions = {}
): UseOfflineMutationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  
  const { isOnline } = useOfflineStatus();
  const { onSuccess, onError, invalidateQueries } = options;

  const mutate = useCallback(async (data?: any) => {
    try {
      setLoading(true);
      setError(null);
      setIsQueued(false);

      let response: ApiResponse<any>;

      if (method === 'POST') {
        response = await offlineApi.post(endpoint, data);
      } else if (method === 'PUT') {
        response = await offlineApi.put(endpoint, data);
      } else {
        response = await offlineApi.delete(endpoint);
      }

      // Check if the action was queued for later sync
      if (response.data?.queued) {
        setIsQueued(true);
      }

      onSuccess?.(response.data);

      // TODO: Implement query invalidation when we add React Query
      if (invalidateQueries) {
        console.log('Would invalidate queries:', invalidateQueries);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mutation failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, onSuccess, onError, invalidateQueries]);

  return {
    mutate,
    loading,
    error,
    isQueued
  };
}

// Hook for preloading critical data
export function useOfflinePreload() {
  const { isOnline } = useOfflineStatus();

  const preloadCriticalData = useCallback(async () => {
    if (!isOnline) return;

    try {
      await offlineApi.preloadCriticalData();
      console.log('Critical data preloaded for offline use');
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    }
  }, [isOnline]);

  // Preload on mount and when coming back online
  useEffect(() => {
    preloadCriticalData();
  }, [preloadCriticalData]);

  return { preloadCriticalData };
}

// Hook for managing offline storage
export function useOfflineStorage() {
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    available: 0,
    percentage: 0
  });

  const updateStorageInfo = useCallback(async () => {
    try {
      // This would use the storage API from offlineManager
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = available > 0 ? (used / available) * 100 : 0;
        
        setStorageInfo({ used, available, percentage });
      }
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await offlineApi.clearCache();
      await updateStorageInfo();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [updateStorageInfo]);

  useEffect(() => {
    updateStorageInfo();
    
    // Update storage info periodically
    const interval = setInterval(updateStorageInfo, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [updateStorageInfo]);

  return {
    storageInfo,
    updateStorageInfo,
    clearCache
  };
}

// Hook for sync status
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState({
    inProgress: false,
    lastSync: Date.now(),
    pendingItems: 0,
    error: null as string | null
  });

  const { isOnline } = useOfflineStatus();

  useEffect(() => {
    // Listen for sync events from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_STATUS') {
        setSyncStatus(prev => ({
          ...prev,
          ...event.data.status
        }));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus.pendingItems > 0) {
      setSyncStatus(prev => ({ ...prev, inProgress: true }));
      
      // Simulate sync completion (in real implementation, this would be handled by offlineManager)
      setTimeout(() => {
        setSyncStatus(prev => ({
          ...prev,
          inProgress: false,
          lastSync: Date.now(),
          pendingItems: 0
        }));
      }, 2000);
    }
  }, [isOnline, syncStatus.pendingItems]);

  return syncStatus;
}
