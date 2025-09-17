export const dynamic = 'force-dynamic';
export default function Home() {
  return (
    <main className="p-4 text-sm text-neutral-200">
      <h1 className="text-2xl font-semibold mb-3">Rig Troubleshooter</h1>
      <p className="mb-4">Welcome. Start a session or open a rig.</p>
      <div className="bg-amber-200 text-amber-900 p-3 rounded mb-6">
        Safety First: Field work is hazardous. Follow LOTO, permits, and OEM procedures. Do not energize, depressurize, or override interlocks unless authorized and safe. This app is advisory; you are responsible for safety and compliance.
      </div>
      <ul className="list-disc ml-5 space-y-2">
        <li><a className="underline" href="/rigs">Rigs</a></li>
        <li><a className="underline" href="/sessions/new">New Session</a></li>
        <li><a className="underline" href="/upload">Upload</a></li>
      </ul>
    </main>
  );
}