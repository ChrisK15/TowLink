---
phase: 01-companies-admin
verified: 2026-03-15T21:45:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Admin logs in with seeded role='admin' Firestore doc and is redirected to /(admin)"
    expected: "RootLayoutNav reads role='admin' from Firestore and renders <Redirect href='/(admin)' />"
    why_human: "Requires live Firebase Auth session and Firestore user doc with role='admin'"
  - test: "Admin fills in Company Name, Address, Service Radius and taps Register Company"
    expected: "Loading indicator appears, Firestore 'companies' collection gains a new doc with name, address, location {latitude, longitude}, geohash (non-empty string), serviceRadiusKm, authorizedEmails: [], ownerUid, createdAt. Admin is navigated to Jobs/Drivers tabs."
    why_human: "Requires live Google Maps geocoding API call and Firestore write"
  - test: "Admin taps '+', enters a driver email, taps 'Add Driver', then driver signs up with that email"
    expected: "Success banner shown in Admin Drivers tab; driver can complete signup; Firestore users/{uid} doc has role='driver' and correct companyId"
    why_human: "Multi-step flow requiring two accounts; Firestore write verification in console"
  - test: "Driver attempts signup with an email NOT in any company's authorizedEmails"
    expected: "Signup blocked with exact error: 'This email isn't registered with a tow yard. Contact your company admin.' No new Firebase Auth account created."
    why_human: "Requires live Firebase Auth; Firebase console verification that no account was created"
  - test: "Admin swipes left on an active driver row, taps Deactivate Driver, confirms"
    expected: "Alert with title 'Deactivate Driver', body 'This driver will no longer receive job assignments. You can reactivate them later.', buttons 'Keep Driver' (cancel) and 'Deactivate Driver' (destructive). On confirm: row dims to opacity 0.5, chip changes to 'Deactivated'. Firestore users/{driverUid}.isActive === false."
    why_human: "Requires swipe gesture on device; Firestore write verification in console"
  - test: "Admin is on Jobs tab, a new trip doc is added to Firestore with the admin's companyId and status='en_route'"
    expected: "New job row appears in FlatList without any user action. Changing status to 'arrived' in Firestore console updates the badge label without refresh."
    why_human: "Real-time behavior requires live Firestore listener; cannot be verified programmatically"
---

# Phase 1: Companies & Admin Verification Report

