---
phase: 06-security-reliability-testing
plan: 01
subsystem: testing
tags: [jest, firebase, firestore-rules, security, unit-testing, ts-jest, jest-expo]

requires:
  - phase: 06-security-reliability-testing
    provides: firestore.rules with role-based access for 6 collections

provides:
  - jest multi-project config separating rules tests (ts-jest/Node) from unit tests (jest-expo)
  - automated Firestore security rules tests for all 6 collections (50 tests)
  - service-level unit tests for calculateFare, calculateETA, kmToMiles, decodePolyline (20 tests)
  - shared test setup factory with seedUser/seedCompany helpers

affects: [06-security-reliability-testing]

tech-stack:
  added:
    - jest@30.3.0 (test runner)
    - jest-expo@55.0.11 (Expo/RN preset for unit tests)
    - @firebase/rules-unit-testing@5.0.0 (Firestore rules tests against emulator)
    - @types/jest@30.0.0 (TypeScript support)
    - ts-jest@29.4.6 (TypeScript transform for rules project)
  patterns:
    - jest.config.js multi-project array separating rules (node env) from unit (jest-expo)
    - seedUser/seedCompany helpers via withSecurityRulesDisabled for test data setup
    - Fixed Timestamp values in tests to avoid time-dependent equality failures in rules
    - moduleNameMapper stubs for expo-location and expo winter runtime in Node env

key-files:
  created:
    - jest.config.js
    - __tests__/firestore-rules/setup.ts
    - __tests__/firestore-rules/requests.rules.test.ts
    - __tests__/firestore-rules/trips.rules.test.ts
    - __tests__/firestore-rules/users.rules.test.ts
    - __tests__/firestore-rules/drivers.rules.test.ts
    - __tests__/firestore-rules/companies.rules.test.ts
    - __tests__/firestore-rules/driverLocations.rules.test.ts
    - __tests__/services/requestCalculations.test.ts
    - __tests__/services/geoLocationUtils.test.ts
    - __tests__/services/decodePolyline.test.ts
    - __tests__/__mocks__/expo-location.js
    - __tests__/__mocks__/expo-winter-runtime.js
  modified:
    - package.json (added jest devDeps and test/test:rules/test:unit scripts)

key-decisions:
  - "Fixed Timestamp values in users.rules.test.ts: updateDoc must send back the same createdAt timestamp — Firestore rules check request.resource.data.createdAt == resource.data.createdAt, so Timestamp.now() on both sides always fails"
  - "moduleNameMapper stubs for expo-location and expo/src/winter in unit project: jest-expo setup pulls in expo winter runtime which uses import.meta (unavailable in Jest CJS); expo-location pulls in native modules requiring device context"
  - "jest.mocked() instead of type cast after import: avoids import/first ESLint error when mocked module import must be at top of file"

requirements-completed: [SEC-01, TEST-01]

duration: 11min
completed: 2026-03-25
---

# Phase 06 Plan 01: Jest Setup + Firestore Rules Tests + Service Unit Tests Summary

**Jest multi-project config (ts-jest rules / jest-expo unit), 50 Firestore security rules tests across 6 collections, and 20 service unit tests for calculateFare/ETA/decodePolyline — 70 tests total, all passing**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-25T22:48:32Z
- **Completed:** 2026-03-25T22:59:02Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Installed jest, jest-expo, @firebase/rules-unit-testing, ts-jest and configured multi-project Jest setup
- Wrote 50 Firestore security rules tests covering all 6 collections (requests, trips, users, drivers, companies, driverLocations) — verifies role-based access, field validation, state machine enforcement, and public reads (D-01)
- Wrote 20 service-level unit tests for pure calculation functions (calculateETA, calculateFare, enrichRequestWithCalculations, kmToMiles, getDistanceInKm, decodePolyline) — no emulator required

## Task Commits

1. **Task 1: Install Jest + create multi-project config** - `97ca2f2` (chore)
2. **Task 2: Firestore rules tests for 6 collections** - `6de7f78` (test) — includes `[Rule 1 - Bug]` fix (see Deviations)
3. **Task 3: Service unit tests for pure functions** - `1b853a9` (test)
4. **Lint fixes** - `6794b5b` (fix)

