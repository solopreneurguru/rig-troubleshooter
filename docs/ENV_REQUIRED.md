# Required Environment Variables (Production)

Core (must be set or Airtable is skipped):
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID

Tables (names/IDs as configured in Airtable):
- TB_SESSIONS
- TB_CHATS
- TB_RIGS
- TB_DOCS
- TB_EQUIPMENT_INSTANCES
- TB_RULEPACKS  (for RulePack v2 banner)

Other:
- BLOB_READ_WRITE_TOKEN
- OPENAI_API_KEY
- ADMIN_DEV_TOKEN

> After adding/updating in Vercel → Project → Settings → Environment Variables (Production), trigger a redeploy.
