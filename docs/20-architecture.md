# Architecture & Endpoints
**Last updated:** 2025-09-07

## Stack
- Next.js 15 (App Router, TS)
- Airtable (system of record)
- Vercel Blob (file storage)
- PDF generation with URL stored on **Findings**
- Optional Vercel Protection for prod

## Pages
/               — home/status  
/upload         — upload → Blob → Documents  
/sessions/new   — session intake (rig/equipment picker, problem, optional override)  
/sessions/[id]  — step runner workspace (redirects from `/sessions/undefined`)  
/admin/dev      — preview-only dev panel (**disabled on prod**)

## APIs (key ones)
/api/env  
/api/health                       # health + robust v2 pack count  
/api/rulepacks/list  
/api/rulepacks/validate  
/api/rulepacks/simulate  
/api/sessions/create  
/api/plan/next                    # v1  
/api/plan/submit                  # v1  
/api/plan/v2/next                 # v2 step runner  
/api/plan/v2/submit               # v2 submit readings/branch  
/api/actions/confirm-hazard  
/api/blob/upload

## Admin / owner-only (prod)
- **POST** `/api/admin/session`  — create a demo session (token-guarded)
- **POST** `/api/admin/cleanup`  — cleanup recent demo sessions (token-guarded)
> Both require `ADMIN_DEV_TOKEN`. Without the token they respond **403** in prod.

## Dev utilities (preview-only)
/api/dev/seed/v2-pack  
/api/dev/seed/v2-pack-plus  
/api/dev/session  
/api/dev/cleanup

## Data flow
Upload → Blob URL → **Documents**  
Intake → `{Rig, Equipment, Problem}`; router sets `RulePackKey`; creates first Action  
Submissions → write **Readings**, set `Actions.Result`, compute next node  
SafetyGate → capture `ConfirmedBy/At`  
Finish/Escalate → Finding with ReportURL; optional email automation

## Reliability
`/api/health` is the single smoke source (Airtable reachability + robust v2 count)