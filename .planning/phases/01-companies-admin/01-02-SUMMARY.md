---
phase: 01-companies-admin
plan: 02
subsystem: auth
tags: [auth, expo-router, firebase, react-native, routing, context]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Extended User interface with admin role and companyId fields in types/models.ts"
provides:
  - AuthContextType.role includes 'admin' in the union type
  - AuthContextType.companyId: string | null exposed to all consumers
  - onAuthStateChanged reads and sets companyId for admin/driver/commuter roles
  - refreshRole() reads and sets companyId alongside role
  - RootLayoutNav routes role='admin' to /(admin) before null fallthrough
  - (admin) registered as Stack.Screen in root layout with headerShown: false
affects: [01-03, 01-04, 01-05, phase-02-dispatch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin role routing: add redirect case BEFORE null fallthrough in RootLayoutNav, AND register Stack.Screen — both are required to avoid 'Unmatched route' at runtime"
    - "companyId in AuthContext: read alongside role in both onAuthStateChanged and refreshRole so hooks consuming companyId always receive the correct value"

key-files:
  created: []
  modified:
    - context/auth-context.tsx
    - app/_layout.tsx

key-decisions:
  - "Admin role is added to role union type in AuthContext only — updateUserRole() is NOT extended to accept 'admin' (privilege escalation risk: admin role is set only via manual Firestore seed)"
  - "companyId destructured in RootLayoutNav useAuth() call for consistency with updated context, even though routing logic only needs role"

patterns-established:
  - "Role routing order: !user → commuter → driver → admin → null — admin must precede null to prevent fallthrough to commuter login"

requirements-completed: [AUTH-01, COMP-04]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 1 Plan 02: Admin Role Auth Routing Summary

**admin role wired into AuthContext (companyId exposed, role union extended) and root layout (/(admin) redirect + Stack.Screen registration) so admin users land on the admin dashboard instead of falling through to commuter login**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T20:40:15Z
- **Completed:** 2026-03-15T20:41:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended `AuthContextType` with `companyId: string | null` and `'admin'` in role union — both `onAuthStateChanged` and `refreshRole()` now read and set `companyId`
- Added `role === 'admin'` redirect to `/(admin)` in `RootLayoutNav` before the null fallthrough that was previously capturing admin logins
- Registered `(admin)` as a `Stack.Screen` with `headerShown: false` in the root `Stack` navigator — prevents Expo Router "Unmatched route" error at runtime

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AuthContext with admin role and companyId** - `cd394da` (feat)
2. **Task 2: Add admin redirect and Stack.Screen to app/_layout.tsx** - `d327fb9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `context/auth-context.tsx` - Added 'admin' to role union, added companyId state + interface field, extended onAuthStateChanged and refreshRole to read/set companyId, added companyId to Provider value
- `app/_layout.tsx` - Added role === 'admin' redirect to /(admin), registered (admin) Stack.Screen, destructured companyId from useAuth()

## Decisions Made
- **No admin in updateUserRole():** The plan explicitly prohibits adding 'admin' to `updateUserRole()` in `authService.ts` — admin role is set only via manual Firestore seed (privilege escalation risk). This boundary was maintained exactly as specified.
- **companyId in RootLayoutNav destructure:** Added `companyId` to the `useAuth()` destructure in `RootLayoutNav` for consistency with the updated context type, even though the routing logic only needs `role`. Keeps the destructure aligned with what context exposes.

## Deviations from Plan

None - plan executed exactly as written. The 3 pre-existing lint errors (`react/no-unescaped-entities` in unrelated files) remain pre-existing out-of-scope items.

## Issues Encountered
- Pre-existing lint errors in `commuter-login.tsx`, `driver/index.tsx`, `FindingDriverModal.tsx` still present. These are not caused by this plan's changes and are deferred.

## User Setup Required
None - no external service configuration required for this plan.

The admin route group (`app/(admin)/`) does not exist yet — it will be created in Plan 04 (Admin Dashboard screens). Until then, the `/(admin)` redirect will result in an Expo Router "Unmatched route" error if triggered. This is expected: the routing plumbing is in place, the screens come next.

## Next Phase Readiness
- All consumers of `useAuth()` can now read `companyId` — admin dashboard hooks (`useCompanyJobs`, `useCompanyDrivers`) are unblocked
- Admin users will now route correctly to `/(admin)` on login once the admin screen group is created in Plan 04
- Pre-existing lint errors in unrelated files should be resolved before phase gate review

## Self-Check: PASSED

- FOUND: context/auth-context.tsx
- FOUND: app/_layout.tsx
- FOUND: commit cd394da (Task 1)
- FOUND: commit d327fb9 (Task 2)

---
*Phase: 01-companies-admin*
*Completed: 2026-03-15*
