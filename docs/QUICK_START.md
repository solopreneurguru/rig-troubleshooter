// docs/QUICK_START.md
# Quick Start
**Last updated:** 2025-09-07

Rig Troubleshooter is a Next.js app (Vercel) with Airtable as system of record and Vercel Blob for file storage. It guides technicians through diagnostic steps, enforces safety gates, records readings, and produces a PDF finding report.

## Prerequisites
- Node 18+ (20/22 OK), pnpm or npm
- Airtable PAT with access to the **Rigs** base
- Vercel project with env vars configured

## Environment (.env.local)
# IDs (safe to commit in example)
AIRTABLE_BASE_ID=appH75xsvP9HC31Wp
TB_RIGS=tbltC4aC86df5xXNo
TB_DOCS=tblqddWAQ1EdZUcbI
TB_SESSIONS=tblXGGqiUedSgvN5f
TB_ACTIONS=tblUp40B937qmBcgU
TB_READINGS=tblXI4w3zE5itTTtn
TB_FINDINGS=tblzgW5PaSoYsWDXO
TB_RULEPACKS=tblK0jbRGgd4MS1ff
TB_TECHS=tblf5WbQNHs356qM0
TB_EQUIPMENT_TYPES=tblNVqtwqxsVrX86C
TB_EQUIPMENT_INSTANCES=tblcnNCsN7NfvdmIP
TB_COMPONENTS=tblRHuLUn52yPJuH2
TB_SIGNALS=tbljX5lDjDOYyErRp
TB_TESTPOINTS=tblZXAGLoYM6RNXDv
TB_PARTS=tblcWhuGTy8UcjEsv

# Field name envs (non-secret)
SESSIONS_RULEPACK_FIELD=RulePack
SESSIONS_EQUIPMENT_FIELD=Equipment
EQUIPINSTANCES_TYPE_FIELD=Type

# Secrets (leave blank locally; set in Vercel)
AIRTABLE_API_KEY=
BLOB_READ_WRITE_TOKEN=
ADMIN_DEV_TOKEN=

## Run locally
pnpm i
pnpm dev   # http://localhost:3000

## Five-minute smoke (prod or local with env set)
1) `GET /api/health` → ok + `rulepacks.v2 >= 1`
2) `/sessions/new` → create/select equipment; auto-select pack or **Override**
3) Run steps: SafetyGate (if present) → measure/ask/info → pass/fail branches
4) Create Finding → verify ReportURL + email (if automation enabled)

## Working with RulePacks
- Add row in **RulePacks** with `Key`, `Active: ✓`, and JSON field `Json` (valid JSON)
- v2 authoring uses typed nodes and requires **citations** (Doc page/PLC/TestPoint). See `30-rulepack-v2.md`

## Deploy (Vercel)
git add -A && git commit -m "feat/fix: <message>" && git push  
vercel          # Preview  
vercel --prod   # Production
