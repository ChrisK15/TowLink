# Deferred Items

## Out-of-Scope Pre-existing Issues

### Lint Error: Unescaped entity in commuter-login.tsx

- **File**: `app/(auth)/onboarding/commuter-login.tsx:181`
- **Issue**: `react/no-unescaped-entities` error — apostrophe `'` needs HTML entity escape
- **Discovered during**: Phase 03, Plan 01, Task 1
- **Pre-existing**: Yes — confirmed present before Phase 03 changes (verified via git stash)
- **Impact**: `npm run lint` exits with error code 1
- **Resolution**: Fix in a separate cleanup commit or Phase 04 polish
