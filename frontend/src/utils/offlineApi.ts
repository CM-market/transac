/**
 * Offline-aware API client for Transac
 * Implements cache-first strategy with intelligent fallbacks
 */

import { offlineManager, CACHE_CONFIGS } from './offline';

export interface ApiResponse<T = any> {
  data: T;
  fromCache: boolean;
  lastUpdated: number;
  error?: string;
}

export interface CacheStrategy {
  cacheFirst: boolean;
  networkFirst: boolean;
  cacheOnly: boolean;
  networkOnly: boolean;
  staleWhileRevalidate: boolean;
}

class OfflineApiClient {
  private baseUrl: string;
  private defaultStrategy: CacheStrategy = {
    cacheFirst: true,
    networkFirst: false,
    cacheOnly: false,
    networkOnly: false,
    staleWhileRevalidate: false
  };

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // Main API method with offline support
  public async request<T = any>(
    endpoint: string, 
    options: RequestInit = {},
    strategy: Partial<CacheStrategy> = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const finalStrategy = { ...this.defaultStrategy, ...strategy };
    const isOnline = offlineManager.getNetworkStatus();

    // Determine cache type based on endpoint
    const cacheType = this.getCacheType(endpoint);

    try {
      // Cache-only strategy (offline mode)
      if (finalStrategy.cacheOnly || !isOnline) {
        return await this.getCachedData<T>(url, cacheType);
      }

      // Network-only strategy
      if (finalStrategy.networkOnly) {
        return await this.getNetworkData<T>(url, options, cacheType);
      }

      // Cache-first strategy
      if (finalStrategy.cacheFirst) {
        try {
          const cachedData = await this.getCachedData<T>(url, cacheType);
          if (cachedData.data) {
            // Return cached data immediately, optionally fetch fresh data in background
            if (finalStrategy.staleWhileRevalidate && isOnline) {
              this.getNetworkData<T>(url, options, cacheType).catch(console.error);
            }
            return cachedData;
          }
        } catch (error) {
          console.warn('[OfflineAPI] Cache read failed, falling back to network:', error);
        }

        // Fallback to network if cache miss
        if (isOnline) {
          return await this.getNetworkData<T>(url, options, cacheType);
        } else {
          throw new Error('No cached data available and device is offline');
        }
      }

      // Network-first strategy
      if (finalStrategy.networkFirst && isOnline) {
        try {
          return await this.getNetworkData<T>(url, options, cacheType);
        } catch (error) {
          console.warn('[OfflineAPI] Network request failed, falling back to cache:', error);
          return await this.getCachedData<T>(url, cacheType);
        }
      }

      // Default fallback
      return await this.getCachedData<T>(url, cacheType);

    } catch (error) {
      console.error('[OfflineAPI] Request failed:', error);
      throw error;
    }
  }

