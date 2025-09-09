'use client';
import { useState } from 'react';

interface DebugPanelProps {
  adminToken?: string;
}

export default function DebugPanel({ adminToken }: DebugPanelProps) {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  const quickTests = {
    'Health': async () => {
      const response = await fetch('/api/health');
      return await response.json();
    },
    'Airtable': async () => {
      const response = await fetch('/api/diagnostics/airtable');
      return await response.json();
    },
    'Latency': async () => {
      const response = await fetch('/api/diagnostics/latency');
      return await response.json();
    }
  };

  const seedTest = async () => {
    if (!adminToken) throw new Error('Admin token required');
    const response = await fetch('/api/dev/seed/v2-pack-plus', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return await response.json();
  };

  if (!expanded) {
    return (
      <div className="border rounded p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quick Diagnostics</span>
          <button
            onClick={() => setExpanded(true)}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">Debug Panel</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {Object.entries(quickTests).map(([name, testFn]) => (
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

      {adminToken && (
        <div className="mb-3">
          <button
            onClick={() => runTest('Seed v2', seedTest)}
            disabled={loading !== null}
            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading === 'Seed v2' ? 'Seeding...' : 'Seed v2 Pack'}
          </button>
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="text-xs space-y-1">
          {Object.entries(results).map(([name, result]: [string, any]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="font-medium w-16">{name}:</span>
              <span className={`${
                result.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {result.success ? 'OK' : 'FAIL'}
              </span>
              {result.data?.latency && (
                <span className="text-gray-500">{result.data.latency}ms</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
