---
phase: 03-maestro-e2e-testing
plan: 01
subsystem: testing
tags: [firebase-emulator, expo-dev-client, seed-script, e2e, maestro]

# Dependency graph
requires:
  - phase: 02-company-based-dispatch
    provides: Company, Driver, Request data models and Firestore query contracts
provides:
  - Firebase emulators configured with Auth (9099), Firestore (8080), Functions (5001)
  - App connects to emulators via EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
  - Deterministic seed script creating 4 test users, 1 company, driver docs, pre-claimed request
  - expo-dev-client installed for native Maestro E2E builds
  - iOS bundleIdentifier set to com.towlink.app
  - npm scripts: test:e2e, emulators, emulators:seed
affects: [03-02-maestro-tests]

# Tech tracking
tech-stack:
  added:
    - expo-dev-client ~6.0.20 (native dev build support for Maestro)
    - firebase-admin (devDependency, used by seed script)
  patterns:
    - Emulator connection guarded by EXPO_PUBLIC_USE_FIREBASE_EMULATOR env var
    - emulatorsConnected boolean flag prevents hot-reload "already connected" crash
    - Seed script sets FIRESTORE_EMULATOR_HOST before requiring firebase-admin

key-files:
  created:
    - scripts/seed-emulator.js
    - .env.test
  modified:
    - firebase.json
    - services/firebase/config.ts
    - app.config.js
    - package.json

key-decisions:
  - "emulatorsConnected guard in config.ts prevents connectAuthEmulator crash on hot reload"
  - "Seed request uses status:'claimed' + claimedByDriverId to match listenForClaimedRequests() query contract exactly"
  - "npm run emulators starts emulators in separate terminal; test:e2e checks connectivity with curl before seeding (--detach unreliable on macOS)"
  - "firebase-admin installed as devDependency only — not bundled in app"

patterns-established:
  - "Emulator env guard pattern: if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && !flag) { connect(); flag = true; }"
  - "Seed script clears Firestore via REST DELETE before creating data for deterministic state"

requirements-completed: [TEST-01]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 3 Plan 01: Firebase Emulator Infrastructure + Seed Script Summary

**Firebase Auth+Firestore emulators wired into Expo app via env-gated connectAuthEmulator/connectFirestoreEmulator, with node seed script creating 4 test users, company, and pre-claimed request matching listenForClaimedRequests() query contract**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T23:44:47Z
- **Completed:** 2026-03-20T23:48:29Z
- **Tasks:** 2
- **Files modified:** 6 (+ 2 created)

## Accomplishments
- Firebase emulators now include Auth on port 9099 (was missing before)
- App conditionally connects to emulators when `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` with hot-reload crash guard
- Seed script creates deterministic test environment: 4 auth users, company, driver records, authorized emails, and a pre-claimed request
- expo-dev-client installed for native Maestro E2E build support
- iOS bundleIdentifier set to com.towlink.app (required for Expo dev build targeting)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Firebase emulators + app emulator connection + dev build config** - `e12fee5` (feat)
2. **Task 2: Create emulator seed script with deterministic test data** - `1aea90f` (feat)

## Files Created/Modified
- `firebase.json` - Added `"auth": { "port": 9099 }` to emulators block
- `services/firebase/config.ts` - Added connectAuthEmulator + connectFirestoreEmulator with env guard and emulatorsConnected flag
- `app.config.js` - Added `bundleIdentifier: 'com.towlink.app'` to ios block
- `.env.test` - Created with EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true and fake Firebase credentials
- `package.json` - Added test:e2e, test:e2e:setup, test:e2e:run, emulators, emulators:seed scripts; installed expo-dev-client + firebase-admin
- `scripts/seed-emulator.js` - Created: clears emulator, creates 4 auth users + Firestore docs (users, company, drivers, authorizedEmails, pre-claimed request)

## Decisions Made
- **emulatorsConnected flag**: Prevents "Auth Emulator has already been set" crash when hot-reloading during development with emulators active
- **Seed uses status:'claimed' + claimedByDriverId**: Must match `listenForClaimedRequests()` query in `services/firebase/firestore.ts` which queries `where('status', '==', 'claimed')` AND `where('claimedByDriverId', '==', driverId)` — using 'assigned' or 'driverId' would cause driver's RequestPopup to never appear
- **curl connectivity check in test:e2e:setup**: Instead of --detach (unreliable on macOS), user starts emulators in separate terminal; setup script checks port 8080 is reachable before seeding

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing lint error** (out of scope — logged to deferred-items.md):
- `app/(auth)/onboarding/commuter-login.tsx:181` — `react/no-unescaped-entities` error for apostrophe
- Pre-existed before Phase 03 changes (verified via git stash)
- `npm run lint` exits with code 1 due to this pre-existing error (unrelated to this plan's changes)
- Deferred to Phase 04 polish or a separate cleanup commit

## User Setup Required

None — no external service configuration required beyond the existing `.env` file for regular development. The `.env.test` file uses fake credentials intentionally (emulators don't validate API keys).

To run E2E tests after this plan:
1. `npm run emulators` (in a separate terminal)
2. `npm run emulators:seed`
3. Build and install dev client on device/simulator
4. `npm run test:e2e:run` (once Plan 02 creates the .maestro/ tests)

## Next Phase Readiness
- All emulator infrastructure is in place for Plan 02 (Maestro test files)
- Seed script creates all data Plan 02 tests depend on: commuter, driver, admin accounts and pre-claimed request
- expo-dev-client and bundleIdentifier ready for Expo dev build
- No blockers for Plan 02

---
*Phase: 03-maestro-e2e-testing*
*Completed: 2026-03-20*
