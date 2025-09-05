# Contributing Guide

**Last updated:** 2025-09-03

Thanks for helping build **Rig Troubleshooter**. This guide explains how to set up, make changes safely, and submit PRs we can trust in the field.

---

## 1) Quick context
- **Stack**: Next.js 15 (App Router, TS), Airtable (system of record), Vercel Blob (files), Vercel deploy.
- **Core flow**: Sessions → Actions → Readings → Finding (PDF + email). RulePack v2 defines diagnostic graphs; safety gates require named tech confirmation.

Read `/docs/README.md` then `/docs/QUICK_START.md`.

---

## 2) Prerequisites
- Node 18+ (20/22 ok)
- `pnpm` or `npm`
- Airtable PAT with: `data.records:read`, `data.records:write`, `schema.bases:read`
- Vercel CLI (`npm i -g vercel`) optional

---

## 3) Local setup
```bash
pnpm i              # or npm i
cp .env.local.example .env.local  # if present; else see QUICK_START
pnpm dev            # or npm run dev
# visit http://localhost:3000
```

Smoke test (local): open `/api/env`, `/api/rulepacks/list`, then `/sessions/new` and run through a couple of steps.

---

## 4) Branching & commits
- Branch names: `feature/<short>`, `fix/<short>`, `docs/<short>`
- Commit style (not strict but helpful): `feat: …`, `fix: …`, `docs: …`, `chore: …`
- One logical change per PR; update docs in the same PR when applicable.

---

## 5) Safety rules (must-read)
- Never remove or bypass **SafetyGate** logic. Steps with `requireConfirm: true` must block progression until tech confirms **LOTO/PPE**.
- All confirmations must record: `ConfirmedBy` (Tech), `ConfirmedAt`, optional `HazardNote`.
- Don’t add steps that imply unsafe energization or override interlocks.
- Include a **Safety** note in the PR description when touching planning or step rendering.

---

## 6) Airtable write rules
- Link fields use **string arrays** of record IDs: `{ Session: ["recXXX"] }`.
- **Single-selects** must have options pre-created in Airtable. Do **not** create new select options from API code.
- Use table IDs from env: `TB_*`. The Sessions field storing the selected rulepack is named by `SESSIONS_RULEPACK_FIELD` (e.g., `RulePack`).

---

## 7) Env & secrets
- Local: `.env.local`. Production/Preview: set in Vercel for all environments.
- No trailing spaces/newlines in secrets (Airtable PATs).
- Never commit secrets. Validate env presence at `/api/env` before merging.

---

## 8) Code style & quality
- TypeScript strictness on; prefer explicit types on API inputs/outputs.
- UI: Tailwind; keep contrast AA+ for field use on deck; minimum 14–16px text.
- Add server-side logging for API routes (`sessionId`, `actionId`, `techId` where applicable).

---

## 9) Adding/Editing RulePack v2
1. Draft JSON (see `/docs/30-rulepack-v2.md`). Keep instructions succinct; add `unit` and thresholds.
2. Validate: `POST /api/rulepacks/validate` with `{ "json": <pack> }`.
3. (Optional) Simulate: `POST /api/rulepacks/simulate` with a `path`.
4. Save JSON in Airtable **RulePacks.Json**, set **Active** only after validation.
5. Include citations to doc anchors or PLC tags wherever possible.

---

## 10) PR checklist (must pass)
- `/api/env` shows all required keys set.
- `/api/rulepacks/list` returns ≥1 Active pack.
- `/sessions/new` works end-to-end; safety gate renders & blocks until confirmed.
- If schema changed: Airtable options/fields created and **documented** in `/docs/10-airtable-schema.md`.
- Docs updated: `/docs` and `CHANGELOG.md`.
- Screenshots or short notes if UI changed.

---

## 11) Deployment
```bash
vercel           # Preview
vercel --prod    # Production
```
Re-run the smoke test post-deploy. If Vercel protection blocks testing, disable temporarily or use the bypass cookie URL (then re-enable).

---

## 12) Rollback
- Revert commit or redeploy last good build in Vercel.
- If schema changed, include a rollback note in PR; avoid destructive migrations.
