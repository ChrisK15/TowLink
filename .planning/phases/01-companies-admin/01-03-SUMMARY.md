---
phase: 01-companies-admin
plan: 03
subsystem: auth
tags: [firebase, auth, driver-signup, pre-authorization, firestore]

# Dependency graph
requires:
  - phase: 01-companies-admin/01-01
    provides: findCompanyByEmail() in companies.ts — queried before account creation
provides:
  - signUpDriverWithEmail() function in authService.ts with pre-auth email check
  - Driver user doc created with role='driver' and companyId at signup time
  - signup.tsx wired to driver-only signup path with AuthContext redirect handling
affects:
  - 02-dispatch (driver role and companyId available at auth time, no lookup needed)
  - future auth flows (pattern: check authorization before creating Firebase Auth account)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-auth check pattern: call Firestore query BEFORE createUserWithEmailAndPassword to prevent zombie auth accounts"
    - "AuthContext-driven routing: no explicit router.replace after signup — onAuthStateChanged reads role and redirects"

key-files:
  created: []
  modified:
    - services/firebase/authService.ts
    - app/(auth)/signup.tsx

key-decisions:
  - "findCompanyByEmail called BEFORE createUserWithEmailAndPassword — prevents zombie auth accounts with no Firestore doc if check fails post-creation"
  - "signUpWithEmail() left unchanged — commuter signup path still uses it via role-selection flow"
  - "No explicit router.replace in signup.tsx — AuthContext onAuthStateChanged reads role=driver from Firestore and routes to /(driver) automatically"

patterns-established:
  - "Pre-authorization pattern: query Firestore for authorization BEFORE creating Firebase Auth account"
  - "Role assignment at creation time: driver user doc includes role and companyId in the initial setDoc, not via a separate updateUserRole call"

requirements-completed: [AUTH-01, COMP-02]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 1 Plan 03: Driver Pre-Authorization Signup Summary

**Pre-authorization gate added to driver signup: email must exist in a company's authorizedEmails before Firebase Auth account is created, setting role=driver and companyId on the user doc atomically.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T20:40:15Z
- **Completed:** 2026-03-15T20:41:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `signUpDriverWithEmail()` to authService.ts — calls `findCompanyByEmail()` BEFORE `createUserWithEmailAndPassword` to prevent zombie auth accounts
- Unauthorized email throws: "This email isn't registered with a tow yard. Contact your company admin."
- Authorized driver gets user doc with `role='driver'` and `companyId` set at creation time (no separate updateUserRole call needed)
- Updated `signup.tsx` to use `signUpDriverWithEmail` and removed the `/role-selection` routing — AuthContext handles post-signup redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Add signUpDriverWithEmail() to authService.ts** - `410aa03` (feat)
2. **Task 2: Update signup.tsx to use signUpDriverWithEmail** - `9ffc5c8` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `services/firebase/authService.ts` - Added `findCompanyByEmail` import and new `signUpDriverWithEmail()` function; existing `signUpWithEmail()` unchanged
- `app/(auth)/signup.tsx` - Replaced `signUpWithEmail` call with `signUpDriverWithEmail`; removed `router.replace('/role-selection')`

## Decisions Made
- **Pre-check order is critical:** `findCompanyByEmail` must execute before `createUserWithEmailAndPassword`. If the order were reversed, a successful Firebase Auth creation followed by a failed authorization check would leave a zombie auth account with no Firestore user doc and no role.
- **signUpWithEmail() kept unchanged:** The commuter signup path (`role-selection` flow) continues to use the original function. Only the driver signup screen calls the new function.
- **AuthContext handles routing:** After `signUpDriverWithEmail` succeeds, the user doc has `role='driver'`. The existing `onAuthStateChanged` listener in AuthContext reads this and triggers navigation to `/(driver)` automatically. No explicit `router.replace` needed in the signup screen.

## Deviations from Plan

None - plan executed exactly as written.

Note: `npm run lint` reports 3 pre-existing errors in unrelated files (`commuter-login.tsx`, `app/(driver)/index.tsx`, `FindingDriverModal.tsx`) — all `react/no-unescaped-entities` issues that existed before this plan. Neither `authService.ts` nor `signup.tsx` introduced any lint errors.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AUTH-01 and COMP-02 requirements are fulfilled: unauthorized driver signup is blocked at the service level
- Driver user docs now have `companyId` at creation time — Phase 2 dispatch can query `users` by `companyId` without a lookup step
- The `signUpWithEmail` commuter path is unchanged and remains ready for the commuter auth flow

---
*Phase: 01-companies-admin*
*Completed: 2026-03-15*
