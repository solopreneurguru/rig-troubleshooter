'use client';
import { useState } from 'react';

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
      const response = await fetch('/api/health');
      return await response.json();
    },
    
    'Airtable Connection': async () => {
      const response = await fetch('/api/diagnostics/airtable');
      return await response.json();
    },
    
    'Server Latency': async () => {
      const response = await fetch('/api/diagnostics/latency');
      return await response.json();
    },
    
    'Rigs List': async () => {
      const response = await fetch('/api/rigs/list');
      return await response.json();
    },
    
    'Create Equipment Test': async () => {
      const response = await fetch('/api/equipment/instances/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          name: `Debug Test ${Date.now()}`, 
          rigName: 'Demo Rig Alpha' 
        })
      });
      return await response.json();
    },
    
    'Create Session Test': async () => {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          problem: `Debug test session ${Date.now()}`,
          rigId: 'recDemoRigAlpha' // Use a known rig ID
        })
      });
      return await response.json();
    }
  };

  const handleSeedV2Pack = async () => {
    setLoading('Seed v2 Pack');
    try {
      const response = await fetch('/api/dev/seed/v2-pack-plus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });
      const json = await response.json();
      setResults((prev: any) => ({ ...prev, 'Seed v2 Pack': { success: response.ok, data: json } }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, 'Seed v2 Pack': { success: false, error: error.message } }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Debug Panel</h1>
      
      <div className="flex flex-wrap gap-2">
        {Object.entries(tests).map(([name, testFn]) => (
          <button
            key={name}
            onClick={() => runTest(name, testFn)}
            disabled={loading !== null}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          >
            {loading === name ? 'Running...' : name}
          </button>
        ))}
        
        <button
          onClick={handleSeedV2Pack}
          disabled={loading !== null}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
        >
          {loading === 'Seed v2 Pack' ? 'Seeding...' : 'Seed v2 Pack'}
        </button>
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