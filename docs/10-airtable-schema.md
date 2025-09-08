
```md
// docs/10-airtable-schema.md
# Airtable Schema & Setup
**Last updated:** 2025-09-07

> Base: **Rigs** (`AIRTABLE_BASE_ID=appH75xsvP9HC31Wp`). IDs below are concrete for this project.

## Table IDs
- **TB_RIGS** = `tbltC4aC86df5xXNo`
- **TB_DOCS** = `tblqddWAQ1EdZUcbI`
- **TB_SESSIONS** = `tblXGGqiUedSgvN5f`
- **TB_ACTIONS** = `tblUp40B937qmBcgU`
- **TB_READINGS** = `tblXI4w3zE5itTTtn`
- **TB_FINDINGS** = `tblzgW5PaSoYsWDXO`
- **TB_RULEPACKS** = `tblK0jbRGgd4MS1ff`
- **TB_TECHS** = `tblf5WbQNHs356qM0`
- **TB_EQUIPMENT_TYPES** = `tblNVqtwqxsVrX86C`
- **TB_EQUIPMENT_INSTANCES** = `tblcnNCsN7NfvdmIP`
- **TB_COMPONENTS** = `tblRHuLUn52yPJuH2`
- **TB_SIGNALS** = `tbljX5lDjDOYyErRp`
- **TB_TESTPOINTS** = `tblZXAGLoYM6RNXDv`
- **TB_PARTS** = `tblcWhuGTy8UcjEsv`

## Core Tables (abridged)
- **Rigs**: `Name`, `Location`, `Notes`
- **EquipmentTypes**: `Name`, `Kind`, `OEM`, `Model`, `Docs`
- **EquipmentInstances**: `Name`, `Rig`, `Type`, `Serial`, `VariantNotes`, `PLCProject`, `CommissionedAt`
- **Components**: `Name`, `Equipment`, `Parent?`, `Discipline`, `Drawings`
- **Documents**: `Title`, `DocType`, `BlobURL`, `MimeType`, `SizeBytes`, `Notes`, `Rig?`, `Equipment?`
- **Sessions**: `Title (Formula)`, `Rig`, `EquipmentInstance`, `Problem`, `FailureMode (SS)`, `Status (SS)`, `CreatedAt`, **`RulePack` (text)**
  - App reads the chosen pack from the text field named by `SESSIONS_RULEPACK_FIELD` (default `RulePack`)
- **Actions**: `StepKey`, `Session`, `Instruction`, `Expected`, `Citation`, `Order`, `Result`, `ConfirmedBy`, `ConfirmedAt`, `HazardNote`, `Readings`
- **Readings**: `Name`, `Action`, `Value`, `Unit`, `PassFail`
- **Findings**: `Title`, `Session`, `Rig`, `Outcome`, `FailureMode`, `Summary`, `Parts`, `ReportURL`, `Attachments`
- **RulePacks**: `Key`, `EquipmentType`, `Active (checkbox)`, `Json (long text)`, `Notes`
- **Techs**: identity/contact; used for confirmations

## Expansion Tables
- **Signals**: `Tag`, `Equipment`, `Address`, `Unit`, `Description`, `SourceFile`
- **TestPoints**: `Label`, `Equipment`, `Reference`, `Nominal`, `Unit`, `DocRef`, `DocPage`, `Notes`
  - Anchors: store `DocRef` + `DocPage`; UI composes `docId#p=<page>` links

## Conventions & write guards
- Never write computed (Formula/Lookup/Rollup) fields
- **Sessions.Title** is a Formula; do not send Title in API writes
- Keep select options centralized; don’t add new options at write time
- Use env:  
  - `SESSIONS_RULEPACK_FIELD=RulePack`  
  - `SESSIONS_EQUIPMENT_FIELD=Equipment`  
  - `EQUIPINSTANCES_TYPE_FIELD=Type`
