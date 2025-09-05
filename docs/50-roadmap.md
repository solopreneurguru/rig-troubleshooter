# Roadmap

**Last updated:** 2025-09-03 03:11 

## Next 4–6 weeks
1) **Finish Safety Hardening**
   - Enforce SafetyGate UI; audited Writes (`ConfirmedBy/At`, `HazardNote`).
   - Include confirmation in PDFs.
2) **Rig-specific data**
   - Add **EquipmentInstances**, **Signals**, **TestPoints**; wire New Session to choose instance.
   - Inject instance-specific nominal values and citations into steps.
3) **RulePack Editor (MVP)**
   - Web authoring form → validate (zod) → simulate → save to Airtable.
4) **Doc Anchors & Viewer**
   - Capture page anchors; open citations at exact page.
5) **Findings PDF v2**
   - Include action timeline, readings, safety confirmations, and doc refs.
6) **Tuning Job**
   - Nightly analysis → propose rulepack diffs; human approval queue in Airtable.

## Later
- Offline cache, mobile-first polish, Slack routing, richer analytics, deeper TIA parsing, telemetry integrations.
