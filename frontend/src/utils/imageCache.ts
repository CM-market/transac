/**
 * Image caching utilities for offline functionality
 * Handles intelligent image caching with compression and optimization
 */

import React from 'react';
import { offlineManager, CACHE_CONFIGS } from './offline';

interface ImageCacheOptions {
  quality?: number; // 0-1, for compression
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
  priority?: 'high' | 'medium' | 'low';
}

interface CachedImage {
  url: string;
  blob: Blob;
  size: number;
  cachedAt: number;
  metadata: {
    width: number;
    height: number;
    format: string;
    originalSize: number;
    compressedSize: number;
  };
}

class ImageCacheManager {
  private readonly CACHE_NAME = CACHE_CONFIGS.IMAGES.name;
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly COMPRESSION_QUALITY = 0.8;
  private readonly MAX_IMAGE_SIZE = 1920; // Max width/height for compression

  // Cache image with optional optimization
  public async cacheImage(url: string, options: ImageCacheOptions = {}): Promise<boolean> {
    try {
      console.log(`[ImageCache] Caching image: ${url}`);
      
      // Check if already cached and not expired
      const cached = await this.getCachedImage(url);
      if (cached && !this.isExpired(cached.cachedAt)) {
        console.log(`[ImageCache] Image already cached: ${url}`);
        return true;
      }

      // Fetch the image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Optimize image if needed
      const optimizedBlob = await this.optimizeImage(blob, options);
      
      // Store in cache
      await this.storeImage(url, optimizedBlob, blob.size);
      
      console.log(`[ImageCache] Image cached successfully: ${url}`);
      return true;
    } catch (error) {
      console.error(`[ImageCache] Failed to cache image ${url}:`, error);
      return false;
    }
  }

  // Get cached image or fetch if not available
  public async getImage(url: string, fallbackToNetwork = true): Promise<string | null> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedImage(url);
      if (cached && !this.isExpired(cached.cachedAt)) {
        return URL.createObjectURL(cached.blob);
      }

      // If not in cache and network is available, try to fetch and cache
      if (fallbackToNetwork && navigator.onLine) {
        const success = await this.cacheImage(url);
        if (success) {
          const newCached = await this.getCachedImage(url);
          if (newCached) {
            return URL.createObjectURL(newCached.blob);
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`[ImageCache] Failed to get image ${url}:`, error);
      return null;
    }
  }

