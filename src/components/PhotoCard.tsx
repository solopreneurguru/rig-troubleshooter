import { useState } from 'react';
import { PhotoStep } from '@/types/steps';
import { uploadToBlob } from '@/lib/upload';

export function PhotoCard({ 
  step, 
  uploadedUrl, 
  onSubmit 
}: {
  step: PhotoStep;
  uploadedUrl?: string;
  onSubmit: (payload: { type: 'photo'; photoUrl: string }) => void;
}) {
  const [working, setWorking] = useState(false);
  
  const handleFileUpload = async (file: File) => {
    setWorking(true);
    try {
      const url = await uploadToBlob(file);
      onSubmit({ type: 'photo', photoUrl: url });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setWorking(false);
    }
  };
  
  return (
    <div className="rounded-lg border border-green-700 bg-green-900/20 p-4 text-green-100">
      <div className="font-semibold mb-1">Photo Capture</div>
      <p className="opacity-80 mb-3">{step.prompt}</p>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        className="mb-3"
        onChange={async (e) => { 
          const f = e.target.files?.[0]; 
          if (!f) return; 
          await handleFileUpload(f);
        }}
        disabled={working}
      />
      
      {uploadedUrl && (
        <div className="mb-3">
          <img 
            src={uploadedUrl} 
            alt="upload" 
            className="max-h-48 rounded border" 
          />
        </div>
      )}
      
      <button 
        className="rounded bg-green-600 hover:bg-green-500 px-3 py-1 text-white disabled:opacity-50"
        disabled={step.required && !uploadedUrl || working}
        onClick={() => uploadedUrl && onSubmit({ type: 'photo', photoUrl: uploadedUrl })}
      >
        {working ? 'Uploading…' : 'Continue'}
      </button>
    </div>
  );
}
