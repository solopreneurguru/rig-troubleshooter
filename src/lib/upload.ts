export async function uploadToBlob(file: File): Promise<string> {
  const fd = new FormData();
  fd.set('file', file);
  const res = await fetch('/api/blob/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Blob upload failed');
  const data = await res.json();
  return data.url as string;
}
