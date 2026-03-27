# Phase 6: Security, Reliability & Testing - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the app with role-based Firestore security rules audit, consistent loading/error UX across all screens, fix the startup route-flicker bug, and extend emulator test coverage with automated Firestore rules tests and updated seed data. No new features — this phase hardens what exists.

</domain>

<decisions>
## Implementation Decisions

### Firestore Rules Audit (SEC-01)
- **D-01:** Companies collection keeps public read (`allow read: if true`) — required for pre-auth driver signup flow that checks authorizedEmails before account creation
- **D-02:** Automated Firestore security rules tests will be written using Firebase emulator test SDK (Jest + `@firebase/rules-unit-testing`) to verify each rule path

### Claude's Discretion: Firestore Rules
- **D-03:** Claude decides whether to add server-side validation in Cloud Functions (dispatch, claim timeouts) — evaluate defense-in-depth vs. code duplication for trusted admin SDK code
- **D-04:** Claude decides whether to scope request reads by role (commuters see own, drivers see searching + claimed) vs. keeping current open authenticated reads — evaluate complexity vs. security benefit for capstone scope

### Loading & Error UX (SEC-02, SEC-03)
- **D-05:** Create a shared `LoadingOverlay` component used by all screens — replace inconsistent per-screen ActivityIndicator placements with one reusable component
- **D-06:** Replace `Alert.alert` error pattern with auto-dismiss toast notifications (~3 seconds, non-blocking). Requires a toast provider/context component.
- **D-07:** Add React error boundaries around MapView and main screen groups to catch unhandled render crashes with fallback UI

### Startup Route Flicker (SEC-04)
- **D-08:** Use `expo-splash-screen` (`SplashScreen.preventAutoHideAsync()`) to hold the splash screen visible until auth state fully resolves — user never sees a wrong screen flash

### Emulator Test Coverage (TEST-01)
- **D-09:** Test scope: Firestore security rules tests + service-level unit tests for key functions (createRequest, dispatch logic, calculations)
- **D-10:** Update emulator seed script to add new scenarios (completed trip, in-progress trip with Phase 4-7 fields like companyId, completionTime, finalPrice). Existing seed entries untouched.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Firestore Security
- `firestore.rules` — Current security rules for all 6 collections (users, requests, trips, drivers, driverLocations, companies)
- `.planning/codebase/CONCERNS.md` — Known security gaps and race conditions identified in codebase analysis

### Existing Patterns
- `.planning/codebase/CONVENTIONS.md` — Error handling patterns (try/catch/finally, Alert.alert, console.error)
- `.planning/codebase/TESTING.md` — Recommended test framework setup (Jest), mocking patterns, test structure
- `context/auth-context.tsx` — Auth state management with authLoading guard

### Phase Dependencies
- `.planning/phases/03-maestro-e2e-testing/03-CONTEXT.md` — Phase 3 emulator setup decisions
- `.planning/REQUIREMENTS.md` — SEC-01 through SEC-04, TEST-01 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `context/auth-context.tsx`: Has `authLoading` state — splash screen hold can key off this
- 15 screens already have `ActivityIndicator` usage — migration targets for LoadingOverlay
- 10 screens have try/catch with `Alert.alert` — migration targets for toast notifications
- `firestore.rules`: Comprehensive rules already exist with role helpers (isAdmin, isDriver, isCommuter), field validation, and state machine enforcement

### Established Patterns
- Error handling: try/catch/finally with `setLoading(false)` in finally block
- Auth guard: `authLoading` boolean checked before rendering in admin/driver index screens
- Firebase error mapping: `authService.ts` maps error codes to user-friendly messages

### Integration Points
- `app/_layout.tsx`: Root layout where splash screen hold and error boundary wrapper would go
- `context/auth-context.tsx`: Auth loading state that controls splash screen dismissal
- Emulator seed script: `scripts/` directory (Phase 3 infrastructure)

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose inline toast notifications over Alert dialogs for a more modern UX feel
- User concerned about seed script changes affecting demo — confirmed emulator-only, production untouched
- Rules tests should use `@firebase/rules-unit-testing` against the emulator

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-security-reliability-testing*
*Context gathered: 2026-03-25*
