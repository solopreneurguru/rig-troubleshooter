# Changelog

## [Enhancement] - 2024-12-19

### API Standardization & UX Improvements
- **BREAKING**: Standardized all POST API responses to `{ ok: true, ... }` format
  - `/api/equipment/instances/create` now returns `{ ok: true, equipmentId }` with 201 status
  - `/api/sessions/create` now returns `{ ok: true, sessionId }` with 201 status  
  - `/api/sessions/update` now returns `{ ok: true, updated }` with proper error handling
  - All error responses use `e?.message ?? "unknown"` pattern

### Intake Flow Improvements
- **Enhanced**: Robust intake → update flow in `/sessions/new`
  - Added proper error handling with `.catch(() => null)` for fetch requests
  - Auto-opens Advanced override when no packKey found from intake
  - Added user hint: "I couldn't auto-select a rule pack. Please pick one."
  - Prevents navigation until rule pack is selected or overridden

### Symptom Recognition
- **Enhanced**: Added common failure mode synonyms to `symptom_map.ts`
  - "doesn't work", "doesnt work" → "Won't Start"
  - "isn't starting", "isnt starting" → "Won't Start"  
  - "won't run", "wont run" → "Won't Start"
  - "brake reset", "break reset" → "Other" (typo handling)

### Dark Theme Readability
- **Enhanced**: Applied dark theme classes to modals and inputs
  - Modal containers: `bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-xl rounded-2xl`
  - Input fields: `bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:ring-2 focus:ring-blue-500`
  - Cards/panels: `bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl`
  - Updated text colors: `text-zinc-400` for secondary text, `text-red-400` for clear buttons

### Safety & Debugging
- **Enhanced**: Added console logging in `/api/sessions/create`
  - Logs field keys to verify Title never appears: `console.log("create fields:", Object.keys(fields))`
  - Confirmed sanitizeFields() still blocks Title/CreatedAt/Attachments

### Files Modified
- `src/app/api/equipment/instances/create/route.ts` - Standardized response format
- `src/app/api/sessions/create/route.ts` - Standardized response format + debug logging
- `src/app/api/sessions/update/route.ts` - Standardized response format
- `src/app/(pages)/sessions/new/page.tsx` - Robust intake flow + dark theme
- `src/lib/symptom_map.ts` - Added failure mode synonyms

### Testing
- ✅ Equipment create modal → submit works without JSON errors
- ✅ Session creation with intake → auto-selects pack or opens Advanced override
- ✅ Dark theme applied to all modals, inputs, and cards
- ✅ No linter errors in modified files

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