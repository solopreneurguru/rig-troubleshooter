import { useState } from 'react';
import { PlcReadStep } from '@/types/steps';

export function PlcReadCard({ 
  step, 
  onSubmit 
}: { 
  step: PlcReadStep; 
  onSubmit: (payload: { type: 'plc_read'; plcResult: string | number | boolean }) => void;
}) {
  const [value, setValue] = useState<string>('');
  
  const expectText = (() => {
    const { op, value } = step.expect;
    return `Expect ${op} ${Array.isArray(value) ? value.join(', ') : value}`;
  })();
  
  return (
    <div className="rounded-lg border border-purple-700 bg-purple-900/20 p-4 text-purple-100">
      <div className="font-semibold mb-1">PLC Read</div>
      <div className="text-sm opacity-80 mb-2">Tag: <strong>{step.tag}</strong></div>
      <div className="text-sm opacity-80 mb-3">{expectText}</div>
      <div className="flex items-center gap-2">
        <input 
          className="w-40 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-white" 
          placeholder="Enter observed value (e.g., 1)" 
          value={value} 
          onChange={e => setValue(e.target.value)} 
        />
        <button 
          className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1 text-white"
          onClick={() => onSubmit({ type: 'plc_read', plcResult: value })} 
          disabled={!value}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
