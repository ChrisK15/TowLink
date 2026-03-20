---
phase: 02-company-based-dispatch
plan: "02"
subsystem: infra
tags: [firebase-functions, firestore, geofire-common, jest, ts-jest, geohash, dispatch]

# Dependency graph
requires:
  - phase: 01-companies-admin
    provides: companies collection with geohash and serviceRadiusKm fields; drivers/{uid} with companyId, isActive, lastAssignedAt, assignmentDate fields written by initializeDriverDocument()
provides:
  - Company-based Cloud Functions dispatch engine in functions/src/index.ts
  - findNearestCompanies() helper: geohash proximity query on companies collection, filtered by serviceRadiusKm
  - findFairDriver() helper: least-recent assignment selection within a company, daily reset, proximity tiebreaker
  - matchedCompanyId field written on requests/{requestId} on successful claim
  - triedCompanyIds field written on requests/{requestId} to track exhausted companies
  - no_drivers status set on requests when all companies exhausted
  - Jest test infrastructure in functions/ with 7 passing unit tests
affects:
  - 02-company-based-dispatch (further plans in this phase)
  - 03-driver-ui (driver receives dispatch via claimedByDriverId)
  - 05-security (Firestore rules for requests matchedCompanyId and triedCompanyIds fields)

# Tech tracking
tech-stack:
  added: [jest@30.3.0, ts-jest@29.4.6, "@types/jest@30.0.0"]
  patterns:
    - Company-first dispatch routing before individual driver assignment
    - Geohash pre-filter + serviceRadiusKm secondary filter for company proximity
    - Least-recent assignment sort with daily reset for fair driver distribution
    - triedCompanyIds array on request docs to prevent infinite re-dispatch loops
    - Non-transactional fairness tracking update after transactional claim

key-files:
  created:
    - functions/jest.config.js
    - functions/src/__tests__/dispatch.test.ts
  modified:
    - functions/src/index.ts
    - functions/package.json
    - functions/tsconfig.json

key-decisions:
  - "findFairDriver uses daily reset: assignmentDate !== todayStr treats lastAssignedAt as null (UTC date boundary, documented tradeoff)"
  - "100km outer search radius in findNearestCompanies with per-company serviceRadiusKm secondary filter — generous outer radius for rural coverage"
  - "triedCompanyIds array on request document parallels notifiedDriverIds — prevents re-dispatch to exhausted companies without extra queries"
  - "Driver fairness tracking (lastAssignedAt/assignmentDate) updated non-transactionally after claim — failure means slight advantage next cycle, not data corruption"
  - "handleClaimTimeouts handles both expired claims AND declined requests (searching with non-empty notifiedDriverIds) in same scheduler run"

patterns-established:
  - "Company-first routing pattern: find nearest companies by geohash, iterate nearest-first, find fairest driver within each company"
  - "Fair distribution sort: lastAssignedAt?.toMillis() ?? 0 ascending, then distance ascending as tiebreaker"
  - "Exhaustion tracking: arrayUnion(companyId) to triedCompanyIds when no available drivers remain"

requirements-completed: [DISP-01, DISP-02, DISP-03]

# Metrics
duration: 6min
completed: "2026-03-16"
---

# Phase 02 Plan 02: Company-Based Dispatch Engine Summary

**Cloud Functions dispatch engine rewritten from global nearest-driver to company-first routing with findNearestCompanies (geohash + serviceRadiusKm filter), findFairDriver (least-recent assignment, daily reset, proximity tiebreaker), and triedCompanyIds exhaustion tracking — with Jest test infrastructure and 7 passing unit tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T18:46:18Z
- **Completed:** 2026-03-16T18:52:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced `findClosestDriver()` (global nearest driver) with `findNearestCompanies()` + `findFairDriver()` — dispatch is now company-aware
- Rewrote `matchDriverOnRequestCreate()` to route through companies nearest-first and write `matchedCompanyId` to the request document
- Rewrote `handleClaimTimeouts()` to retry within matched company first, then advance to next nearest company using `triedCompanyIds`, and set `no_drivers` when all exhausted
- Configured Jest test infrastructure (jest, ts-jest, @types/jest) with 7 passing unit tests covering all dispatch algorithm behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: Set up Jest test infrastructure and write dispatch unit tests** - `97586e7` (chore)
2. **Task 2: Rewrite Cloud Functions for company-based dispatch** - `4e309cb` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `functions/src/index.ts` - Rewritten dispatch engine: findNearestCompanies, findFairDriver, matchDriverOnRequestCreate, handleClaimTimeouts
- `functions/src/__tests__/dispatch.test.ts` - 7 unit tests covering nearest-company sort/filter, fair driver selection, daily reset, tiebreaker, exhaustion logic
- `functions/jest.config.js` - Jest configuration with ts-jest preset, node environment, tests in src/__tests__
- `functions/package.json` - Added jest/ts-jest/@types/jest devDependencies; added "test": "jest" script
- `functions/tsconfig.json` - Added "jest" to types array; added src/__tests__ to exclude (not compiled to lib/)

## Decisions Made

- **100km outer search radius:** `findNearestCompanies` uses 100km as the outer geohash search radius, with each company's own `serviceRadiusKm` as the secondary filter. Generous outer radius ensures rural coverage while company's own radius enforces its service area.
- **UTC daily reset boundary:** `assignmentDate` compared to `new Date().toISOString().split('T')[0]` uses UTC. Documented tradeoff — UTC is consistent across all Cloud Function runs and acceptable for capstone scale.
- **Non-transactional fairness update:** `lastAssignedAt` / `assignmentDate` written to driver doc after the transactional claim, not inside the transaction. If this write fails, the driver gets a slight advantage on the next assignment cycle — not a correctness issue.
- **Scheduler handles both expired and declined:** `handleClaimTimeouts` queries both `claimed` docs with expired `claimExpiresAt` AND `searching` docs with non-empty `notifiedDriverIds`. Both paths run through the same company-retry logic.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `ts-jest` warning about hybrid module kind (Node16/NodeNext) without `isolatedModules: true` — informational only, does not affect test results or compilation. Left as-is per scope boundary rule (pre-existing TypeScript configuration outside this plan's task scope).

## User Setup Required

None — no external service configuration required. Cloud Functions will need deployment (`firebase deploy --only functions`) before changes take effect in production.

## Next Phase Readiness

- Dispatch engine is ready — when a commuter creates a request, it will route to nearest company and assign to fairest driver
- `matchedCompanyId` and `triedCompanyIds` fields will appear on request documents automatically after first dispatch
- `no_drivers` status is now a valid request terminal state — commuter UI (Phase 3) should handle it
- Driver document must have `companyId`, `isActive`, `lastAssignedAt`, `assignmentDate` fields — `initializeDriverDocument()` in `app/(driver)/index.tsx` already writes all of these (confirmed during execution)
- Remaining concern: `acceptClaimedRequest()` in `services/firebase/firestore.ts` should copy `matchedCompanyId` from request to trip as `companyId` — needed for Admin Jobs tab (Pitfall 6 from RESEARCH.md); out of scope for this plan

---
*Phase: 02-company-based-dispatch*
*Completed: 2026-03-16*
