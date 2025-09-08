// docs/CONTRIBUTING.md
# Contributing Guide
**Last updated:** 2025-09-07

## Context
- Stack: Next.js 15 (App Router, TS), Airtable, Vercel Blob, Vercel deploy
- Flow: Sessions → Actions → Readings → Finding (PDF + email). SafetyGate requires named tech confirmation

## Local setup
pnpm i  
cp .env.local.example .env.local  # then add secrets locally or rely on Vercel  
pnpm dev  
# Smoke: open /api/health then /sessions/new

## Safety rules
- Never remove/bypass SafetyGate. Steps with `requireConfirm:true` must block until confirmation (`ConfirmedBy/At`)
- Avoid steps implying unsafe energization/override

## Airtable write rules
- Use table IDs from env (`TB_*`)
- The chosen pack key is stored in the text field named by `SESSIONS_RULEPACK_FIELD` (default `RulePack`)
