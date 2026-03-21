---
phase: 03-maestro-e2e-testing
plan: 02
subsystem: testing
tags: [maestro, e2e, testid, yaml-flows, ios-simulator]

# Dependency graph
requires:
  - phase: 03-maestro-e2e-testing
    plan: 01
    provides: Firebase emulators, seed script, expo-dev-client, bundleIdentifier
provides:
  - testID props on all interactive elements used by Maestro flows
  - 5 Maestro test flows (.maestro/)
  - 3 reusable login subflows (.maestro/subflows/)
  - Single-command test runner (scripts/run-e2e.sh)
  - Updated test:e2e npm script
affects: [03-maestro-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - testID on every interactive element Maestro targets (maps to id: selector in YAML)
    - Maestro subflow pattern for login reuse across test flows
    - scrollUntilVisible for elements below the fold (submit button in sheet)
    - launchApp with clearState: true in each subflow for isolated test state

key-files:
  created:
    - .maestro/subflows/login-commuter.yaml
    - .maestro/subflows/login-driver.yaml
    - .maestro/subflows/login-admin.yaml
    - .maestro/commuter-happy-path.yaml
    - .maestro/commuter-no-drivers.yaml
    - .maestro/driver-accept-complete.yaml
    - .maestro/driver-decline.yaml
    - .maestro/admin-basic.yaml
    - scripts/run-e2e.sh
  modified:
    - app/(auth)/login.tsx
    - app/(auth)/signup.tsx
    - app/(commuter)/index.tsx
    - app/(driver)/index.tsx
    - components/RequestServiceSheet.tsx
    - components/FindingDriverModal.tsx
    - components/ActiveTripSheet.tsx
    - components/RequestPopup.tsx
    - package.json

key-decisions:
  - "scrollUntilVisible used for submit-request-btn which may be below the fold in the request sheet"
  - "commuter-no-drivers uses Anchorage AK address to trigger no_drivers (out of LA company service radius)"
  - "driver flows rely on seed script pre-claimed request contract (status:'claimed' + claimedByDriverId) - same as Plan 01 decision"
  - "test:e2e now delegates entirely to scripts/run-e2e.sh which handles emulator check, seed, location grant, and maestro run"

# Metrics
duration: 12min
completed: 2026-03-21
---

# Phase 3 Plan 02: Maestro YAML Test Flows + testID Props Summary

**testID props added to 8 screens/components, 5 Maestro test flows + 3 login subflows created, and single-command runner script wired into npm test:e2e — awaiting human verification on iOS Simulator dev build**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-20T23:48:29Z
- **Completed:** 2026-03-21T00:00:19Z (tasks 1 and 2 only — task 3 is checkpoint)
- **Tasks:** 2 of 3 (task 3 is human-verify checkpoint)
- **Files modified:** 9 (+ 9 created)

## Accomplishments

- Added testID props to all interactive elements used by Maestro flows across 8 files (22 new testID props total)
- Created 3 reusable login subflows covering commuter, driver, admin roles
- Created 5 Maestro test flows covering the full core user journeys
- Created `scripts/run-e2e.sh` that checks emulator connectivity, re-seeds, grants iOS location permission, and runs all flows
- Updated `package.json` test:e2e script to use the shell script

## Task Commits

Each task was committed atomically:

1. **Task 1: Add testID props to all screens** - `98ed4e3` (feat)
2. **Task 2: Create Maestro YAML flows and runner script** - `97ff89b` (feat)

## Files Created/Modified

### testID additions (Task 1)
- `app/(auth)/login.tsx` - testID on email-input, password-input, login-btn
- `app/(auth)/signup.tsx` - testID on signup-email-input, signup-password-input, signup-confirm-password-input, signup-btn
- `app/(commuter)/index.tsx` - testID on request-assistance-btn
- `app/(driver)/index.tsx` - testID on go-online-btn, online-toggle
- `components/RequestServiceSheet.tsx` - testID on detect-location-btn, pickup-address-input, dropoff-address-input, vehicle-year-input, vehicle-make-input, vehicle-model-input, submit-request-btn
- `components/FindingDriverModal.tsx` - testID on try-again-btn, cancel-search-btn
- `components/ActiveTripSheet.tsx` - testID on advance-trip-btn
- `components/RequestPopup.tsx` - testID on accept-request-btn, decline-request-btn

### Maestro files (Task 2)
- `.maestro/subflows/login-commuter.yaml` - launchApp clearState, fill email/password, assert "Commuter Screen"
- `.maestro/subflows/login-driver.yaml` - launchApp clearState, fill email/password, assert "Offline"
- `.maestro/subflows/login-admin.yaml` - launchApp clearState, fill email/password, assert "Jobs"
- `.maestro/commuter-happy-path.yaml` - full commuter flow: login, fill form, submit, assert "Searching"
- `.maestro/commuter-no-drivers.yaml` - Anchorage address to trigger no_drivers (60s timeout)
- `.maestro/driver-accept-complete.yaml` - go online, accept, advance through en_route/arrived/in_progress/completed
- `.maestro/driver-decline.yaml` - go online, decline, assert "Request Declined"
- `.maestro/admin-basic.yaml` - login, tap Drivers tab, tap Jobs tab
- `scripts/run-e2e.sh` - connectivity check, seed, location grant, maestro test .maestro/
- `package.json` - test:e2e updated to use shell script

## Decisions Made

- **scrollUntilVisible for submit button**: The request service sheet is a scroll view; the submit button may be below the fold. Maestro's scrollUntilVisible handles this.
- **Anchorage for no_drivers test**: The seeded company is in LA with a bounded service radius. A request in Anchorage will exceed any reasonable service radius and trigger no_drivers after Cloud Functions dispatch attempt.
- **Shell script delegates to run-e2e.sh**: Cleaner than chaining npm scripts; allows passing arguments through (e.g., `npm run test:e2e .maestro/admin-basic.yaml`)

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint: Task 3 Awaiting Human Verification

Task 3 requires building the Expo dev build and running the full E2E suite. See checkpoint details below.

## Pre-existing lint error (out of scope)

- `app/(auth)/onboarding/commuter-login.tsx:181` — `react/no-unescaped-entities` apostrophe
- Pre-existed before Phase 03 (documented in Plan 01 Summary)
- No new errors introduced by this plan

---
*Phase: 03-maestro-e2e-testing*
*Completed tasks 1-2 on: 2026-03-21*

## Self-Check: PASSED

- FOUND: .maestro/subflows/login-commuter.yaml
- FOUND: .maestro/subflows/login-driver.yaml
- FOUND: .maestro/subflows/login-admin.yaml
- FOUND: .maestro/commuter-happy-path.yaml
- FOUND: .maestro/commuter-no-drivers.yaml
- FOUND: .maestro/driver-accept-complete.yaml
- FOUND: .maestro/driver-decline.yaml
- FOUND: .maestro/admin-basic.yaml
- FOUND: scripts/run-e2e.sh (executable)
- FOUND commit: 98ed4e3 (Task 1)
- FOUND commit: 97ff89b (Task 2)
- testID count: login(3), signup(4), commuter(1), driver(2), RequestServiceSheet(7), FindingDriverModal(2), ActiveTripSheet(1), RequestPopup(2) = 22 total
