import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  Trash2, 
  RefreshCw, 
  Download,
  Upload,
  HardDrive,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useOfflineStatus } from './OfflineIndicator';
import { useOfflineStorage } from '../hooks/useOfflineData';
import { offlineApi } from '../utils/offlineApi';

interface OfflineTestPanelProps {
  className?: string;
}

export const OfflineTestPanel: React.FC<OfflineTestPanelProps> = ({ className = '' }) => {
  const { isOnline, isOffline } = useOfflineStatus();
  const { storageInfo, clearCache } = useOfflineStorage();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const runOfflineTests = async () => {
    setTesting(true);
    const results: Record<string, boolean> = {};

    try {
      // Test 1: Cache API availability
      results.cacheApi = 'caches' in window;

      // Test 2: IndexedDB availability
      results.indexedDB = 'indexedDB' in window;

      // Test 3: Service Worker availability
      results.serviceWorker = 'serviceWorker' in navigator;

      // Test 4: Storage API availability
      results.storageApi = 'storage' in navigator && 'estimate' in navigator.storage;

      // Test 5: Test offline API call (should use cache)
      try {
        const response = await offlineApi.get('/api/v1/stores', { cacheFirst: true });
        results.offlineApiCall = !!response.data;
      } catch (error) {
        results.offlineApiCall = false;
      }

      // Test 6: Test cache storage
      try {
        const cache = await caches.open('test-cache');
        await cache.put('/test', new Response('test'));
        const cached = await cache.match('/test');
        results.cacheStorage = !!cached;
        await cache.delete('/test');
      } catch (error) {
        results.cacheStorage = false;
      }

      // Test 7: Test IndexedDB storage
      try {
        const request = indexedDB.open('test-db', 1);
        results.indexedDBStorage = await new Promise((resolve) => {
          request.onsuccess = () => {
            request.result.close();
            indexedDB.deleteDatabase('test-db');
            resolve(true);
          };
          request.onerror = () => resolve(false);
        });
      } catch (error) {
        results.indexedDBStorage = false;
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const testOfflineMode = () => {
    if (isOnline) {
      alert('To test offline mode:\n1. Open DevTools (F12)\n2. Go to Network tab\n3. Check "Offline" checkbox\n4. Refresh the page');
    } else {
      alert('You are currently offline! Try browsing the app to see cached data.');
    }
  };

  const preloadData = async () => {
    try {
      await offlineApi.preloadCriticalData();
      alert('Critical data preloaded for offline use!');
    } catch (error) {
      alert('Failed to preload data: ' + error);
    }
  };

  const TestResult: React.FC<{ name: string; result: boolean | undefined; description: string }> = ({ 
    name, 
    result, 
    description 
  }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
      <div className="ml-3">
        {result === undefined ? (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
        ) : result ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Offline Functionality Test Panel</h3>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Storage Information */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          Storage Usage
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used:</span>
            <span>{formatBytes(storageInfo.used)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Available:</span>
            <span>{formatBytes(storageInfo.available)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-600 text-center">
            {storageInfo.percentage.toFixed(1)}% used
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Compatibility Tests
        </h4>
        <div className="space-y-2">
          <TestResult 
            name="Cache API" 
            result={testResults.cacheApi}
            description="Browser support for Cache API"
          />
          <TestResult 
            name="IndexedDB" 
            result={testResults.indexedDB}
            description="Browser support for IndexedDB"
          />
          <TestResult 
            name="Service Worker" 
            result={testResults.serviceWorker}
            description="Browser support for Service Workers"
          />
          <TestResult 
            name="Storage API" 
            result={testResults.storageApi}
            description="Browser support for Storage API"
          />
          <TestResult 
            name="Offline API Call" 
            result={testResults.offlineApiCall}
            description="Ability to make API calls with cache fallback"
          />
          <TestResult 
            name="Cache Storage" 
            result={testResults.cacheStorage}
            description="Ability to store and retrieve from cache"
          />
          <TestResult 
            name="IndexedDB Storage" 
            result={testResults.indexedDBStorage}
            description="Ability to store and retrieve from IndexedDB"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={runOfflineTests}
          disabled={testing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
          {testing ? 'Testing...' : 'Run Tests'}
        </button>

        <button
          onClick={testOfflineMode}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <WifiOff className="w-4 h-4" />
          Test Offline
        </button>

        <button
          onClick={preloadData}
          disabled={isOffline}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Preload Data
        </button>

        <button
          onClick={clearCache}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
          Clear Cache
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Testing Instructions:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Run compatibility tests to verify browser support</li>
          <li>• Preload data while online for offline testing</li>
          <li>• Use browser DevTools to simulate offline mode</li>
          <li>• Navigate the app to test cached functionality</li>
          <li>• Clear cache to reset offline storage</li>
        </ul>
      </div>
    </div>
  );
};
