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
- **POST** `/api/admin/backfill-chat-sessionid`  — one-time chat data migration (token-guarded)
> All require `ADMIN_DEV_TOKEN` or `ADMIN_TOKEN`. Without the token they respond **403** in prod.

## Chat System APIs
- **GET** `/api/chat?sessionId=<recXXX>`  — get messages for session → `{ ok, chatId, messages[] }`
- **POST** `/api/chat`  — send message `{ sessionId, text }` → `{ ok, chatId, messageId }`
- Uses denormalized `Chats.SessionId` field for fast session→chat lookup
- Automatic chat creation per session with safety disclaimer in UI

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
- `/api/health` is the single smoke source (Airtable reachability + robust v2 count)
- `/api/diag/version` provides commit SHA, region, and table presence for support
- `/api/diag/ping` confirms Node runtime responsiveness < 200ms

## API Route Naming Policy (Hard Guardrail)

**Why:** Next.js treats sibling dynamic segments at the same path level as a conflict. Having both `/api/sessions/[id]` and `/api/sessions/[sessionId]` will break the Node runtime and cause timeouts.

**Rules:**
- Under any given folder, you may have at most **one** dynamic segment directory.
- Standardize parameter names:
  - Within `/api/<resource>/[id]` use `[id]` for the primary record.
  - Use more specific names (e.g., `[sessionId]`) only if they live under a *different* top-level route (e.g., `/api/report/[sessionId]` is fine).
- Never mix `[id]` and `[sessionId]` (or any two param names) as *siblings*.

**Automation:**
- `npm run check:routes` fails the build if sibling dynamic segments are detected.
- Run this locally before PRs; CI will run it before deploys.