## Files Created/Modified
- `jest.config.js` - Multi-project Jest config: `rules` project (ts-jest, node env) and `unit` project (jest-expo, node env, moduleNameMapper stubs)
- `package.json` - Added jest devDependencies and `test`, `test:rules`, `test:unit` scripts
- `__tests__/firestore-rules/setup.ts` - Shared test environment factory (setupTestEnvironment, seedUser, seedCompany)
- `__tests__/firestore-rules/requests.rules.test.ts` - 10 tests: commuter create, driver deny, claim/accept/decline flow
- `__tests__/firestore-rules/trips.rules.test.ts` - 9 tests: create, state machine transitions, skip-state deny, admin read
- `__tests__/firestore-rules/users.rules.test.ts` - 7 tests: reads, create, immutable field enforcement, admin deactivation
- `__tests__/firestore-rules/drivers.rules.test.ts` - 6 tests: create with isVerified=false, self-verify deny, update rules
- `__tests__/firestore-rules/companies.rules.test.ts` - 8 tests: public read, admin create, owner update, delete deny
- `__tests__/firestore-rules/driverLocations.rules.test.ts` - 6 tests: create/update/delete own, deny other
- `__tests__/services/requestCalculations.test.ts` - 11 tests: calculateETA (4), calculateFare (5), enrichRequestWithCalculations (2)
- `__tests__/services/geoLocationUtils.test.ts` - 5 tests: kmToMiles (3), getDistanceInKm (2)
- `__tests__/services/decodePolyline.test.ts` - 4 tests: empty string, known polyline decode, property types, single-point
- `__tests__/__mocks__/expo-location.js` - Stub for expo-location native module (Node incompatible)
- `__tests__/__mocks__/expo-winter-runtime.js` - Stub for expo winter runtime (uses import.meta, CJS incompatible)

## Decisions Made
- Fixed Timestamp values in users.rules.test.ts: the Firestore rule checks `request.resource.data.createdAt == resource.data.createdAt`, so both sides must have the same Timestamp — using `Timestamp.now()` in both setDoc and updateDoc creates different Timestamp objects that compare as not-equal
- Added moduleNameMapper stubs for `expo-location` and `expo/src/winter` in the unit project: jest-expo's setup.js calls `require('expo/src/winter')` which pulls in `ImportMetaRegistry.ts` → `import.meta` usage → crashes Jest CJS runtime; expo-location chains through `Expo.fx.tsx` → `messageSocket.native.ts` which calls `getDevServer()` requiring a live React Native context
- Used `jest.mocked()` instead of type-cast imports to avoid ESLint `import/first` rule violation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Timestamp equality in users update tests**
- **Found during:** Task 2 (users.rules.test.ts)
- **Issue:** The rule checks `request.resource.data.createdAt == resource.data.createdAt` — tests used `Timestamp.now()` in both setup and update, which generates different Timestamp instances that Firestore rules treats as not-equal, causing `assertSucceeds` tests to fail
- **Fix:** Used `Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'))` (fixed time constant) in both setDoc and updateDoc so the equality check passes
- **Files modified:** `__tests__/firestore-rules/users.rules.test.ts`
- **Verification:** All 50 rules tests pass after fix
- **Committed in:** `6de7f78` (part of Task 2 commit)

**2. [Rule 3 - Blocking] Added expo-location and expo-winter-runtime mocks + moduleNameMapper**
- **Found during:** Task 3 (service unit tests)
- **Issue:** jest-expo preset's setup.js calls `require('expo/src/winter')` which crashes Jest CJS due to `import.meta` usage; expo-location chains through native RN modules unavailable in Node
- **Fix:** Created `__tests__/__mocks__/expo-location.js` and `expo-winter-runtime.js` stubs; added moduleNameMapper entries in jest.config.js unit project to route these imports to the stubs
- **Files modified:** `jest.config.js`, `__tests__/__mocks__/expo-location.js`, `__tests__/__mocks__/expo-winter-runtime.js`
- **Verification:** All 20 unit tests pass after fix
- **Committed in:** `1b853a9` (part of Task 3 commit)

**3. [Rule 1 - Bug] Fixed ESLint lint errors in test mock files and import ordering**
- **Found during:** Post-Task 3 lint verification
- **Issue:** `expo-location.js` used `/* eslint-env jest */` (deprecated in ESLint 9 flat config); `drivers.rules.test.ts` had unused `Timestamp` import; service tests had `import/first` violation from original post-mock import pattern
- **Fix:** Used `/* global jest */` comment; removed unused import; moved `distanceBetween` import to top and used `jest.mocked()` instead of type cast
- **Files modified:** `__tests__/__mocks__/expo-location.js`, `__tests__/firestore-rules/drivers.rules.test.ts`, `__tests__/services/requestCalculations.test.ts`, `__tests__/services/geoLocationUtils.test.ts`
- **Verification:** `npx eslint __tests__/` exits with 0 errors
- **Committed in:** `6794b5b`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 blocking, 1 bug)
**Impact on plan:** All auto-fixes required for test correctness and test runner compatibility. No scope creep.

## Issues Encountered
- jest-expo 55 + Jest 30.3.0 compatibility: ts-jest@29 supports Jest 30 via peer deps (^29 || ^30) — no version downgrade needed
- `npm ls` reported conflict for ts-jest@29 but this was a false positive; tests ran correctly with all three packages installed together

## Next Phase Readiness
- Jest infrastructure complete — Plans 02-04 can add tests immediately with `npx jest` or `npx jest --selectProjects rules/unit`
- Rules tests require `npm run emulators` to be running in a separate terminal
- Unit tests require no external dependencies — can run standalone anytime

---
*Phase: 06-security-reliability-testing*
*Completed: 2026-03-25*