  // Preload images for offline use
  public async preloadImages(urls: string[], options: ImageCacheOptions = {}): Promise<void> {
    console.log(`[ImageCache] Preloading ${urls.length} images...`);
    
    const promises = urls.map(url => this.cacheImage(url, options));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`[ImageCache] Preloaded ${successful}/${urls.length} images`);
  }

  // Get cached image data
  private async getCachedImage(url: string): Promise<CachedImage | null> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(url);
      
      if (response) {
        const blob = await response.blob();
        const cachedAt = parseInt(response.headers.get('cached-at') || '0');
        const metadata = JSON.parse(response.headers.get('image-metadata') || '{}');
        
        return {
          url,
          blob,
          size: blob.size,
          cachedAt,
          metadata
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[ImageCache] Failed to get cached image ${url}:`, error);
      return null;
    }
  }

  // Store image in cache
  private async storeImage(url: string, blob: Blob, originalSize: number): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      
      // Get image dimensions
      const dimensions = await this.getImageDimensions(blob);
      
      // Create metadata
      const metadata = {
        width: dimensions.width,
        height: dimensions.height,
        format: blob.type,
        originalSize,
        compressedSize: blob.size
      };

      // Create response with metadata headers
      const headers = new Headers({
        'Content-Type': blob.type,
        'cached-at': Date.now().toString(),
        'image-metadata': JSON.stringify(metadata)
      });

      const response = new Response(blob, { headers });
      await cache.put(url, response);
      
      // Check cache size and cleanup if needed
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error(`[ImageCache] Failed to store image ${url}:`, error);
    }
  }

  // Optimize image (compress, resize)
  private async optimizeImage(blob: Blob, options: ImageCacheOptions): Promise<Blob> {
    try {
      // Skip optimization for small images or if not supported
      if (blob.size < 50 * 1024 || !this.supportsImageOptimization()) {
        return blob;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return blob;

      const img = new Image();
      const imageUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve) => {
        img.onload = () => {
          URL.revokeObjectURL(imageUrl);
          
          // Calculate new dimensions
          const { width, height } = this.calculateOptimalSize(
            img.width, 
            img.height, 
            options.maxWidth || this.MAX_IMAGE_SIZE,
            options.maxHeight || this.MAX_IMAGE_SIZE
          );
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (optimizedBlob) => {
              resolve(optimizedBlob || blob);
            },
            options.format || 'image/jpeg',
            options.quality || this.COMPRESSION_QUALITY
          );
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          resolve(blob);
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('[ImageCache] Image optimization failed:', error);
      return blob;
    }
  }

  // Get image dimensions
  private async getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      
      img.src = url;
    });
  }

  // Calculate optimal size for compression
  private calculateOptimalSize(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth > originalHeight) {
      const width = Math.min(maxWidth, originalWidth);
      const height = width / aspectRatio;
      return { width, height };
    } else {
      const height = Math.min(maxHeight, originalHeight);
      const width = height * aspectRatio;
      return { width, height };
    }
  }

  // Check if browser supports image optimization
  private supportsImageOptimization(): boolean {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d') && canvas.toBlob);
  }

  // Check if cached image is expired
  private isExpired(cachedAt: number): boolean {
    const maxAge = CACHE_CONFIGS.IMAGES.maxAge;
    return Date.now() - cachedAt > maxAge;
  }

  // Cleanup cache if it exceeds size limit
  private async cleanupIfNeeded(): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const requests = await cache.keys();
      
      // Get all cached images with metadata
      const cachedImages: Array<{ request: Request; size: number; cachedAt: number }> = [];
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const size = parseInt(response.headers.get('content-length') || '0');
          const cachedAt = parseInt(response.headers.get('cached-at') || '0');
          cachedImages.push({ request, size, cachedAt });
        }
      }
      
      // Calculate total size
      const totalSize = cachedImages.reduce((sum, img) => sum + img.size, 0);
      
      if (totalSize > this.MAX_CACHE_SIZE) {
        console.log(`[ImageCache] Cache size (${totalSize}) exceeds limit, cleaning up...`);
        
        // Sort by age (oldest first) and remove until under limit
        cachedImages.sort((a, b) => a.cachedAt - b.cachedAt);
        
        let currentSize = totalSize;
        for (const img of cachedImages) {
          if (currentSize <= this.MAX_CACHE_SIZE * 0.8) break; // Leave 20% buffer
          
          await cache.delete(img.request);
          currentSize -= img.size;
          console.log(`[ImageCache] Removed cached image: ${img.request.url}`);
        }
      }
    } catch (error) {
      console.error('[ImageCache] Cache cleanup failed:', error);
    }
  }

  // Clear all cached images
  public async clearCache(): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const requests = await cache.keys();
      
      for (const request of requests) {
        await cache.delete(request);
      }
      
      console.log('[ImageCache] All cached images cleared');
    } catch (error) {
      console.error('[ImageCache] Failed to clear image cache:', error);
    }
  }

  // Get cache statistics
  public async getCacheStats(): Promise<{
    totalImages: number;
    totalSize: number;
    oldestImage: number;
    newestImage: number;
  }> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const requests = await cache.keys();
      
      let totalSize = 0;
      let oldestImage = Date.now();
      let newestImage = 0;
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const size = parseInt(response.headers.get('content-length') || '0');
          const cachedAt = parseInt(response.headers.get('cached-at') || '0');
          
          totalSize += size;
          oldestImage = Math.min(oldestImage, cachedAt);
          newestImage = Math.max(newestImage, cachedAt);
        }
      }
      
      return {
        totalImages: requests.length,
        totalSize,
        oldestImage: requests.length > 0 ? oldestImage : 0,
        newestImage: requests.length > 0 ? newestImage : 0
      };
    } catch (error) {
      console.error('[ImageCache] Failed to get cache stats:', error);
      return { totalImages: 0, totalSize: 0, oldestImage: 0, newestImage: 0 };
    }
  }
}

// Export singleton instance
export const imageCache = new ImageCacheManager();

// React hook for image caching
export const useImageCache = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cacheImage = async (url: string, options?: ImageCacheOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await imageCache.cacheImage(url, options);
      if (!success) {
        throw new Error('Failed to cache image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getImage = async (url: string) => {
    setLoading(true);
    setError(null);
    
    try {
      return await imageCache.getImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    cacheImage,
    getImage,
    loading,
    error
  };
};

// Utility function to preload product images
export const preloadProductImages = async (products: any[]): Promise<void> => {
  const imageUrls: string[] = [];
  
  products.forEach(product => {
    if (product.image_url) {
      imageUrls.push(product.image_url);
    }
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: any) => {
        if (img.url) imageUrls.push(img.url);
      });
    }
  });
  
  if (imageUrls.length > 0) {
    await imageCache.preloadImages(imageUrls, {
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
      priority: 'medium'
    });
  }
};
