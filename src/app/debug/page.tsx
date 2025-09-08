'use client';
import { useState } from 'react';
import { fetchWithTimeout } from '@/lib/http';

const ADMIN_TOKEN = 'Cooper'; // Owner-only token

export default function DebugPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(testName);
    try {
      const result = await testFn();
      setResults((prev: any) => ({ ...prev, [testName]: { success: true, data: result } }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, [testName]: { success: false, error: error.message } }));
    } finally {
      setLoading(null);
    }
  };

  const tests = {
    'Health Check': async () => {
      const response = await fetchWithTimeout('/api/health', {}, 5000);
      return await response.json();
    },
    
    'Airtable Connection': async () => {
      const response = await fetchWithTimeout('/api/diagnostics/airtable', {}, 8000);
      return await response.json();
    },
    
    'Server Latency': async () => {
      const response = await fetchWithTimeout('/api/diagnostics/latency', {}, 5000);
      return await response.json();
    },
    
    'Rigs List': async () => {
      const response = await fetchWithTimeout('/api/rigs/list', {}, 10000);
      return await response.json();
    },
    
    'Create Equipment Test': async () => {
      const response = await fetchWithTimeout('/api/equipment/instances/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          name: `Debug Test ${Date.now()}`, 
          rigName: 'Demo Rig Alpha' 
        })
      }, 12000);
      return await response.json();
    },
    
    'Create Session Test': async () => {
      const response = await fetchWithTimeout('/api/sessions/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          problem: `Debug test session ${Date.now()}` 
        })
      }, 15000);
      return await response.json();
    },
    
    'Seed v2 Pack': async () => {
      const response = await fetchWithTimeout('/api/dev/seed/v2-pack-plus', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      }, 10000);
      return await response.json();
    }
  };

  const runAllTests = async () => {
    for (const [name, testFn] of Object.entries(tests)) {
      await runTest(name, testFn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const clearResults = () => setResults({});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Debug Panel</h1>
        <p className="text-sm text-gray-600">
          Owner-only diagnostics for production troubleshooting. Tests include timeouts and error handling.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={runAllTests}
          disabled={loading !== null}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === null ? 'Run All Tests' : `Running ${loading}...`}
        </button>
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(tests).map(([name, testFn]) => (
          <button
            key={name}
            onClick={() => runTest(name, testFn)}
            disabled={loading !== null}
            className={`p-3 text-left rounded border ${
              loading === name 
                ? 'bg-yellow-100 border-yellow-300' 
                : results[name]?.success 
                  ? 'bg-green-100 border-green-300' 
                  : results[name]?.success === false 
                    ? 'bg-red-100 border-red-300' 
                    : 'bg-gray-100 border-gray-300'
            }`}
          >
            <div className="font-medium">{name}</div>
            <div className="text-sm text-gray-600">
              {loading === name ? 'Running...' : 
               results[name]?.success ? '✅ Success' : 
               results[name]?.success === false ? '❌ Failed' : 
               'Click to test'}
            </div>
          </button>
        ))}
      </div>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          {Object.entries(results).map(([name, result]: [string, any]) => (
            <div key={name} className="border rounded p-4">
              <h3 className="font-medium mb-2">{name}</h3>
              <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
