# Runbook — Smoke, Troubleshooting & Recovery
**Last updated:** 2025-09-07

## Safety banner
Safety First: Follow LOTO and OEM procedures. Do not energize/override interlocks unless authorized and safe.

## First-Aid for API Timeouts (Next.js)

If many API routes start timing out simultaneously, check for a **dynamic route conflict**:

1. Run `npm run check:routes` — this fails if siblings like `/api/sessions/[id]` and `/api/sessions/[sessionId]` coexist.
2. Standardize the param name (prefer `[id]`) and remove the conflicting sibling folder.
3. Re-deploy and verify:
   - `npm run smoke:routes` → expect 200s on `node-ping`, `edge-ping`, `health-lite`.
   - Open `/api/diag/ping` in the browser to confirm fast JSON.

This and Airtable-key misconfigurations are the two fastest ways to knock out the runtime. The guardrail script prevents the former.

## One-minute smoke (prod)
1) `GET /api/health` → `ok:true`, Airtable reachable, `rulepacks.v2 >= 1`  
2) `/sessions/new` → create a session (auto-select or **Override** v2 pack)  
3) Step runner → SafetyGate confirm; enter a measure reading; verify branching  
4) Create a Finding → verify ReportURL and email (if automation enabled)

## Owner-only production smoke (optional)
- **Prereq:** set `ADMIN_DEV_TOKEN` in env (Vercel: Project → Settings → Environment Variables; or locally for testing)
- **Run:** `npm run smoke:prod`
- What it does:
  - Health check
  - Conditional seeding (only if `v2==0`)
  - Session creation (uses admin endpoint when token present; otherwise standard flow)
  - Step progression test (`plcRead` → `photo`)
  - File upload test
  - Report generation test

## Preview/dev tools
/admin/dev (preview-only)  
/api/dev/seed/v2-pack  
/api/dev/seed/v2-pack-plus  
/api/dev/session  
/api/dev/cleanup

## Common fixes
- **v2=0 on health**: ensure at least one Active v2 pack exists (Version:2 or Json.version:2 or `.v2` key suffix). Re-check `/api/health`.  
- **/sessions/undefined**: fixed; redirects to `/sessions/new`.  
- **No SafetyGate**: ensure step has `requireConfirm:true` and Tech context is present.

## Reporting & email
Finding creation stores **ReportURL** on the Finding and Airtable automation can send "New Finding" emails.