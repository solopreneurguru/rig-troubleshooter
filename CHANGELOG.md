# Changelog

## [Hotfix] - 2024-12-19

### Security & Data Integrity
- **BREAKING**: Stop writing Sessions.Title to Airtable
  - Added `sanitizeFields()` function to block Formula/Computed fields
  - Sessions.Title is now computed by Airtable formula only
  - Added `BLOCKED_FIELDS` set: `["Title","CreatedAt","Attachments"]`

### API Changes
- **Enhanced**: `/api/sessions/create` now uses strict field mapping
  - Only whitelisted fields are sent to Airtable
  - Added debug logging for field keys verification
  - Added validation to reject Title field attempts
- **Enhanced**: `/api/sessions/update` now sanitizes all incoming fields
  - Hard-blocks Title field if it somehow gets through

### Code Quality
- **Improved**: Centralized field sanitization in `airtable.ts`
- **Improved**: Explicit field whitelisting in session creation
- **Improved**: Added comprehensive grep verification for Title writes

### Files Modified
- `src/lib/airtable.ts` - Added sanitizer function and updated session creation
- `src/app/api/sessions/create/route.ts` - Strict mapping and debug logging
- `src/app/api/sessions/update/route.ts` - Field sanitization
- `src/app/(pages)/sessions/new/page.tsx` - Verified no Title in payload

### Testing
- ✅ Verified no Title writes in codebase via grep
- ✅ Confirmed linter passes on all modified files
- ✅ Session creation now only sends: Rig, EquipmentInstance, Problem, Status, RulePackKey, FailureMode
- ✅ Title field is computed by Airtable formula and never written by application