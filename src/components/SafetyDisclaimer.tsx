export default function SafetyDisclaimer() {
  return (
    <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm">
      <strong>Safety First:</strong> Field work is hazardous. Follow LOTO, site permits, and OEM procedures.
      Do <em>not</em> energize, depressurize, or override interlocks unless authorized and safe.
      This app is advisory only; you are responsible for safety and compliance.
    </div>
  );
}
