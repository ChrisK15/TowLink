# Phase 6: Security, Reliability & Testing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 06-security-reliability-testing
**Areas discussed:** Firestore rules audit, Loading & error UX, Startup route flicker, Emulator test coverage

---

## Firestore Rules Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Keep public read | Pre-auth driver signup flow requires it — current working pattern | ✓ |
| Lock to authenticated only | Require login before checking — would break driver signup flow | |

**User's choice:** Keep public read (Recommended)
**Notes:** Companies collection stays open for pre-auth email check

---

| Option | Description | Selected |
|--------|-------------|----------|
| Trust Cloud Functions as-is | Functions run with admin SDK (trusted code). Standard Firebase pattern. | |
| Add basic validation | Validate status transitions and role checks in Cloud Functions too | |
| You decide | Claude evaluates the risk and picks the appropriate level | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on Cloud Function validation level

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep open reads | Drivers need to query searching requests; commuters only see own via client queries | |
| Role-scoped reads | Commuters can only read their own, drivers read searching + claimed | |
| You decide | Claude picks based on capstone scope vs security trade-off | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on request read scoping

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add rules tests | Jest tests against emulator to verify each rule. Catches regressions. | ✓ |
| Manual verification only | Verify rules by testing in emulator manually | |

**User's choice:** Yes, add rules tests (Recommended)

---

## Loading & Error UX

| Option | Description | Selected |
|--------|-------------|----------|
| Shared LoadingOverlay component | One reusable component all screens use. Consistent, easy to update. | ✓ |
| Keep per-screen ActivityIndicator | Each screen manages its own loading UI. Less work, inconsistent. | |

**User's choice:** Shared LoadingOverlay component (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Alert.alert (current pattern) | Keep using native Alert dialogs. Already used in 10 screens. | |
| Inline error banners | Dismissible banners within the screen (like a toast). More modern UX. | ✓ |

**User's choice:** Inline error banners
**Notes:** User chose the non-recommended option — prefers modern toast UX over native alerts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-dismiss toast | Shows at top/bottom, disappears after ~3 seconds. Non-blocking. | ✓ |
| Persistent dismiss banner | Stays on screen until user taps X. Better for critical errors. | |

**User's choice:** Auto-dismiss toast (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, wrap key screens | Error boundaries around MapView and main screen groups | ✓ |
| Skip for now | Rely on existing try/catch in async code | |

**User's choice:** Yes, wrap key screens (Recommended)

---

## Startup Route Flicker

| Option | Description | Selected |
|--------|-------------|----------|
| Hold splash screen | Use expo-splash-screen to keep splash visible until auth resolves | ✓ |
| Loading skeleton screen | Show branded loading screen (logo + spinner) instead of splash | |

**User's choice:** Hold splash screen (Recommended)

---

## Emulator Test Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Rules tests only | Firestore security rules tests against emulator. Keep scope tight. | |
| Rules + service unit tests | Also add Jest unit tests for key service functions | ✓ |
| Full test suite | Rules + service + hook + component tests. Significant effort. | |

**User's choice:** Rules + service unit tests

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add new seed scenarios | Completed trip + in-progress trip seed data. Emulator only. | ✓ |
| Skip seed changes entirely | Don't touch seed script at all | |

**User's choice:** Add new seed scenarios (Recommended)
**Notes:** User was initially concerned about touching seed data for demo. Clarified that seed script only runs against emulator, never production. User was satisfied and approved.

---

## Claude's Discretion

- D-03: Whether to add server-side validation in Cloud Functions
- D-04: Whether to scope request reads by role or keep open authenticated reads

## Deferred Ideas

None — discussion stayed within phase scope
