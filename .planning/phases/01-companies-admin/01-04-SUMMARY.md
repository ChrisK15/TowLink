---
phase: 01-companies-admin
plan: 04
subsystem: ui
tags: [react-native, expo-router, firestore, hooks, real-time, admin]

# Dependency graph
requires:
  - phase: 01-companies-admin/01-01
    provides: companies.ts service with listenToCompanyJobs, listenToCompanyDrivers, createCompany
  - phase: 01-companies-admin/01-02
    provides: AuthContext with companyId and refreshRole
  - phase: 01-companies-admin/01-03
    provides: driver signup linking to company via authorizedEmails
provides:
  - useCompanyJobs(companyId) hook — real-time jobs listener returning { jobs, loading, error }
  - useCompanyDrivers(companyId) hook — real-time drivers listener returning { drivers, loading, error }
  - app/(admin) Expo Router group — _layout.tsx with Jobs and Drivers tabs
  - app/(admin)/index.tsx — Jobs tab stub with null companyId redirect guard
  - app/(admin)/drivers.tsx — Drivers tab stub
  - app/(admin)/company-setup.tsx — company registration screen satisfying COMP-01
affects: [01-05, 01-06, phase-2-dispatch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useEffect real-time subscription hook: companyId null guard → setLoading(false) early return; listener → setState + setLoading(false); cleanup return () => unsubscribe()"
    - "Admin tab layout: Tabs with briefcase.fill (Jobs) and person.2.fill (Drivers) following commuter layout pattern"
    - "Inline form validation: validate() returns boolean, per-field error state, checked on submit"

key-files:
  created:
    - hooks/use-company-jobs.ts
    - hooks/use-company-drivers.ts
    - app/(admin)/_layout.tsx
    - app/(admin)/index.tsx
    - app/(admin)/drivers.tsx
    - app/(admin)/company-setup.tsx
  modified: []

key-decisions:
  - "Admin index.tsx reads authLoading (not just loading from useCompanyJobs) before triggering company-setup redirect — prevents premature redirect during initial auth resolution"
  - "company-setup.tsx uses ScrollView with keyboardShouldPersistTaps=handled — form usability on small screens"
  - "Stub screens import their respective hooks so the full import chain is validated by lint before Plans 05/06 fill in full UI"

patterns-established:
  - "Real-time hook pattern: useEffect with companyId null guard, Firestore listener, cleanup unsubscribe"
  - "Admin form pattern: per-field useState errors, validate() on submit, setLoading around async call, setSubmitError in catch"

requirements-completed: [COMP-01, COMP-04, COMP-05]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 01 Plan 04: Companies Admin — Hooks, Admin Route Group & Company Setup Summary

**Real-time useCompanyJobs and useCompanyDrivers hooks, /(admin) Expo Router group with Jobs/Drivers tabs, and company registration screen wiring createCompany() to AuthContext refresh**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T20:44:04Z
- **Completed:** 2026-03-15T20:47:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created two real-time Firestore hooks (useCompanyJobs, useCompanyDrivers) following the established use-active-trip.ts pattern with proper cleanup on unmount
- Scaffolded the app/(admin) Expo Router group with a tab layout (Jobs + Drivers tabs, briefcase.fill and person.2.fill icons) and stub screens that validate the full import chain via lint
- Built company-setup.tsx: a three-field form (name, address, serviceRadiusKm) that calls createCompany(), writes companyId to the admin's user doc, and calls refreshRole() to propagate the change to AuthContext without a re-login

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCompanyJobs and useCompanyDrivers hooks** - `eb9308a` (feat)
2. **Task 2: Scaffold app/(admin) route group with tab layout and stub screens** - `d7692d5` (feat)
3. **Task 3: Build company registration screen app/(admin)/company-setup.tsx** - `9612b91` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `hooks/use-company-jobs.ts` — Real-time jobs hook; wraps listenToCompanyJobs, returns { jobs, loading, error }, unsubscribes on unmount
- `hooks/use-company-drivers.ts` — Real-time drivers hook; wraps listenToCompanyDrivers, returns { drivers, loading, error }, unsubscribes on unmount
- `app/(admin)/_layout.tsx` — Admin tab layout: Jobs (briefcase.fill) and Drivers (person.2.fill) tabs
- `app/(admin)/index.tsx` — Jobs tab stub; uses useCompanyJobs; redirects to /(admin)/company-setup when companyId is null and auth is not loading
- `app/(admin)/drivers.tsx` — Drivers tab stub; uses useCompanyDrivers
- `app/(admin)/company-setup.tsx` — Company registration screen: name/address/serviceRadiusKm form with inline validation, createCompany() call, updateDoc to write companyId, refreshRole() to update AuthContext

## Decisions Made
- Admin index.tsx checks `authLoading` before triggering the company-setup redirect — this prevents a premature redirect while Firebase Auth is still resolving the initial session, which would otherwise fire before companyId is populated
- ScrollView with `keyboardShouldPersistTaps="handled"` on company-setup.tsx ensures taps on the submit button work while the keyboard is open
- Stub screens intentionally import hooks to validate the full import chain through lint, catching any type or path errors before Plans 05/06 replace the screen bodies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Escaped unescaped apostrophe in JSX string**
- **Found during:** Task 3 (company-setup.tsx)
- **Issue:** `company's location` in a JSX Text element triggered react/no-unescaped-entities lint error
- **Fix:** Changed to `company&apos;s location`
- **Files modified:** app/(admin)/company-setup.tsx
- **Verification:** npx eslint on the file exits 0
- **Committed in:** 9612b91 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 lint bug)
**Impact on plan:** Trivial apostrophe escape. No scope creep.

## Issues Encountered
- Three pre-existing lint errors in commuter-login.tsx, driver/index.tsx, and FindingDriverModal.tsx (unescaped entities) were logged but not fixed — out of scope per deviation rules. New files all pass lint cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 05 and 06 can now build the full Jobs and Drivers screen bodies — hooks exist, route group exists, import chains validated
- An admin with no companyId who navigates to /(admin) will be redirected to company-setup where they can register their tow yard
- COMP-01 (admin can register a company from within the app) is satisfied by company-setup.tsx
- COMP-04 (real-time jobs listener) and COMP-05 (real-time drivers listener) are satisfied by the two hooks

---
*Phase: 01-companies-admin*
*Completed: 2026-03-15*

## Self-Check: PASSED

All 6 files created confirmed on disk. All 3 task commits (eb9308a, d7692d5, 9612b91) confirmed in git log.
