# BigBadWolf — Runbook for Cursor
When the user types **"bigbadwolf"**:
1) Run: `pnpm bigbadwolf` (or `npm run bigbadwolf` / `yarn bigbadwolf`) to execute the repo scanner and hit `/api/diag/bigbadwolf`.
2) Summarize:
   - Which API route files are missing Node runtime/dynamic/revalidate flags.
   - Any missing env vars from the server response.
   - Any Airtable table ping failures and their errors.
   - Current Active v2 RulePack count.
3) Propose exact file edits (patch hunks) for any missing flags.
4) If envs are missing in Vercel, list the exact keys to add under Production envs.
5) If Airtable errors show field/table mismatch, print the table and field names the code expects (from lib/airtable.ts).
