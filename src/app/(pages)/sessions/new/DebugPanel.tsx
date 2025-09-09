'use client';
import { useState } from 'react';

export default function DebugPanel() {
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
    'Ping': async () => {
      const response = await fetch('/api/_diag/ping');
      return await response.json();
    },
    'Airtable quick check': async () => {
      const response = await fetch('/api/_diag/airtable');
      return await response.json();
    },
    'Health': async () => {
      const response = await fetch('/api/health');
      return await response.json();
    }
  };

  return (
    <div className="border rounded p-3 bg-gray-50 mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Debug Panel</span>
        <span className="text-xs text-gray-500">Owner only</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {Object.entries(tests).map(([name, testFn]) => (
          <button
            key={name}
            onClick={() => runTest(name, testFn)}
            disabled={loading !== null}
            className={`text-xs px-2 py-1 rounded ${
              loading === name 
                ? 'bg-yellow-200' 
                : results[name]?.success 
                  ? 'bg-green-200' 
                  : results[name]?.success === false 
                    ? 'bg-red-200' 
                    : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {loading === name ? '...' : 
             results[name]?.success ? '✓' : 
             results[name]?.success === false ? '✗' : 
             name}
          </button>
        ))}
      </div>

      {Object.keys(results).length > 0 && (
        <div className="text-xs space-y-1">
          {Object.entries(results).map(([name, result]: [string, any]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="font-medium w-20">{name}:</span>
              <span className={`${
                result.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {result.success ? 'OK' : 'FAIL'}
              </span>
              {result.data?.ms && (
                <span className="text-gray-500">{result.data.ms}ms</span>
              )}
              {result.data?.now && (
                <span className="text-gray-500">t={result.data.now}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
