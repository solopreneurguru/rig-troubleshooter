# Rig Troubleshooter — Docs Index

**Last updated:** 2025-09-03 03:11 

Authoritative, versioned docs for the project. Update these whenever you change schema, env vars, APIs, or deploy behavior.

## What’s here
1. **Vision & Alignment** — `00-vision.md`
2. **Airtable Schema & Setup** — `10-airtable-schema.md`
3. **Architecture & Endpoints** — `20-architecture.md`
4. **RulePack v2 Guide** — `30-rulepack-v2.md`
5. **Runbook (Smoke Tests & Recovery)** — `40-runbook.md`
6. **Roadmap** — `50-roadmap.md`

## Quick smoke test (prod)
- `/api/env` → all relevant keys show “✓ set”.
- `/api/rulepacks/list` → at least one **Active** pack returned.
- `/sessions/new` → RulePack dropdown shows the active pack.
- `/upload` → file upload returns Blob URL and creates **Documents** row.
- Create a session → actions/readings write to Airtable; finding → PDF URL created; email automation fires (if enabled).

## Update cadence
- After **schema** or **select options** change → update *10-airtable-schema.md*.
- After **new feature / endpoint / env var** → update *20-architecture.md* and *40-runbook.md*.
- After **deployment** → append to **CHANGELOG.md** at repo root and update the Roadmap.
