# Changelog

## [2024-01-XX] - API Standardization & UX Improvements

### Added
- Standardized API response format across all POST routes: `{ ok: true, ... }` on success, `{ ok: false, error }` on failure
- Enhanced symptom synonyms in `symptom_map.ts` for better problem classification
- Console logging in session creation for field sanitization verification

### Fixed
- Intake → update flow now reliably writes RulePackKey and FailureMode to sessions
- Automatic fallback to Advanced override when no rule pack is auto-selected
- Improved error handling in API routes with consistent response format

### Improved
- Dark theme readability for modals and inputs with proper contrast
- User experience in session creation with better error handling and fallback flows
- API consistency across all endpoints

### Technical Details
- Updated `/api/intake/message` and `/api/plan/v2/submit` routes to follow standard response format
- Enhanced field sanitization in `airtable.ts` with proper blocked fields handling
- Improved error handling in session creation flow with proper fallback mechanisms