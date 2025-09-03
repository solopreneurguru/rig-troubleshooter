export default function SafetyDisclaimer() {
  return (
    <div className="mt-4 rounded-md border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-200 dark:text-amber-900 px-4 py-3">
      <strong className="font-medium">Safety First:</strong> Field work is hazardous. Follow LOTO, site permits, and OEM procedures.
      Do <em>not</em> energize, depressurize, or override interlocks unless authorized and safe.
      This app is advisory only; you are responsible for safety and compliance.
    </div>
  );
}
