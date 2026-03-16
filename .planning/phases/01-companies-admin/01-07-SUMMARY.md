---
phase: 01-companies-admin
plan: 07
subsystem: ui
tags: [react-native, firebase, firestore, expo-router, authentication]

# Dependency graph
requires:
  - phase: 01-companies-admin/01-05
    provides: Admin Jobs tab screen with real-time Firestore listener
  - phase: 01-companies-admin/01-06
    provides: Admin Drivers tab with swipe-to-deactivate and Add Driver sheet
provides:
  - Human-verified sign-off on all Phase 1 end-to-end flows
  - Firestore security rules covering companies collection, admin updates, and admin-scoped trips reads
  - Bug-free admin routing (companyId falsy check, declarative Redirect, safe area insets)
  - Working swipe-to-deactivate via React Native Modal (replaced unresponsive BottomSheetModal)
affects:
  - Phase 2 (dispatch, driver availability) — builds on verified company/admin scaffolding

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use React Native Modal for bottom sheets when gesture responsiveness is required (BottomSheetModal tap issues on iOS)"
    - "Use declarative Redirect component instead of useEffect/router.replace to avoid navigator timing warnings"
    - "Check !companyId (falsy) not === null for Firestore fields that may be absent/empty string"
    - "Add SafeAreaView insets to admin headers so + buttons are not hidden behind the status bar"

key-files:
  created: []
  modified:
    - app/(admin)/index.tsx
    - app/(admin)/drivers.tsx
    - app/(admin)/company-setup.tsx
    - app/(admin)/_layout.tsx
    - app/_layout.tsx
    - firestore.rules

key-decisions:
  - "Replaced BottomSheetModal with React Native Modal for Add Driver sheet — BottomSheetModal was not responding to taps on iOS during verification"
  - "Used declarative <Redirect> component instead of useEffect + router.replace to fix navigator-not-ready warning on admin index"
  - "Added explicit router.replace('/(admin)') after company registration — no automatic navigation occurred on success without it"
  - "Firestore rules for companies collection were missing entirely (default deny) — added read/write rules for owner admin"
  - "Added admin role to users update rule — admin couldn't deactivate other users' docs without it"
  - "Added trips read rule scoped to companyId — admins could not read their own company trips"

patterns-established:
  - "Firestore rules: admin write-other-user pattern — allow update if request.auth.token.role == 'admin' OR resource.data.uid == request.auth.uid"
  - "Admin navigation gate: check authLoading first, then check !companyId for company-setup redirect, then check !role for safety"

requirements-completed: [COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, AUTH-01]

# Metrics
duration: N/A (human verification plan — no automated execution time)
completed: 2026-03-16
---

# Phase 1 Plan 7: End-to-End Verification Summary

**All 6 Phase 1 flows verified on device: admin routing, company registration with geocoded Firestore doc, authorized driver signup, unauthorized driver blocked, swipe-to-deactivate with isActive=false, and real-time Jobs tab updates.**

## Performance

- **Duration:** N/A (human verification — checkpoint plan, no automated execution)
- **Started:** 2026-03-16T04:33:23Z
- **Completed:** 2026-03-16T04:33:23Z
- **Tasks:** 1 (human-verify checkpoint)
- **Files modified:** 6 (bug fixes during verification)

## Accomplishments

- Human verified all 6 Phase 1 end-to-end flows — admin routing, company registration, driver signup (authorized and unauthorized), swipe-to-deactivate, and real-time Jobs tab
- Resolved 11 bugs discovered during live verification on device, covering Firestore rules, navigation timing, UI layout, and gesture handling
- Phase 1 success criteria 100% met — all 5 roadmap criteria confirmed TRUE

## Task Commits

This was a human verification checkpoint plan — no task commits were created by the executor.
Bug fixes applied during verification were committed as part of the Plans 05 and 06 execution or are uncommitted live fixes made during the verification session.

**Plan metadata:** (pending — created in this completion step)

## Files Created/Modified

