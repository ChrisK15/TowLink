---
phase: 02-company-based-dispatch
plan: 01
subsystem: database
tags: [firestore, typescript, react-native, dispatch, driver, request, trip]

# Dependency graph
requires:
  - phase: 01-companies-admin
    provides: "companyId exposed in AuthContext; companies collection and driver-company association established"
provides:
  - "Driver interface with companyId, isActive, lastAssignedAt, assignmentDate fields"
  - "Request interface with matchedCompanyId, triedCompanyIds, and no_drivers status"
  - "initializeDriverDocument writes dispatch fields to Firestore on new docs and backfills existing"
  - "acceptRequest and acceptClaimedRequest propagate matchedCompanyId to trip.companyId"
  - "FindingDriverModal handles no_drivers status with fade transition and Try Again button"
affects:
  - 02-02 (Cloud Functions dispatch — reads Driver.companyId, Driver.lastAssignedAt, Driver.assignmentDate)
  - 02-03 (Admin jobs tab — trips.companyId populated by acceptClaimedRequest)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional Firestore backfill: check field existence on getDoc, run updateDoc only if missing"
    - "Terminal status shortcut: no_drivers cancel button calls onCancel() directly, skipping cancelRequest()"

key-files:
  created: []
  modified:
    - types/models.ts
    - app/(driver)/index.tsx
    - services/firebase/firestore.ts
    - components/FindingDriverModal.tsx

key-decisions:
  - "initializeDriverDocument backfills companyId on existing driver docs missing the field — prevents Cloud Functions from ignoring pre-existing drivers when Phase 2 dispatch queries by companyId"
  - "Try Again button calls onCancel() directly (not cancelRequest()) — no_drivers is a terminal status set by Cloud Functions; there is nothing left to cancel on the request document"
  - "contentOpacity Animated.Value drives a 200ms fade-out/fade-in transition when no_drivers state is entered — keeps modal content from snapping abruptly"

patterns-established:
  - "Terminal status handling: for statuses that Cloud Functions terminate (no_drivers), the app-side dismiss button must NOT call cancelRequest() to avoid Firestore permission errors on already-terminal documents"

requirements-completed: [DISP-01, DISP-03]

# Metrics
duration: 7min
completed: 2026-03-16
---

# Phase 2 Plan 01: App-Side Dispatch Data Model Summary

**TypeScript interfaces, driver doc initialization, and FindingDriverModal updated for company-based dispatch — companyId flows from AuthContext to Firestore, matchedCompanyId propagates to trips, and no_drivers status renders a fade-in error state with Try Again.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-16T18:46:10Z
- **Completed:** 2026-03-16T18:52:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Updated Driver, Request, and Trip TypeScript interfaces with all company dispatch fields (companyId, isActive, lastAssignedAt, assignmentDate, matchedCompanyId, triedCompanyIds, no_drivers status)
- Fixed initializeDriverDocument to write dispatch fields on new driver docs and backfill existing docs missing companyId — ensures Cloud Functions can query all drivers by company
- Both acceptRequest and acceptClaimedRequest now propagate matchedCompanyId from the request to trip.companyId, enabling the Admin Jobs tab to filter by company
- FindingDriverModal shows a warning icon, "No Drivers Available" heading, and "Try Again" button when request.status is no_drivers, with a 200ms fade transition

## Task Commits

Each task was committed atomically:

1. **Task 1: Update data model and service layer for dispatch fields** - `825d13e` (feat)
2. **Task 2: Add no_drivers status handler to FindingDriverModal** - `0b3cb34` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `types/models.ts` - Added dispatch fields to Driver, no_drivers to Request status union, matchedCompanyId/triedCompanyIds to Request, Trip.companyId was already present
- `app/(driver)/index.tsx` - Added updateDoc import, destructured companyId from useAuth, updated initializeDriverDocument to write and backfill dispatch fields
- `services/firebase/firestore.ts` - Added companyId: requestData?.matchedCompanyId to tripData in both acceptRequest and acceptClaimedRequest
- `components/FindingDriverModal.tsx` - Added isNoDrivers derived bool, contentOpacity animation, no_drivers content branch, conditional Try Again button, noDriversIcon style

## Decisions Made

- initializeDriverDocument backfills companyId on existing driver docs: without this, drivers who registered before Phase 2 would be invisible to Cloud Functions querying by companyId
- Try Again button calls onCancel() directly (not cancelRequest()): no_drivers is a terminal Firestore status written by Cloud Functions — calling cancelRequest() on it would fail or be a no-op
- 200ms fade transition (out then in) on content area when no_drivers status is entered: avoids abrupt content snap per UI-SPEC interaction contract

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing unescaped apostrophe ESLint error in driver screen**
- **Found during:** Task 1 verification (ESLint on app/(driver)/index.tsx)
- **Issue:** Line 354 had `You're` with a literal apostrophe, triggering react/no-unescaped-entities. This was a pre-existing error not introduced by Task 1 changes. Plan acceptance criteria required ESLint to pass on all three files.
- **Fix:** Replaced `You're` with `You&apos;re` in the info banner Text element
- **Files modified:** app/(driver)/index.tsx
- **Verification:** ESLint exits 0 on all modified files
- **Committed in:** 825d13e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking lint error)
**Impact on plan:** Necessary to satisfy plan acceptance criteria. No scope creep — single character fix.

## Issues Encountered

None — plan executed with one pre-existing lint fix required for acceptance criteria.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- App-side data model is complete and ready for Cloud Functions dispatch (Plan 02)
- Cloud Functions can now query drivers collection by companyId and update lastAssignedAt/assignmentDate
- Commuter UI handles no_drivers gracefully — dispatched by Cloud Functions writing no_drivers status
- Admin Jobs tab will receive companyId on new trips created after this plan executes

---
*Phase: 02-company-based-dispatch*
*Completed: 2026-03-16*
