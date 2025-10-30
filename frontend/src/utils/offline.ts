/**
 * Offline functionality utilities for Transac PWA
 * Implements offline-first architecture with intelligent caching
 */

// Types for offline functionality
export interface CacheConfig {
  name: string;
  version: string;
  maxAge: number; // in milliseconds
  maxEntries: number;
}

export interface SyncQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface OfflineData {
  products: any[];
  stores: any[];
  userPreferences: any;
  lastSync: number;
  version: string;
}

// Cache configurations
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  STATIC: {
    name: 'transac-static-v1',
    version: '1.0.0',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 100
  },
  API: {
    name: 'transac-api-v1',
    version: '1.0.0',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 500
  },
  IMAGES: {
    name: 'transac-images-v1',
    version: '1.0.0',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 1000
  },
  DATA: {
    name: 'transac-data-v1',
    version: '1.0.0',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    maxEntries: 200
  }
};

// IndexedDB database configuration
const DB_NAME = 'TransacOfflineDB';
const DB_VERSION = 1;
const STORES = {
  PRODUCTS: 'products',
  STORES: 'stores',
  USER_DATA: 'userData',
  SYNC_QUEUE: 'syncQueue',
  CACHE_METADATA: 'cacheMetadata'
};

class OfflineManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.initializeDB();
    this.setupNetworkListeners();
  }

  // Initialize IndexedDB
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Offline] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Offline] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productsStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productsStore.createIndex('store_id', 'store_id', { unique: false });
          productsStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.STORES)) {
          db.createObjectStore(STORES.STORES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
          db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
        }

        console.log('[Offline] IndexedDB schema created');
      };
    });
  }

  // Setup network status listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[Offline] Connection restored');
      this.notifyListeners(true);
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[Offline] Connection lost');
      this.notifyListeners(false);
    });
  }

  // Add network status listener
  public addNetworkListener(callback: (isOnline: boolean) => void): void {
    this.listeners.add(callback);
  }

  // Remove network status listener
  public removeNetworkListener(callback: (isOnline: boolean) => void): void {
    this.listeners.delete(callback);
  }

  // Notify all listeners of network status change
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => callback(isOnline));
  }

  // Get current network status
  public getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Store data in IndexedDB
  public async storeData(storeName: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get data from IndexedDB
  public async getData(storeName: string, key: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all data from a store
  public async getAllData(storeName: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache API response
  public async cacheResponse(url: string, response: Response, cacheType: keyof typeof CACHE_CONFIGS): Promise<void> {
    try {
      const cache = await caches.open(CACHE_CONFIGS[cacheType].name);
      const responseClone = response.clone();
      
      // Add timestamp header for cache management
      const headers = new Headers(responseClone.headers);
      headers.set('cached-at', Date.now().toString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });

      await cache.put(url, modifiedResponse);
      console.log(`[Offline] Cached response for ${url}`);
    } catch (error) {
      console.error('[Offline] Failed to cache response:', error);
    }
  }

  // Get cached response
  public async getCachedResponse(url: string, cacheType: keyof typeof CACHE_CONFIGS): Promise<Response | null> {
    try {
      const cache = await caches.open(CACHE_CONFIGS[cacheType].name);
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        const cachedAt = cachedResponse.headers.get('cached-at');
        if (cachedAt) {
          const age = Date.now() - parseInt(cachedAt);
          const maxAge = CACHE_CONFIGS[cacheType].maxAge;
          
          if (age > maxAge) {
            // Cache expired, remove it
            await cache.delete(url);
            return null;
          }
        }
        
        console.log(`[Offline] Serving cached response for ${url}`);
        return cachedResponse;
      }
    } catch (error) {
      console.error('[Offline] Failed to get cached response:', error);
    }
    
    return null;
  }

  // Add item to sync queue
  public async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    await this.storeData(STORES.SYNC_QUEUE, syncItem);
    console.log('[Offline] Added item to sync queue:', syncItem.id);
  }

  // Process sync queue when online
  public async syncWhenOnline(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    console.log('[Offline] Starting sync process...');

    try {
      const syncItems = await this.getAllData(STORES.SYNC_QUEUE);
      
      for (const item of syncItems) {
        try {
          await this.processSyncItem(item);
          // Remove successful item from queue
          await this.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('[Offline] Sync item failed:', item.id, error);
          // Increment retry count
          item.retryCount++;
          if (item.retryCount < 3) {
            await this.storeData(STORES.SYNC_QUEUE, item);
          } else {
            // Remove after 3 failed attempts
            await this.removeFromSyncQueue(item.id);
            console.error('[Offline] Sync item removed after 3 failures:', item.id);
          }
        }
      }
      
      console.log('[Offline] Sync process completed');
    } catch (error) {
      console.error('[Offline] Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process individual sync item
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const options: RequestInit = {
      method: item.action === 'DELETE' ? 'DELETE' : 
              item.action === 'CREATE' ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: item.data ? JSON.stringify(item.data) : undefined
    };

    const response = await fetch(item.endpoint, options);
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
    
    console.log(`[Offline] Synced ${item.action} to ${item.endpoint}`);
  }

  // Remove item from sync queue
  private async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clean up expired cache entries
  public async cleanupExpiredCache(): Promise<void> {
    for (const [cacheType, config] of Object.entries(CACHE_CONFIGS)) {
      try {
        const cache = await caches.open(config.name);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const cachedAt = response.headers.get('cached-at');
            if (cachedAt) {
              const age = Date.now() - parseInt(cachedAt);
              if (age > config.maxAge) {
                await cache.delete(request);
                console.log(`[Offline] Cleaned up expired cache entry: ${request.url}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Offline] Failed to cleanup cache ${config.name}:`, error);
      }
    }
  }

  // Get storage usage information
  public async getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = available > 0 ? (used / available) * 100 : 0;
        
        return { used, available, percentage };
      }
    } catch (error) {
      console.error('[Offline] Failed to get storage info:', error);
    }
    
    return { used: 0, available: 0, percentage: 0 };
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Utility functions
export const isOnline = () => offlineManager.getNetworkStatus();
export const addNetworkListener = (callback: (isOnline: boolean) => void) => 
  offlineManager.addNetworkListener(callback);
export const removeNetworkListener = (callback: (isOnline: boolean) => void) => 
  offlineManager.removeNetworkListener(callback);
