// docs/APPENDIX-deep-reference.md
# Deep Reference Appendix
**Last updated:** 2025-09-07

This appendix expands on the concise docs with the nitty-gritty you may want handy during authoring, testing, and PRs.

---

## A) Endpoint Reference (current)

### Health & Environment
- `GET /api/health` — canonical smoke: returns `{ ok, env, airtableOk, rulepacks: { total, v2 } }`
- `GET /api/env` — presence map for expected env vars (dev aid)

### RulePacks
- `GET /api/rulepacks/list` — active packs (v1 + v2)
- `POST /api/rulepacks/validate` — schema + graph validation (v2)
- `POST /api/rulepacks/simulate` — simulate traversal (dev tool)

### Planner & Sessions
- `POST /api/sessions/create`
- `POST /api/plan/next`      — v1
- `POST /api/plan/submit`    — v1
- `POST /api/plan/v2/next`   — v2 step runner
- `POST /api/plan/v2/submit` — v2 readings & branching

### Safety & Files
- `POST /api/actions/confirm-hazard` — records tech confirmation (LOTO/PPE)
- `POST /api/blob/upload`            — Vercel Blob upload (Documents row created)

### Reports
- `GET /api/report/[sessionId]` — ReportPDF (if enabled in your build/deploy)

### Dev/Preview-only
- `POST /api/dev/seed/v2-pack`
- `POST /api/dev/seed/v2-pack-plus`
- `POST /api/dev/session`
- `POST /api/dev/cleanup`

> Older docs used `/api/env` and a separate Airtable health check; we consolidated around `/api/health` to reduce clicks. The past “API map” listed `/api/report/[sessionId]` explicitly; include it if your deployment exposes it. Former quick smoke relied on `/api/rulepacks/list` to prove at least one Active pack. :contentReference[oaicite:2]{index=2}

---

## B) Select-Option Vocabularies (keep these exact)

Actions.Result:
- `Pending`, `Pass`, `Fail`. (Pre-create options to prevent write errors.) :contentReference[oaicite:3]{index=3}

Findings.Outcome:
- `Resolved`, `Monitor`, `Escalate-Electrical`, `Escalate-Mechanical`, `Escalate-Controls`. :contentReference[oaicite:4]{index=4}

FailureMode (Sessions):
- Won’t Start, Low RPM, Trips, No Speed Ref, Over-Torque, Overheat, Oil Low, Pressure Low, Pressure High, Flow Low, Vibration, Electrical Interlock, Controls Fault, Hydraulic Fault, Mechanical Jam, Other. :contentReference[oaicite:5]{index=5}

EquipmentTypes.Kind (suggested):
- TopDrive, Drawworks, IR, PHM, MudPump, Catwalk, Controls, HPU, Rotary, TB/Hook, Fingerboard, ControlSystem, Other. :contentReference[oaicite:6]{index=6}

Documents.DocType (project standard):
- Photo, Manual, Electrical, Hydraulic, PLC, Other. (Ensure Airtable select includes these names everywhere.) :contentReference[oaicite:7]{index=7}

TestPoints.Unit (suggested):
- VDC, VAC, mA, Ω, bar, psi, rpm, Hz, °C, text. :contentReference[oaicite:8]{index=8}

---

## C) Schema Conventions (clarifications)

- **Sessions → RulePack field**: the app reads the chosen pack from the text field named by `SESSIONS_RULEPACK_FIELD` (default `RulePack`). Keep it as text for compatibility; link migration can come later. :contentReference[oaicite:9]{index=9}
- **TestPoint anchors**: store `DocRef` (link to Documents) + `DocPage` (page number). The app composes anchors like `docId#p=12` for right-rail links & report citations. :contentReference[oaicite:10]{index=10}

---

## D) RulePack v2 Authoring Pointers (extended)

- Typed nodes: `note`, `ask`, `measure`, `safetyGate`, `done`; plus **Block 15** adds `plcRead`, `photo`.
- Always include **citations** (Doc page, PLC Tag/Address, or TestPoint label).
- Numeric checks: use `expect±tolerance` or `min/max` with `unit`.
- Hazardous actions: `requireConfirm:true` and a short `hazardNote`.
- Validate with `/api/rulepacks/validate` before turning `Active: ✓`.

See the original v2 template and guidance here for fuller context: authoring guidance and template (keys, citations, anchors) are captured in the handbook. :contentReference[oaicite:11]{index=11}

---

## E) PR Checklist (updated)

- `/api/health` returns `ok:true`, `airtableOk:true`, `rulepacks.v2 >= 1`.  
- Create a session at `/sessions/new` and complete at least 2 steps (one **measure**, one **safetyGate** if present).  
- Finding created; **ReportURL** opens; email automation (if enabled) fires.  
- If you changed schema: update `docs/10-airtable-schema.md`.  
- Update `CHANGELOG.md` and screenshots if UI changed.

(Previous checklist referenced `/api/env` and `/api/rulepacks/list`; this one uses `/api/health` as the single source for readiness.) :contentReference[oaicite:12]{index=12}
