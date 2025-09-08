// docs/README.md
# Rig Troubleshooter — Docs Index
**Last updated:** 2025-09-07

Authoritative, versioned docs for the project. Update these whenever you change schema, env vars, APIs, or deploy behavior.

## What’s here
1. **Vision & Alignment** — `00-vision.md`
2. **Airtable Schema & Setup** — `10-airtable-schema.md`
3. **Architecture & Endpoints** — `20-architecture.md`
4. **RulePack v2 Guide** — `30-rulepack-v2.md`
5. **Runbook (Smoke Tests & Recovery)** — `40-runbook.md`
6. **Roadmap** — `50-roadmap.md`
7. **Environment & Configuration** — `ENVIRONMENT.md`
8. **Deep Reference Appendix** — APPENDIX-deep-reference.md

## Quick smoke test (prod)
- `GET /api/health` → `ok:true`, Airtable reachable, `rulepacks.v2 >= 1`  
  (robust v2 detection: `Version==2`, `Json.version==2`, or key endsWith `.v2`)
- `/sessions/new` → create/select equipment and describe the problem; v2 router auto-selects or use **Override pack**
- `/sessions/[id]` → step runner with SafetyGate + measure/ask/info; pass/fail branches
- Finish → Finding created; ReportURL stored; email automation (Airtable) fires if enabled

## Update cadence
- Schema/select-option changes → update `10-airtable-schema.md`
- New feature/endpoint/env → update `20-architecture.md` and `40-runbook.md`
- After deploy → append CHANGELOG at repo root; update Roadmap