  // Get data from network and cache it
  private async getNetworkData<T>(
    url: string, 
    options: RequestInit, 
    cacheType: keyof typeof CACHE_CONFIGS
  ): Promise<ApiResponse<T>> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Network request failed: ${response.status} ${response.statusText}`);
    }

    // Cache the response
    await offlineManager.cacheResponse(url, response.clone(), cacheType);

    const data = await response.json();
    
    // Store structured data in IndexedDB for complex queries
    if (this.shouldStoreInIndexedDB(url)) {
      await this.storeStructuredData(url, data);
    }

    return {
      data,
      fromCache: false,
      lastUpdated: Date.now()
    };
  }

  // Get data from cache
  private async getCachedData<T>(
    url: string, 
    cacheType: keyof typeof CACHE_CONFIGS
  ): Promise<ApiResponse<T>> {
    // Try Cache API first
    const cachedResponse = await offlineManager.getCachedResponse(url, cacheType);
    
    if (cachedResponse) {
      const data = await cachedResponse.json();
      const cachedAt = cachedResponse.headers.get('cached-at');
      
      return {
        data,
        fromCache: true,
        lastUpdated: cachedAt ? parseInt(cachedAt) : 0
      };
    }

    // Fallback to IndexedDB for structured data
    if (this.shouldStoreInIndexedDB(url)) {
      const structuredData = await this.getStructuredData<T>(url);
      if (structuredData) {
        return structuredData;
      }
    }

    throw new Error('No cached data available');
  }

  // Determine cache type based on endpoint
  private getCacheType(endpoint: string): keyof typeof CACHE_CONFIGS {
    if (endpoint.includes('/images/') || endpoint.includes('/uploads/')) {
      return 'IMAGES';
    }
    if (endpoint.includes('/api/')) {
      return 'API';
    }
    if (endpoint.includes('/static/') || endpoint.includes('.js') || endpoint.includes('.css')) {
      return 'STATIC';
    }
    return 'DATA';
  }

  // Check if data should be stored in IndexedDB
  private shouldStoreInIndexedDB(url: string): boolean {
    return url.includes('/products') || 
           url.includes('/stores') || 
           url.includes('/user');
  }

  // Store structured data in IndexedDB
  private async storeStructuredData(url: string, data: any): Promise<void> {
    try {
      if (url.includes('/products')) {
        if (Array.isArray(data.products)) {
          for (const product of data.products) {
            await offlineManager.storeData('products', product);
          }
        } else if (data.id) {
          await offlineManager.storeData('products', data);
        }
      } else if (url.includes('/stores')) {
        if (Array.isArray(data.stores)) {
          for (const store of data.stores) {
            await offlineManager.storeData('stores', store);
          }
        } else if (data.id) {
          await offlineManager.storeData('stores', data);
        }
      } else if (url.includes('/user')) {
        await offlineManager.storeData('userData', { key: 'profile', data, lastUpdated: Date.now() });
      }
    } catch (error) {
      console.error('[OfflineAPI] Failed to store structured data:', error);
    }
  }

  // Get structured data from IndexedDB
  private async getStructuredData<T>(url: string): Promise<ApiResponse<T> | null> {
    try {
      if (url.includes('/products')) {
        const products = await offlineManager.getAllData('products');
        if (products.length > 0) {
          return {
            data: { products } as T,
            fromCache: true,
            lastUpdated: Math.max(...products.map(p => p.lastUpdated || 0))
          };
        }
      } else if (url.includes('/stores')) {
        const stores = await offlineManager.getAllData('stores');
        if (stores.length > 0) {
          return {
            data: { stores } as T,
            fromCache: true,
            lastUpdated: Math.max(...stores.map(s => s.lastUpdated || 0))
          };
        }
      } else if (url.includes('/user')) {
        const userData = await offlineManager.getData('userData', 'profile');
        if (userData) {
          return {
            data: userData.data as T,
            fromCache: true,
            lastUpdated: userData.lastUpdated || 0
          };
        }
      }
    } catch (error) {
      console.error('[OfflineAPI] Failed to get structured data:', error);
    }
    
    return null;
  }

  // Queue action for later sync (for POST/PUT/DELETE operations)
  public async queueAction(
    endpoint: string, 
    method: 'POST' | 'PUT' | 'DELETE', 
    data?: any
  ): Promise<void> {
    const action = method === 'POST' ? 'CREATE' : 
                  method === 'PUT' ? 'UPDATE' : 'DELETE';

    await offlineManager.addToSyncQueue({
      action,
      endpoint: `${this.baseUrl}${endpoint}`,
      data
    });

    console.log(`[OfflineAPI] Queued ${action} action for ${endpoint}`);
  }

  // Convenience methods for common operations
  public async get<T = any>(
    endpoint: string, 
    strategy: Partial<CacheStrategy> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, strategy);
  }

  public async post<T = any>(
    endpoint: string, 
    data: any, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const isOnline = offlineManager.getNetworkStatus();
    
    if (!isOnline) {
      // Queue for later sync
      await this.queueAction(endpoint, 'POST', data);
      return {
        data: { success: true, queued: true } as T,
        fromCache: false,
        lastUpdated: Date.now()
      };
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    }, { networkOnly: true });
  }

  public async put<T = any>(
    endpoint: string, 
    data: any, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const isOnline = offlineManager.getNetworkStatus();
    
    if (!isOnline) {
      // Queue for later sync
      await this.queueAction(endpoint, 'PUT', data);
      return {
        data: { success: true, queued: true } as T,
        fromCache: false,
        lastUpdated: Date.now()
      };
    }

    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    }, { networkOnly: true });
  }

  public async delete<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const isOnline = offlineManager.getNetworkStatus();
    
    if (!isOnline) {
      // Queue for later sync
      await this.queueAction(endpoint, 'DELETE');
      return {
        data: { success: true, queued: true } as T,
        fromCache: false,
        lastUpdated: Date.now()
      };
    }

    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options
    }, { networkOnly: true });
  }

  // Preload critical data for offline use
  public async preloadCriticalData(): Promise<void> {
    const isOnline = offlineManager.getNetworkStatus();
    if (!isOnline) return;

    console.log('[OfflineAPI] Preloading critical data...');

    try {
      // Preload products
      await this.get('/api/v1/products', { staleWhileRevalidate: true });
      
      // Preload stores
      await this.get('/api/v1/stores', { staleWhileRevalidate: true });
      
      // Preload user data if authenticated
      try {
        await this.get('/api/v1/user/profile', { staleWhileRevalidate: true });
      } catch (error) {
        // User might not be authenticated, which is fine
        console.log('[OfflineAPI] User profile not available for preload');
      }

      console.log('[OfflineAPI] Critical data preloaded successfully');
    } catch (error) {
      console.error('[OfflineAPI] Failed to preload critical data:', error);
    }
  }

  // Clear all cached data
  public async clearCache(): Promise<void> {
    try {
      for (const config of Object.values(CACHE_CONFIGS)) {
        const cache = await caches.open(config.name);
        const requests = await cache.keys();
        await Promise.all(requests.map(request => cache.delete(request)));
      }
      console.log('[OfflineAPI] All caches cleared');
    } catch (error) {
      console.error('[OfflineAPI] Failed to clear cache:', error);
    }
  }
}

// Export singleton instance
export const offlineApi = new OfflineApiClient();

// Export convenience functions
export const apiGet = <T = any>(endpoint: string, strategy?: Partial<CacheStrategy>) => 
  offlineApi.get<T>(endpoint, strategy);

export const apiPost = <T = any>(endpoint: string, data: any, options?: RequestInit) => 
  offlineApi.post<T>(endpoint, data, options);

export const apiPut = <T = any>(endpoint: string, data: any, options?: RequestInit) => 
  offlineApi.put<T>(endpoint, data, options);

export const apiDelete = <T = any>(endpoint: string, options?: RequestInit) => 
  offlineApi.delete<T>(endpoint, options);
