# Phase 3: Maestro E2E Testing - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Maestro E2E testing framework and write automated test flows for commuter request, driver dispatch, and basic admin workflows. This includes configuring Firebase emulators, creating an Expo dev build (currently using Expo Go), writing a data seed script, and authoring Maestro YAML test flows. Driver maps/navigation UX (Phase 4), push notifications (Phase 5), and Firestore security hardening (Phase 6) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Test Environment
- **D-01:** Tests run against **Firebase Emulators** (Auth + Firestore + Functions) — not the real towlink-71a59 project
- **D-02:** Firebase emulators need to be set up as part of this phase — a previous attempt exists in the codebase but is non-functional
- **D-03:** App connects to emulators via an environment variable flag (Claude's discretion on exact mechanism — e.g., `USE_FIREBASE_EMULATOR=true` in `.env.test` or similar)

### Dev Build Requirement
- **D-04:** Maestro requires a custom native binary — **Expo dev build must be created** as part of this phase (currently using Expo Go which won't work)
- **D-05:** Target **iOS Simulator only** for now — Android can be added in a future phase

### Flow Coverage
- **D-06:** Commuter flow: **happy path + error cases** — sign up/log in, submit tow request, see "Searching for driver...", driver assigned, trip status updates, PLUS: no drivers available scenario
- **D-07:** Driver flow: **accept + decline scenarios** — driver logs in, receives assigned job, accepts, advances through trip stages to completion, PLUS: driver declines and job re-assigns to next driver
- **D-08:** Admin flow: **basic coverage** — log in, see Jobs tab, see Drivers tab (quick win since screens exist)
- **D-09:** Flows run as **separate independent tests** — no combined multi-device orchestration. Driver test seeds its own assigned job in Firestore rather than waiting for commuter dispatch

### Test Data Strategy
- **D-10:** **Emulator auto-seed script** creates all test data before tests run — deterministic test accounts (e.g., test-commuter@test.com / password123), test company, test driver
- **D-11:** **Full state seeding** — seed includes company, admin user, driver user, commuter user, AND a pre-created request assigned to the test driver so driver tests can start immediately
- **D-12:** **Emulator reset between runs** — restart emulators for clean state, re-seed data on each run. No cleanup scripts needed

### CI & Execution
- **D-13:** **Local only for now** — run via `maestro test` from the terminal. CI integration (GitHub Actions) deferred to Phase 6
- **D-14:** Tests must be runnable with a **single command** (success criteria #4)

### Claude's Discretion
- Exact Maestro YAML flow structure and file organization within `.maestro/`
- How to configure the app to detect and connect to Firebase emulators (env var approach)
- Expo dev build configuration details (EAS build vs local `npx expo run:ios`)
- Seed script implementation (Node script vs Firebase Admin SDK approach)
- Whether to use Maestro's `runFlow` for shared setup steps (login) across test files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — TEST-01 defines acceptance criteria for this phase
- `.planning/ROADMAP.md` section Phase 3 — Success criteria (4 items) that must all be true for phase completion

### Prior Phase Context
- `.planning/phases/01-companies-admin/01-CONTEXT.md` — Company data model, admin role, driver-company linkage patterns
- `.planning/phases/02-company-based-dispatch/02-CONTEXT.md` — Dispatch flow, company routing, fair distribution algorithm, request/trip lifecycle

### Existing Analysis
- `.planning/codebase/TESTING.md` — Current testing state analysis (no test framework, recommended patterns)

### No external specs
No ADRs or design docs. Requirements captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/firebase/config.ts` — Firebase initialization; needs emulator connection logic added
- `services/firebase/firestore.ts` — All Firestore operations that tests will exercise
- `services/firebase/companies.ts` — Company CRUD and driver roster functions
- `functions/src/index.ts` — Cloud Functions (dispatch, matching, timeouts) need to run in emulator
- `services/mockData/` — May contain existing mock data patterns useful for seed script

### Established Patterns
- Firebase Auth with email/password — seed script creates accounts via Firebase Admin SDK
- Firestore real-time listeners — tests will trigger state changes and verify UI updates
- Role-based routing: `(auth)`, `(commuter)`, `(driver)`, `(admin)` route groups — Maestro flows navigate through these
- Cloud Functions dispatch pipeline: request created -> company matched -> driver assigned -> claim/accept/decline

### Integration Points
- `app.config.js` — May need modification for dev build configuration
- `firebase.json` — Emulator configuration lives here (partial/broken config may exist from previous attempt)
- New directory: `.maestro/` — All Maestro test flow YAML files
- New script: seed script for populating emulator data (location TBD — `scripts/` or `e2e/`)
- `package.json` — New scripts for test commands (e.g., `npm run test:e2e`)

</code_context>

<specifics>
## Specific Ideas

- Previous Firebase emulator setup attempt exists but is broken — need to diagnose and fix rather than start from scratch
- Currently on Expo Go — dev build setup is a prerequisite before any Maestro tests can run
- Test data should include a complete company + driver + commuter + assigned request so driver flow tests can start immediately without waiting for dispatch

</specifics>

<deferred>
## Deferred Ideas

- Android emulator test targets — add after iOS Simulator tests are stable
- GitHub Actions CI for automated test runs — Phase 6
- Combined multi-device flow (commuter + driver together) — future enhancement
- Maestro cloud for parallel/distributed test runs — post-MVP

</deferred>

---

*Phase: 03-maestro-e2e-testing*
*Context gathered: 2026-03-20*
