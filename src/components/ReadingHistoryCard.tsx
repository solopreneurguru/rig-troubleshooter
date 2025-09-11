"use client";
import React, { useState, useEffect } from "react";

type ReadingRow = {
  id: string;
  valueRaw: number;
  unitRaw: string;
  value: number;
  pass: boolean;
  createdAt: string;
  note: string;
};

type ReadingHistoryProps = {
  sessionId: string;
  stepId: string;
  stepUnit: string;
};

export default function ReadingHistoryCard({ sessionId, stepId, stepUnit }: ReadingHistoryProps) {
  const [data, setData] = useState<{
    ok: boolean;
    unit: string;
    rows: ReadingRow[];
    count: number;
    passRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [sessionId, stepId, stepUnit]);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/readings/history?sessionId=${sessionId}&stepId=${stepId}&stepUnit=${stepUnit}`
      );
      const result = await response.json();
      
      if (result.ok) {
        setData(result);
      } else {
        setError(result.error || "Failed to load history");
      }
    } catch (err) {
      setError("Network error loading history");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-3 bg-neutral-800 rounded text-sm text-neutral-400">
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-900/20 rounded text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <div className="p-3 bg-neutral-800 rounded text-sm text-neutral-400">
        No readings recorded yet
      </div>
    );
  }

  const { rows, unit, count, passRate } = data;
  const values = rows.map(r => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const latest = rows[rows.length - 1];

  // Simple SVG sparkline
  const sparklineWidth = 120;
  const sparklineHeight = 30;
  const padding = 2;
  
  const sparklinePoints = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (sparklineWidth - 2 * padding);
    const y = sparklineHeight - padding - ((value - min) / (max - min || 1)) * (sparklineHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-3 bg-neutral-800 rounded text-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium text-neutral-200">Reading History ({count})</div>
        <div className={`px-2 py-1 rounded text-xs ${
          latest.pass ? 'bg-green-900/30 text-green-200' : 'bg-red-900/30 text-red-200'
        }`}>
          Latest: {latest.value} {unit} ({latest.pass ? 'PASS' : 'FAIL'})
        </div>
      </div>

      {values.length > 1 && (
        <div className="flex items-center gap-3">
          <svg width={sparklineWidth} height={sparklineHeight} className="border border-neutral-600 rounded">
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1.5"
            />
            {rows.map((row, index) => {
              const x = padding + (index / (values.length - 1)) * (sparklineWidth - 2 * padding);
              const y = sparklineHeight - padding - ((row.value - min) / (max - min || 1)) * (sparklineHeight - 2 * padding);
              return (
                <circle
                  key={row.id}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={row.pass ? "#10b981" : "#ef4444"}
                  className="cursor-pointer"
                >
                  <title>{`${row.value} ${unit} (${row.pass ? 'PASS' : 'FAIL'}) - ${new Date(row.createdAt).toLocaleString()}`}</title>
                </circle>
              );
            })}
          </svg>
          
          <div className="text-xs text-neutral-400 space-y-1">
            <div>Pass rate: {passRate}%</div>
            <div>Range: {min.toFixed(2)} - {max.toFixed(2)} {unit}</div>
            <div>Mean: {mean.toFixed(2)} {unit}</div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="text-xs text-neutral-500 max-h-20 overflow-y-auto">
          {rows.slice(-3).map((row) => (
            <div key={row.id} className="flex justify-between">
              <span>{new Date(row.createdAt).toLocaleTimeString()}</span>
              <span className={row.pass ? 'text-green-400' : 'text-red-400'}>
                {row.value} {unit} ({row.pass ? 'PASS' : 'FAIL'})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