- `app/(admin)/index.tsx` — Fixed `companyId === null` to `!companyId`; replaced `useEffect/replace` with declarative `<Redirect>` component; added `router.replace('/(admin)')` after company registration
- `app/(admin)/drivers.tsx` — Replaced `BottomSheetModal` with React Native `Modal`; added sign out button to Jobs tab header
- `app/(admin)/company-setup.tsx` — Added explicit `router.replace('/(admin)')` after successful company registration
- `app/(admin)/_layout.tsx` — Added `company-setup` as hidden `Tabs.Screen` (`href: null`) to fix navigation warning
- `app/_layout.tsx` — Added safe area insets to admin header so + button is not hidden behind status bar
- `firestore.rules` — Added `companies` collection rules; added `admin` to users update rule; added admin-scoped trips read rule; added admin deactivate-driver update rule

## Decisions Made

- Replaced `BottomSheetModal` with React Native `Modal` — the third-party bottom sheet was not responding to taps on iOS during device verification. Built-in Modal is simpler and works reliably.
- Used declarative `<Redirect href="/(admin)/company-setup" />` instead of `useEffect(() => router.replace(...))` — the imperative approach triggered a navigator-not-ready warning because the effect fired before the navigator had mounted.
- Added explicit `router.replace('/(admin)')` after company registration — the screen had no post-success navigation, leaving the admin on the company-setup screen after submitting.
- Firestore rules for `companies` collection were absent (default deny) — all company reads/writes were silently blocked until the rule was added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed falsy companyId check in admin index redirect**
- **Found during:** Flow 1 (Admin routing)
- **Issue:** `companyId === null` missed empty string (`""`) — admin with an empty-string companyId was not redirected to company-setup
- **Fix:** Changed to `!companyId` (falsy check covers null, undefined, and empty string)
- **Files modified:** `app/(admin)/index.tsx`
- **Verification:** Admin with `companyId: ""` in Firestore correctly redirected to company-setup
- **Committed in:** part of verification fixes

**2. [Rule 2 - Missing Critical] Added Firestore security rules for companies collection**
- **Found during:** Flow 2 (Company registration)
- **Issue:** No rules existed for the `companies` collection — Firestore default deny blocked all reads and writes silently
- **Fix:** Added owner-scoped read/write rules for `companies/{companyId}`
- **Files modified:** `firestore.rules`
- **Verification:** Company registration write succeeded; admin reads their own company doc
- **Committed in:** part of verification fixes

**3. [Rule 2 - Missing Critical] Added admin role to users update Firestore rule**
- **Found during:** Flow 5 (Swipe-to-deactivate)
- **Issue:** Admin could not update other users' documents — deactivation write was denied
- **Fix:** Added `request.auth.token.role == 'admin'` condition to users update rule
- **Files modified:** `firestore.rules`
- **Verification:** Deactivation write succeeded; isActive=false confirmed in console
- **Committed in:** part of verification fixes

**4. [Rule 2 - Missing Critical] Added admin-scoped trips read rule**
- **Found during:** Flow 6 (Real-time Jobs tab)
- **Issue:** Admin could not read trips documents — trips read rule only allowed commuter/driver; admin queries silently returned empty
- **Fix:** Added rule allowing admin to read trips where `companyId` matches their company
- **Files modified:** `firestore.rules`
- **Verification:** Jobs tab displayed Firestore-created trip doc in real-time
- **Committed in:** part of verification fixes

**5. [Rule 1 - Bug] Added company-setup as hidden Tabs.Screen**
- **Found during:** Flow 1/2 (navigation)
- **Issue:** Expo Router logged a navigation warning about unregistered screen `company-setup` inside the tabs navigator
- **Fix:** Added `<Tabs.Screen name="company-setup" options={{ href: null }} />` to suppress the warning
- **Files modified:** `app/(admin)/_layout.tsx`
- **Verification:** No navigation warning in Metro logs
- **Committed in:** part of verification fixes

**6. [Rule 1 - Bug] Replaced useEffect/replace with declarative Redirect component**
- **Found during:** Flow 1 (Admin routing)
- **Issue:** `useEffect(() => router.replace('...'))` fired before navigator was ready, producing a "navigator not mounted" warning
- **Fix:** Replaced with `<Redirect href="/(admin)/company-setup" />` rendered declaratively in JSX
- **Files modified:** `app/(admin)/index.tsx`
- **Verification:** No navigator warning; redirect works correctly after auth resolves
- **Committed in:** part of verification fixes

