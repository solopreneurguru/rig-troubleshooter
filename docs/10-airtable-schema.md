# Airtable Schema & Setup

**Last updated:** 2025-09-03 03:11 

_Base name: **Rigs** — system of record for the app._

> **Link fields**: write **string arrays** of record IDs (e.g., `{{ Session: ["rec123"] }}`), **not** `{{ id: ... }}` objects.

## Tables & Fields (exact names)

### Rigs
- **Name** (Single line) — primary
- Optional: **Location** (Single line), **Notes** (Long text)

### Documents
- **Title** (Single line)
- **DocType** (Single select) — include: `Photo`, `Manual`, `Electrical`, `Hydraulic`, `PLC`, `Other`
- **BlobURL** (URL)
- **MimeType** (Single line)
- **SizeBytes** (Number)
- **Notes** (Long text)
- **Rig** (Link to Rigs) — optional
- **Session** (Link to Sessions) — optional
- **CreatedAt** (Created time)

### Sessions
- **Title** (Single line or formula)
- **Rig** (Link to Rigs)
- **Problem** (Single line or Long text)
- **Status** (Single select: `Open`, `Closed`)
- **CreatedAt** (Created time)
- **RulePack** (Single line or Single select) — the field name referenced by env `SESSIONS_RULEPACK_FIELD`

### Actions
- **Session** (Link to Sessions)
- **StepKey** (Single line)
- **Instruction** (Long text)
- **Expected** (Single line or Number)
- **Citation** (Single line or Long text)
- **Order** (Number)
- **Result** (Single select: `Pending`, `Pass`, `Fail`)
- **ConfirmedBy** (Link to Techs) — safety confirmation
- **ConfirmedAt** (Date & time)
- **HazardNote** (Long text)
- **CreatedAt** (Created time)

### Readings
- **Action** (Link to Actions)
- **Value** (Number or Single line)
- **Unit** (Single line) — e.g., `VDC`, `VAC`, `mA`, `bar`, `psi`, `ohm`, `deg`, `rpm`, `Hz`
- **PassFail** (Single select: `Pass`, `Fail`)
- **CreatedAt** (Created time)

### Findings
- **Title** (Single line)
- **Session** (Link to Sessions)
- **Rig** (Link to Rigs) — optional
- **Outcome** (Single select) — include exactly: `Resolved`, `Monitor`, `Escalate-Electrical`, `Escalate-Mechanical`, `Escalate-Controls`
- **Summary** (Long text)
- **Parts** (Long text)
- **ReportURL** (URL)
- **Attachments** (Attachment) — optional
- **CreatedAt** (Created time)

### RulePacks
- **Key** (Single line) — e.g., `topdrive.rpm.low` or `topdrive.rpm.low.v2`
- **EquipmentType** (Single line or Single select e.g., `TopDrive`)
- **Model** (Single line) — optional
- **PLCVersion** (Single line) — optional
- **Active** (Checkbox) — **must be checked** to appear
- **Json** (Long text) — raw JSON string of the pack
- **Notes** (Long text) — optional

### Techs
- **Name** (Single line)
- **Email** (Single line)
- **Phone** (Single line) — optional
- **CreatedAt** (Created time)
- Tip: set primary field to formula `IF({{Name}},{{Name}},{{Email}})`

### (Planned) EquipmentTypes
- **Name**, **Kind** (Single select: `TopDrive`, `Drawworks`, `IR`, `PHM`, `MudPump`, `Catwalk`, `Controls`, `HPU`, `Rotary`, `TB/Hook`, `Other`), **OEM**, **Model**, **Docs** (Link → Documents)

### (Planned) EquipmentInstances
- **Rig** (Link → Rigs), **Type** (Link → EquipmentTypes), **Serial**, **VariantNotes**, **PLCProject** (Link → Documents), **CommissionedAt** (Date)

### (Planned) Components
- **Equipment** (Link → EquipmentInstances), **Parent** (self-link), **Name**, **Discipline** (Single select: `Electrical`, `Mechanical`, `Hydraulic`, `Controls`), **Drawings** (Link → Documents)

### (Planned) Signals (PLC/VFD I/O catalog)
- **Equipment** (Link → EquipmentInstances), **Tag**, **Address**, **Unit**, **Description**, **SourceFile**

### (Planned) TestPoints (terminals)
- **Equipment** (Link → EquipmentInstances), **Label** (`TB3-2`, `A16`), **Reference** (`COM`, `B12`), **Nominal** (Number), **Unit** (Single select), **DocRef** (Link → Documents)

## Env → Table ID Map
- `TB_RIGS`, `TB_DOCS`, `TB_SESSIONS`, `TB_ACTIONS`, `TB_READINGS`, `TB_FINDINGS`, `TB_RULEPACKS`, `TB_TECHS`
- `SESSIONS_RULEPACK_FIELD` → name of the Sessions field storing the chosen rulepack key

## Gotchas & Tips
- Pre-create **single-select** options exactly as used by the app (case & hyphen sensitive).
- Verify at `/api/env` and `/api/airtable/health` after any token or schema change.