**Phase Goal:** Tow yard admins can register their company and manage their driver roster; drivers authenticate via company email and are automatically linked to their tow yard.
**Verified:** 2026-03-15T21:45:00Z
**Status:** PASSED (automated checks) — 6 items require human verification (already completed per Plan 07 SUMMARY)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin can register a new tow yard company with name, address, and service area and see it persisted in Firestore | VERIFIED | `app/(admin)/company-setup.tsx` — three-field form (name, address, serviceRadiusKm) calls `createCompany()`, writes companyId to user doc, calls `refreshRole()`, then `router.replace('/(admin)')`. `services/firebase/companies.ts:createCompany()` geocodes address, stores `location`, `geohash`, `serviceRadiusKm`, `authorizedEmails: []`, `ownerUid`, `createdAt`. |
| 2 | Admin can add a driver by company email address and that driver account is linked to the company | VERIFIED | `app/(admin)/drivers.tsx` — Add Driver Modal calls `addAuthorizedEmail(companyId, email)`. `services/firebase/authService.ts:signUpDriverWithEmail()` calls `findCompanyByEmail()` before account creation, then `setDoc` with `role: 'driver', companyId: company.id, isActive: true`. |
| 3 | Admin can deactivate a driver so they no longer appear as available for dispatch | VERIFIED | `app/(admin)/drivers.tsx` — `Swipeable` renders red action cell for active drivers; `handleDeactivatePress` shows `Alert.alert` with exact UI-SPEC copy then calls `deactivateDriver(driverId)`. `services/firebase/companies.ts:deactivateDriver()` sets `isActive: false` on `users/{driverUid}`. Deactivated rows shown at `opacity: 0.5` with "Deactivated" chip and are NOT wrapped in Swipeable. |
| 4 | Admin dashboard shows all active jobs and their statuses updating in real-time | VERIFIED | `app/(admin)/index.tsx` — `FlatList` powered by `useCompanyJobs(companyId)`. Hook calls `listenToCompanyJobs()` which uses `onSnapshot` (real-time). Status badge renders per UI-SPEC color map (`STATUS_CONFIG`). Empty state shows "No active jobs". Loading shows `ActivityIndicator`. |
| 5 | Driver who logs in with their company-issued email is automatically associated with the correct tow yard — no manual company selection | VERIFIED | `signUpDriverWithEmail()` calls `findCompanyByEmail(email)` BEFORE `createUserWithEmailAndPassword`, sets `companyId: company.id` on user doc at creation time. `AuthContext.onAuthStateChanged` reads `companyId` from Firestore and sets it in context. `RootLayoutNav` routes `role='driver'` to `/(driver)` automatically — no manual selection step exists. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `types/models.ts` | Company interface, admin role on User, companyId on User, isActive on User, companyId on Trip | VERIFIED | Line 5: `'admin'` in User.role union; Line 6: `companyId?: string`; Line 10: `isActive?: boolean`; Line 101: Trip.`companyId?: string`; Lines 104-114: `export interface Company` with all required fields |
| `services/firebase/companies.ts` | 6 exported functions | VERIFIED | All 6 present: `createCompany`, `addAuthorizedEmail`, `findCompanyByEmail`, `deactivateDriver`, `listenToCompanyJobs`, `listenToCompanyDrivers`. Each substantive — no stubs, real Firestore ops. |
| `context/auth-context.tsx` | admin in role union, companyId exposed, both handlers updated | VERIFIED | Line 9: `'admin'` in role union; Line 10: `companyId: string \| null`; Line 38: `setCompanyId(data.companyId ?? null)` in onAuthStateChanged; Line 73: same in refreshRole; Line 86: `companyId` in Provider value |
| `app/_layout.tsx` | Admin redirect before null fallthrough, (admin) Stack.Screen | VERIFIED | Line 38: `if (role === 'admin') return <Redirect href="/(admin)" />;` before Line 41 null redirect; Line 64: `<Stack.Screen name="(admin)" options={{ headerShown: false }} />` |
| `services/firebase/authService.ts` | signUpDriverWithEmail with pre-auth check | VERIFIED | Lines 90-141: `signUpDriverWithEmail()` calls `findCompanyByEmail(email)` at Line 95 before `createUserWithEmailAndPassword` at Line 104. Error: "This email isn't registered with a tow yard. Contact your company admin." |
| `app/(auth)/signup.tsx` | Uses signUpDriverWithEmail, no /role-selection redirect | VERIFIED | Line 1: `import { signUpDriverWithEmail }`. Line 50: called in `handleSignup`. No `router.replace('/role-selection')` present. |
| `hooks/use-company-jobs.ts` | Real-time hook returning { jobs, loading, error } with cleanup | VERIFIED | Follows `use-active-trip.ts` pattern exactly. Null companyId guard. `return () => unsubscribe()` cleanup. |
| `hooks/use-company-drivers.ts` | Real-time hook returning { drivers, loading, error } with cleanup | VERIFIED | Same pattern as jobs hook. |
| `app/(admin)/_layout.tsx` | Two tabs: Jobs (briefcase.fill) + Drivers (person.2.fill), company-setup hidden | VERIFIED | Both Tabs.Screen present with correct icon names. `company-setup` registered with `href: null` (Plan 07 fix). |
| `app/(admin)/index.tsx` | Full Jobs screen: FlatList, status badges, empty state, loading, !companyId redirect | VERIFIED | `FlatList` + `STATUS_CONFIG` with all 5 status colors. "No active jobs" empty state. `ActivityIndicator` loading. `<Redirect href="/(admin)/company-setup" />` for falsy companyId (declarative, not useEffect). Sign out button present. |
| `app/(admin)/drivers.tsx` | Full Drivers screen: Swipeable rows, Alert confirmation, Add Driver Modal, success banner | VERIFIED | `Swipeable` from gesture-handler on active rows. `Alert.alert` with exact copy. React Native `Modal` (not BottomSheetModal — replaced in Plan 07). Success banner at `bottom: 80`. |
| `app/(admin)/company-setup.tsx` | Three-field form calling createCompany(), updateDoc with companyId, refreshRole(), navigate to /(admin) | VERIFIED | All present. `router.replace('/(admin)')` added in Plan 07 fix. |
| `firestore.rules` | companies collection rules, admin user update rule, admin trips read rule | VERIFIED | Lines 344-358: companies rules with `allow read: if true` (for pre-auth check), `allow create: if isAdmin()`, `allow update` for owner. Lines 102-108: admin deactivate-driver rule. Lines 226-227: admin trips read with companyId scope. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `services/firebase/companies.ts` | `services/geoLocationUtils.ts` | `geocodeAddress()` + `getGeohash()` imports | WIRED | Line 14: `import { geocodeAddress, getGeohash } from '../geoLocationUtils';` both called in `createCompany()` |
| `services/firebase/companies.ts` | `types/models.ts` | Company, User, Trip imports | WIRED | Line 1: `import { Company, Trip, User } from '@/types/models';` |
| `services/firebase/authService.ts` | `services/firebase/companies.ts` | `findCompanyByEmail()` import | WIRED | Line 8: `import { findCompanyByEmail } from './companies';` called on Line 95 before account creation |
| `app/(auth)/signup.tsx` | `services/firebase/authService.ts` | `signUpDriverWithEmail()` call | WIRED | Line 1 import, Line 50 call in `handleSignup` |
| `hooks/use-company-jobs.ts` | `services/firebase/companies.ts` | `listenToCompanyJobs()` import | WIRED | Line 3: `import { listenToCompanyJobs } from '@/services/firebase/companies';` called on Line 15 |
| `hooks/use-company-drivers.ts` | `services/firebase/companies.ts` | `listenToCompanyDrivers()` import | WIRED | Line 3: `import { listenToCompanyDrivers } from '@/services/firebase/companies';` called on Line 15 |
| `app/(admin)/index.tsx` | `hooks/use-company-jobs.ts` | `useCompanyJobs(companyId)` | WIRED | Line 14 import, Line 93 call; jobs rendered in FlatList Line 128 |
| `app/(admin)/drivers.tsx` | `hooks/use-company-drivers.ts` | `useCompanyDrivers(companyId)` | WIRED | Line 18 import, Line 105 call; drivers rendered in FlatList |
| `app/(admin)/drivers.tsx` | `services/firebase/companies.ts` | `deactivateDriver()` + `addAuthorizedEmail()` | WIRED | Line 19 import both; `deactivateDriver` called in Alert onPress handler; `addAuthorizedEmail` called in `handleAddDriver()` |
| `app/(admin)/company-setup.tsx` | `services/firebase/companies.ts` | `createCompany()` call on submit | WIRED | Line 14 import; Line 60 call in `handleSubmit()` |
| `app/(admin)/index.tsx` | `context/auth-context.tsx` | `useAuth()` for companyId | WIRED | Line 12 import; Line 92 `const { companyId, loading: authLoading } = useAuth()` |
| `app/_layout.tsx` | `app/(admin)` | `<Redirect>` + `Stack.Screen` | WIRED | Line 38 Redirect; Line 64 Stack.Screen registered |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COMP-01 | 01-01, 01-04 | Admin can register a tow yard company (name, address, service area) | SATISFIED | `company-setup.tsx` three-field form → `createCompany()` → Firestore doc with geocoded location + geohash |
| COMP-02 | 01-01, 01-03, 01-06 | Admin adds driver by registering their company email (no self-registration) | SATISFIED | `addAuthorizedEmail()` in Drivers tab; `signUpDriverWithEmail()` blocks unauthorized emails with specific error |
| COMP-03 | 01-01, 01-06 | Admin can remove or deactivate a driver | SATISFIED | `deactivateDriver()` sets `isActive: false`; swipe-to-deactivate with Alert confirmation in `drivers.tsx` |
| COMP-04 | 01-01, 01-04, 01-05 | Admin can view all active jobs and statuses in real-time | SATISFIED | `listenToCompanyJobs()` via `useCompanyJobs()` via FlatList in `index.tsx` with status badges |
| COMP-05 | 01-01, 01-04, 01-06 | Admin can view which drivers are currently online | SATISFIED (Phase 1 scope) | `listenToCompanyDrivers()` via `useCompanyDrivers()` via FlatList in `drivers.tsx`. Note: All active drivers show "Offline" — isAvailable lives in the separate drivers collection; cross-collection join is deferred to Phase 2 per plan design decision. This is accepted Phase 1 behavior. |
| AUTH-01 | 01-01, 01-02, 01-03 | Driver logs in with company-issued email and is automatically associated with tow yard | SATISFIED | `signUpDriverWithEmail()` sets `companyId` at user doc creation; `AuthContext` reads it on every login; no manual company selection screen exists |