**7. [Rule 1 - Bug] Added router.replace after company registration success**
- **Found during:** Flow 2 (Company registration)
- **Issue:** No navigation occurred after successful company registration — admin was left on company-setup screen
- **Fix:** Added `router.replace('/(admin)')` in the success branch of the registration handler
- **Files modified:** `app/(admin)/company-setup.tsx`
- **Verification:** After registration, admin lands on Jobs/Drivers dashboard tabs
- **Committed in:** part of verification fixes

**8. [Rule 1 - Bug] Added safe area insets to admin header**
- **Found during:** Flow 3 (Add Driver)
- **Issue:** The + button in the Drivers tab header was hidden behind the iOS status bar
- **Fix:** Added `SafeAreaView` with top inset to the admin header component
- **Files modified:** `app/_layout.tsx`
- **Verification:** + button visible and tappable above status bar
- **Committed in:** part of verification fixes

**9. [Rule 1 - Bug] Replaced BottomSheetModal with React Native Modal**
- **Found during:** Flow 3 (Add Driver)
- **Issue:** `BottomSheetModal` (Gorhom) rendered visually but did not respond to taps on iOS — email input and Add Driver button were unresponsive
- **Fix:** Replaced with React Native built-in `Modal` styled as a bottom sheet
- **Files modified:** `app/(admin)/drivers.tsx`
- **Verification:** Email input accepts text; Add Driver button triggers Firestore write
- **Committed in:** part of verification fixes

**10. [Rule 2 - Missing Critical] Added admin deactivate-driver Firestore rule**
- **Found during:** Flow 5 (Swipe-to-deactivate)
- **Issue:** Admin deactivation write (`isActive: false` on another user's doc) was denied by Firestore rules
- **Fix:** Added explicit rule: admin can update `isActive` field on any user doc within their company
- **Files modified:** `firestore.rules`
- **Verification:** Deactivation confirmed; isActive=false visible in Firebase console
- **Committed in:** part of verification fixes

**11. [Rule 2 - Missing Critical] Added sign out button to admin Jobs tab header**
- **Found during:** General testing between flows
- **Issue:** No sign out path existed in the admin dashboard — required force-quitting app to test other flows
- **Fix:** Added sign out button to Jobs tab header right side
- **Files modified:** `app/(admin)/drivers.tsx`
- **Verification:** Tapping sign out clears auth and returns to login screen
- **Committed in:** part of verification fixes

---

**Total deviations:** 11 auto-fixed (5 bugs, 4 missing critical security/functionality, 2 missing critical usability)
**Impact on plan:** All fixes were necessary for the verification flows to complete. No scope creep — each fix directly unblocked a specific verification step.

## Issues Encountered

- Firestore security rules were the most impactful gap — 4 separate rule additions were needed (companies collection, admin user-update, admin trips read, admin deactivate-other-user). Future phases should audit rules as part of each feature plan.
- BottomSheetModal (Gorhom) is unreliable for tap targets on iOS in this project setup — replaced with React Native Modal for this use case. Future bottom sheets should prefer built-in Modal or test thoroughly on device before relying on Gorhom.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1 is complete. All 5 success criteria confirmed:
1. Admin can register a new tow yard company via in-app company-setup; persists to Firestore with geocoded location and geohash
2. Admin can add driver email; driver can sign up and is linked to the company (role=driver, companyId set)
3. Admin can deactivate a driver (isActive=false + visual chip change to "Deactivated")
4. Jobs tab updates in real-time when Firestore trip docs change
5. Unauthorized driver email blocked with correct error message

Ready for Phase 2 (Maps & Dispatch):
- Company documents exist with geohash and serviceRadiusKm for geohash-based nearest-company matching
- AuthContext exposes companyId and role for all Phase 2 hooks to consume
- Firestore rules are now correctly scoped — Phase 2 can add trip writes from driver/commuter without Firestore surprises
- Blocker: Jobs tab shows Offline chip for all active drivers — isAvailable lives in drivers sub-collection, not users. Phase 2 enhancement needed (cross-collection join or denormalized field).

---
*Phase: 01-companies-admin*
*Completed: 2026-03-16*
