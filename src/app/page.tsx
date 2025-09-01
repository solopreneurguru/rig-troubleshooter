import SafetyDisclaimer from "@/components/SafetyDisclaimer";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Rig Troubleshooter</h1>
      <p className="mt-2">Welcome. Start a session or open a rig.</p>
      <SafetyDisclaimer />
    </main>
  );
}