No orphaned requirements — all 6 Phase 1 requirement IDs (COMP-01 through COMP-05, AUTH-01) are claimed by at least one plan and have implementation evidence. REQUIREMENTS.md marks all 6 as Complete.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(auth)/signup.tsx` | N/A | Placeholder TextInput props (placeholder text) | INFO | These are UI placeholder strings in TextInput components — not implementation stubs. Correct usage. |
| `services/firebase/companies.ts` | 69 | `return null` | INFO | Intentional null return in `findCompanyByEmail()` when no matching company found. Correct semantics, not a stub. |
| `app/(auth)/onboarding/commuter-login.tsx` | 181 | `react/no-unescaped-entities` lint error | WARNING | Pre-existing from before Phase 1. Not in Phase 1 scope. |
| `app/(driver)/index.tsx` | 340 | `react/no-unescaped-entities` lint error | WARNING | Pre-existing from before Phase 1. Not in Phase 1 scope. |
| `components/FindingDriverModal.tsx` | 140 | `react/no-unescaped-entities` lint error | WARNING | Pre-existing from before Phase 1. Not in Phase 1 scope. |

The 3 pre-existing lint errors are in files not touched by Phase 1. All Phase 1 files pass lint individually with 0 errors.

---

### Human Verification Required

These items require a running app on a simulator/device. Per the Plan 07 SUMMARY, all 6 flows were completed by the human verifier on 2026-03-16 with all flows passing. The items are documented here for completeness of the verification record.

#### 1. Admin routing and company-setup redirect

**Test:** Sign in with a user whose Firestore doc has `role: "admin"` and no `companyId`.
**Expected:** App routes to `/(admin)` and immediately redirects to `/(admin)/company-setup` (not to commuter or driver screens).
**Why human:** Requires live Firebase Auth session.

#### 2. Company registration Firestore doc

**Test:** Fill in company name, a real street address, and a service radius. Tap "Register Company".
**Expected:** Firestore `companies` collection gains a doc with all required fields including a non-empty `geohash` string and `location.latitude`/`location.longitude`. Admin navigates to Jobs/Drivers dashboard.
**Why human:** Requires live Google Maps geocoding API; Firestore console inspection.

#### 3. Authorized driver signup

**Test:** Admin adds driver email via Add Driver sheet. Driver signs up with that email.
**Expected:** Driver account created; Firestore `users/{uid}` has `role: "driver"` and the correct `companyId`.
**Why human:** Two-account flow; Firestore write verification.

#### 4. Unauthorized driver blocked

**Test:** Attempt signup with an email not in any company's `authorizedEmails`.
**Expected:** Signup blocked with error "This email isn't registered with a tow yard. Contact your company admin." No Firebase Auth account created.
**Why human:** Requires live Firebase Auth; Firebase console Auth Users tab verification.

#### 5. Swipe-to-deactivate end-to-end

**Test:** Swipe left on an active driver row, tap "Deactivate Driver" in the Alert, confirm.
**Expected:** Row dims to `opacity: 0.5`, chip changes to "Deactivated". Firestore `users/{uid}.isActive === false`.
**Why human:** Swipe gesture requires device/simulator; Firestore console verification.

#### 6. Real-time Jobs tab

**Test:** With Jobs tab open, add a trip doc to Firestore with `companyId` matching the admin's company and `status: "en_route"`. Then change `status` to `"arrived"`.
**Expected:** Row appears without user action; badge updates from "En Route" to "Arrived" without refresh.
**Why human:** Real-time behavior requires live Firestore listener.

---

### Gaps Summary

No automated gaps found. All 5 ROADMAP success criteria are backed by substantive, wired implementations.

The 3 pre-existing lint errors (`react/no-unescaped-entities` in commuter-login.tsx, driver/index.tsx, FindingDriverModal.tsx) are out-of-scope for Phase 1 and have been tracked in `.planning/phases/01-companies-admin/deferred-items.md`.

One design limitation acknowledged by the plans: COMP-05 (admin can view which drivers are currently online) is satisfied at Phase 1 scope with all active drivers showing an "Offline" chip. True live online/offline status requires a cross-collection join between `users` and `drivers` collections — this is explicitly deferred to Phase 2 per the plan design decision and is not a gap.

---

_Verified: 2026-03-15T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
