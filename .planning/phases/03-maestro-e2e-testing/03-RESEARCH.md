# Phase 3: Maestro E2E Testing - Research

**Researched:** 2026-03-20
**Domain:** Maestro mobile E2E testing, Expo development builds, Firebase Local Emulator Suite, seed scripts
**Confidence:** HIGH (Maestro CLI already installed; Firebase emulator config verified in codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Tests run against **Firebase Emulators** (Auth + Firestore + Functions) — not the real towlink-71a59 project
- **D-02:** Firebase emulators need to be set up as part of this phase — a previous attempt exists in the codebase but is non-functional
- **D-03:** App connects to emulators via an environment variable flag (Claude's discretion on exact mechanism)
- **D-04:** Maestro requires a custom native binary — **Expo dev build must be created** as part of this phase (currently using Expo Go which won't work)
- **D-05:** Target **iOS Simulator only** for now — Android can be added in a future phase
- **D-06:** Commuter flow: **happy path + error cases** — sign up/log in, submit tow request, see "Searching for driver...", driver assigned, trip status updates, PLUS: no drivers available scenario
- **D-07:** Driver flow: **accept + decline scenarios** — driver logs in, receives assigned job, accepts, advances through trip stages to completion, PLUS: driver declines and job re-assigns to next driver
- **D-08:** Admin flow: **basic coverage** — log in, see Jobs tab, see Drivers tab (quick win since screens exist)
- **D-09:** Flows run as **separate independent tests** — no combined multi-device orchestration. Driver test seeds its own assigned job in Firestore rather than waiting for commuter dispatch
- **D-10:** **Emulator auto-seed script** creates all test data before tests run — deterministic test accounts (e.g., test-commuter@test.com / password123), test company, test driver
- **D-11:** **Full state seeding** — seed includes company, admin user, driver user, commuter user, AND a pre-created request assigned to the test driver so driver tests can start immediately
- **D-12:** **Emulator reset between runs** — restart emulators for clean state, re-seed data on each run. No cleanup scripts needed
- **D-13:** **Local only for now** — run via `maestro test` from the terminal. CI integration (GitHub Actions) deferred to Phase 6
- **D-14:** Tests must be runnable with a **single command** (success criteria #4)

### Claude's Discretion

- Exact Maestro YAML flow structure and file organization within `.maestro/`
- How to configure the app to detect and connect to Firebase emulators (env var approach)
- Expo dev build configuration details (EAS build vs local `npx expo run:ios`)
- Seed script implementation (Node script vs Firebase Admin SDK approach)
- Whether to use Maestro's `runFlow` for shared setup steps (login) across test files

### Deferred Ideas (OUT OF SCOPE)

- Android emulator test targets — add after iOS Simulator tests are stable
- GitHub Actions CI for automated test runs — Phase 6
- Combined multi-device flow (commuter + driver together) — future enhancement
- Maestro cloud for parallel/distributed test runs — post-MVP
</user_constraints>

---

## Summary

This phase sets up Maestro E2E testing against Firebase Local Emulators using an Expo development build on iOS Simulator. Three components must be created: (1) a working Expo dev build with expo-dev-client, (2) a fixed Firebase emulator configuration with Auth + Firestore + Functions, and (3) Maestro YAML test flows for commuter, driver, and admin flows.

The Firebase emulator configuration already exists in `firebase.json` but is missing the `auth` emulator entry — this is the likely cause of the broken prior attempt. The app's `services/firebase/config.ts` needs a conditional emulator connection block gated by an `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` env var. A separate seed script (plain Node + firebase-admin) populates deterministic test accounts and documents before each test run.

Maestro v2.2.0 is already installed on this machine. The iOS Simulator app ID will be `com.anonymous.towlink` (Expo default when no `bundleIdentifier` is set in `app.config.js`) — this must be confirmed or set explicitly before writing YAML flows.

**Primary recommendation:** Use `npx expo run:ios` with `expo-dev-client` installed for a local dev build (no EAS account required), use `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` to gate emulator connections, and use `firebase-admin` + environment variable auto-detection for the seed script.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Maestro CLI | 2.2.0 (installed) | Mobile E2E test runner | Already installed; YAML-based, no Xcode test infrastructure needed |
| expo-dev-client | 55.0.18 (latest) | Enables custom native binary | Required for Maestro — Expo Go cannot be targeted by Maestro |
| firebase-admin | 13.7.0 (latest) | Seed script Auth + Firestore writes | Only way to create Auth users programmatically in emulator |
| firebase emulators | via firebase-tools 15.6.0 (already in devDeps) | Local Auth + Firestore + Functions | D-01 locked decision |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @firebase/rules-unit-testing | ^3.x | `withFunctionTriggersDisabled` for clean seeding | Use in seed script to prevent dispatch functions from firing when writing seed data |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npx expo run:ios` (local) | EAS Build `--local` flag | EAS requires account + eas.json; local run:ios has no account requirement and is faster for a simulator-only target |
| firebase-admin seed script | `firebase emulators:start --import` | Import approach requires maintaining a snapshot; script approach produces deterministic data and is easier to version-control and modify |
| `runFlow` for shared login | Copy-paste login steps in each flow | `runFlow` keeps flows DRY and makes credential changes a single-file edit |

**Installation (new packages only):**
```bash
npx expo install expo-dev-client
npm install --save-dev firebase-admin @firebase/rules-unit-testing
```

---

## Architecture Patterns

### Recommended Project Structure

```
.maestro/
├── subflows/
│   ├── login-commuter.yaml      # reusable commuter login steps
│   ├── login-driver.yaml        # reusable driver login steps
│   └── login-admin.yaml         # reusable admin login steps
├── commuter-happy-path.yaml     # commuter submits request, driver assigned
├── commuter-no-drivers.yaml     # commuter submits request, no_drivers state
├── driver-accept-complete.yaml  # driver accepts, advances to completed
├── driver-decline.yaml          # driver declines, job re-assigns
└── admin-basic.yaml             # admin logs in, views Jobs + Drivers tabs

scripts/
└── seed-emulator.js             # Node + firebase-admin seed script

.env.test                        # EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true (gitignored)
```

### Pattern 1: Emulator Connection in config.ts

**What:** Guard `connectAuthEmulator` and `connectFirestoreEmulator` calls behind a runtime check on the env var.

**When to use:** Always in this phase — every test run uses emulators.

```typescript
// Source: https://firebase.google.com/docs/emulator-suite/connect_auth
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

// After auth and db are initialized:
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
```

**Note:** For iOS Simulator, `127.0.0.1` works. The env var must be prefixed `EXPO_PUBLIC_` to be accessible in the React Native bundle at runtime.

### Pattern 2: Firebase Admin Seed Script

**What:** Node script that sets `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` before initializing firebase-admin, then writes all test fixture data.

**When to use:** Before every test run; part of the single `npm run test:e2e` command.

```javascript
// Source: Firebase Admin SDK + emulator env var pattern
// scripts/seed-emulator.js

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'towlink-71a59' });

const auth = admin.auth();
const db = admin.firestore();

async function seed() {
  // Create test users
  const commuterRecord = await auth.createUser({
    email: 'test-commuter@test.com',
    password: 'password123',
    displayName: 'Test Commuter',
  });

  const driverRecord = await auth.createUser({
    email: 'test-driver@test.com',
    password: 'password123',
    displayName: 'Test Driver',
  });

  const adminRecord = await auth.createUser({
    email: 'test-admin@test.com',
    password: 'password123',
    displayName: 'Test Admin',
  });

  // Create company
  const companyRef = db.collection('companies').doc('test-company-01');
  await companyRef.set({
    name: 'Test Tow Yard',
    address: '123 Main St',
    serviceRadiusKm: 50,
    geohash: 'geohash-value', // use geofire-common to compute
    location: new admin.firestore.GeoPoint(34.0522, -118.2437),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Set user roles
  await db.collection('users').doc(commuterRecord.uid).set({
    email: 'test-commuter@test.com',
    role: 'commuter',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('users').doc(adminRecord.uid).set({
    email: 'test-admin@test.com',
    role: 'admin',
    companyId: 'test-company-01',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('users').doc(driverRecord.uid).set({
    email: 'test-driver@test.com',
    role: 'driver',
    companyId: 'test-company-01',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create driver document
  await db.collection('drivers').doc(driverRecord.uid).set({
    userId: driverRecord.uid,
    companyId: 'test-company-01',
    isAvailable: true,
    totalAssignmentsToday: 0,
    assignmentDate: new Date().toISOString().split('T')[0],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Pre-create an assigned request for driver flow tests (D-11)
  await db.collection('requests').doc('test-request-assigned').set({
    commuterId: commuterRecord.uid,
    driverId: driverRecord.uid,
    companyId: 'test-company-01',
    status: 'assigned',
    location: new admin.firestore.GeoPoint(34.0522, -118.2437),
    pickupAddress: '123 Main St, Los Angeles, CA',
    dropoffAddress: '456 Oak Ave, Los Angeles, CA',
    dropoffLocation: new admin.firestore.GeoPoint(34.0625, -118.2410),
    serviceType: 'tow',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
```

### Pattern 3: Maestro YAML Flow with runFlow

**What:** Top-level test flow that delegates shared login to a subflow file.

**When to use:** Every Maestro flow that requires authentication.

```yaml
# .maestro/commuter-happy-path.yaml
# Source: Maestro runFlow docs + React Native testID pattern
appId: com.anonymous.towlink
---
- runFlow: subflows/login-commuter.yaml

- tapOn:
    text: "Request Tow"
- assertVisible:
    text: "Where are you?"
- tapOn:
    id: "pickup-address-input"
- inputText: "123 Main St, Los Angeles"
- tapOn:
    text: "Confirm Pickup"
- assertVisible:
    text: "Searching for driver"
- assertVisible:
    text: "Driver on the way"
    timeout: 15000
```

```yaml
# .maestro/subflows/login-commuter.yaml
appId: com.anonymous.towlink
---
- launchApp:
    clearState: true
- tapOn:
    id: "email-input"
- inputText: "test-commuter@test.com"
- tapOn:
    id: "password-input"
- inputText: "password123"
- hideKeyboard
- tapOn:
    text: "Sign In"
- assertVisible:
    text: "Request Tow"
```

### Pattern 4: Single-Command Test Runner (npm script)

**What:** One `npm run test:e2e` command that orchestrates emulator restart, seed, and Maestro test run.

```json
// package.json scripts additions
"test:e2e": "npm run test:e2e:setup && npm run test:e2e:run",
"test:e2e:setup": "firebase emulators:start --only auth,firestore,functions --detach && sleep 3 && node scripts/seed-emulator.js",
"test:e2e:run": "EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true maestro test .maestro/"
```

**Important nuance:** `firebase emulators:start --detach` requires `firebase-tools` v11.16.0+. An alternative is running emulators in a separate terminal and only calling seed + maestro in the script. Given the emulator reset requirement (D-12), the plan should address how to kill the previous emulator process before restarting.

### Anti-Patterns to Avoid

- **No `bundleIdentifier` in app.config.js:** Expo defaults to `com.anonymous.towlink` which works but is fragile. Set an explicit `bundleIdentifier` so YAML `appId` is stable.
- **Calling `connectAuthEmulator` multiple times:** Firebase JS SDK throws an error if emulator is connected twice (e.g., in dev + hot reload). Guard with a flag or check.
- **Running against real Firebase project:** Never run with `EXPO_PUBLIC_USE_FIREBASE_EMULATOR` unset or false during E2E tests — tests create and mutate data.
- **Using Expo Go for Maestro tests:** Expo Go is a shared container app, not your app's bundle ID. Maestro cannot target it correctly. The dev build is mandatory.
- **Hardcoding locations that don't match seed data:** Commuter request location must fall within the test company's `serviceRadiusKm` or dispatch will return `no_drivers`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth user creation in emulator | Custom REST calls to Auth emulator API | `firebase-admin` `auth.createUser()` | Admin SDK handles emulator detection via env var; REST is error-prone |
| App ID detection in YAML | Logic to detect build variant | Explicit `bundleIdentifier` in `app.config.js` | One source of truth; Maestro `appId` must match exactly |
| Waiting for emulator startup | `sleep N` guesses | `firebase emulators:exec` wrapper OR explicit health-check script | Emulators start at different speeds; race conditions cause flaky test setup |
| Emulator data cleanup | Per-test delete scripts | Full emulator restart + re-seed (D-12) | Fastest and most reliable; emulator HTTP endpoint exists: `DELETE http://localhost:8080/emulator/v1/projects/{project}/databases/(default)/documents` |

**Key insight:** The Firebase emulator exposes a REST API for clearing data without restarting: `DELETE http://localhost:8080/emulator/v1/projects/towlink-71a59/databases/(default)/documents` — but a full emulator restart + re-seed is simpler and matches D-12.

---

## Common Pitfalls

### Pitfall 1: Missing `auth` entry in firebase.json

**What goes wrong:** `firebase emulators:start` starts Firestore and Functions but NOT Auth, because `firebase.json` currently has no `auth` emulator entry. Seed script fails with connection errors. App cannot sign in.

**Why it happens:** The existing `firebase.json` (verified) has `firestore`, `functions`, and `ui` entries but no `auth` entry.

**How to avoid:** Add `"auth": { "port": 9099 }` to the `emulators` block in `firebase.json`.

**Warning signs:** Seed script throws `Error: could not connect to auth emulator` or `auth/network-request-failed` in the app.

### Pitfall 2: `connectAuthEmulator` called multiple times (hot reload)

**What goes wrong:** React Native hot-reloads re-execute module-level code. `connectAuthEmulator` throws `"Auth Emulator has already been set"` on the second call.

**Why it happens:** Firebase JS SDK does not allow re-connecting to the emulator after initialization.

**How to avoid:** Use a module-level boolean guard:
```typescript
let emulatorsConnected = false;
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && !emulatorsConnected) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  emulatorsConnected = true;
}
```

**Warning signs:** App crashes on hot reload with `FirebaseError: Auth Emulator has already been set`.

### Pitfall 3: Cloud Functions dispatch fires during seeding

**What goes wrong:** The seed script creates a `requests` document with status `searching`, which triggers `matchDriverOnRequestCreate` in the Functions emulator, potentially overwriting the `assigned` status set in the same seed script.

**Why it happens:** Cloud Functions emulator listens to Firestore triggers synchronously.

**How to avoid:** Seed the pre-assigned request document with status `assigned` (not `searching`) — the dispatch function only runs on document creation AND only proceeds if status is `searching` (verified in `functions/src/index.ts` line 33). Alternatively, use `@firebase/rules-unit-testing`'s `withFunctionTriggersDisabled`.

**Warning signs:** Seed script completes but request document has unexpected status or `driverId` field is missing.

### Pitfall 4: iOS Simulator app not installed before `maestro test`

**What goes wrong:** Maestro fails with `App not found: com.anonymous.towlink` because the dev build was never installed on the booted simulator.

**Why it happens:** `npx expo run:ios` builds AND installs, but only when run before Maestro. If the simulator was reset or a new simulator was booted, the build is gone.

**How to avoid:** Add simulator install verification to the test:e2e:setup script, or document that `npx expo run:ios` must be re-run when the simulator changes.

**Warning signs:** `maestro test` fails immediately with app not found error.

### Pitfall 5: `testID` not plumbed to screen elements

**What goes wrong:** Maestro YAML uses `id: "email-input"` selectors but the React Native components have no `testID` prop — flows fail on element lookup.

**Why it happens:** Existing screens were built without testing in mind.

**How to avoid:** The plan must include a task to audit all screens used in flows and add `testID` props to key interactive elements (inputs, buttons, important text). Fall back to `text:` selectors only for static labels.

**Warning signs:** `maestro test` reports element not found; `maestro studio` shows no id on the element.

### Pitfall 6: Geolocation permission dialog blocks test flow on iOS

**What goes wrong:** The commuter screen requests location permission on first launch. Maestro test hangs waiting for the system dialog which is not part of the app's view hierarchy.

**Why it happens:** iOS system permission dialogs are outside the app's UI tree. Maestro cannot interact with them directly on simulator in the same way as Android.

**How to avoid:** Use Maestro's `runFlow` with a conditional iOS block to handle the system alert, OR pre-grant location permission on the simulator via `xcrun simctl privacy booted grant location <bundleID>` as part of the setup script.

---

## Validation Architecture

> nyquist_validation is enabled (not explicitly set to false in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Maestro CLI 2.2.0 |
| Config file | `.maestro/` directory (no single config file — each flow is a YAML file) |
| Quick run command | `maestro test .maestro/admin-basic.yaml` |
| Full suite command | `maestro test .maestro/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Commuter request submission flow E2E | Maestro E2E | `maestro test .maestro/commuter-happy-path.yaml` | Wave 0 |
| TEST-01 | Commuter no-drivers error state | Maestro E2E | `maestro test .maestro/commuter-no-drivers.yaml` | Wave 0 |
| TEST-01 | Driver accept + complete trip flow | Maestro E2E | `maestro test .maestro/driver-accept-complete.yaml` | Wave 0 |
| TEST-01 | Driver decline flow | Maestro E2E | `maestro test .maestro/driver-decline.yaml` | Wave 0 |
| TEST-01 | Admin basic navigation | Maestro E2E | `maestro test .maestro/admin-basic.yaml` | Wave 0 |
| SC-1 | Maestro configured against dev build | Smoke | `maestro test .maestro/admin-basic.yaml` | Wave 0 |

Note: Success Criteria items SC-2 through SC-4 are validated by the Maestro runs passing end-to-end without error.

### Sampling Rate

- **Per task commit:** `maestro test .maestro/admin-basic.yaml` (fastest smoke test — just login + nav)
- **Per wave merge:** `maestro test .maestro/` (all flows)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.maestro/subflows/login-commuter.yaml` — shared commuter login
- [ ] `.maestro/subflows/login-driver.yaml` — shared driver login
- [ ] `.maestro/subflows/login-admin.yaml` — shared admin login
- [ ] `.maestro/commuter-happy-path.yaml` — covers TEST-01 commuter path
- [ ] `.maestro/commuter-no-drivers.yaml` — covers TEST-01 error state
- [ ] `.maestro/driver-accept-complete.yaml` — covers TEST-01 driver path
- [ ] `.maestro/driver-decline.yaml` — covers TEST-01 decline scenario
- [ ] `.maestro/admin-basic.yaml` — covers TEST-01 admin quick win
- [ ] `scripts/seed-emulator.js` — deterministic test data (D-10, D-11)
- [ ] `.env.test` — `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`
- [ ] `firebase.json` auth emulator entry — fixes broken prior attempt (D-02)
- [ ] `app.config.js` — explicit `ios.bundleIdentifier` set
- [ ] `services/firebase/config.ts` — emulator connection guard
- [ ] Expo dev build: `npx expo install expo-dev-client && npx expo run:ios` (D-04)
- [ ] `testID` props added to interactive elements on commuter, driver, admin screens

---

## Code Examples

### firebase.json (fixed)

```json
{
  "firestore": {
    "database": "(default)",
    "location": "us-west2",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  },
  "functions": [...]
}
```

### app.config.js (add bundleIdentifier)

```javascript
// Source: Expo app.config.js docs
ios: {
  bundleIdentifier: 'com.towlink.app',
  supportsTablet: true,
  config: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  }
},
```

### Maestro driver-accept-complete.yaml

```yaml
# .maestro/driver-accept-complete.yaml
appId: com.towlink.app
---
- runFlow: subflows/login-driver.yaml

# Driver dashboard should show the pre-seeded assigned job
- assertVisible:
    text: "New Job"
- tapOn:
    text: "Accept"
- assertVisible:
    text: "En Route"
- tapOn:
    id: "advance-trip-status-btn"
- assertVisible:
    text: "Arrived"
- tapOn:
    id: "advance-trip-status-btn"
- assertVisible:
    text: "In Progress"
- tapOn:
    id: "advance-trip-status-btn"
- assertVisible:
    text: "Completed"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Detox for React Native E2E | Maestro for React Native E2E | ~2022-2023 | Maestro requires no Xcode test infrastructure; YAML is simpler than Detox JS; officially recommended in Expo docs 2024+ |
| EAS-only dev builds | `npx expo run:ios` (local) | Expo SDK 50+ | Local builds don't require EAS account; faster iteration on simulator |
| `compat/app` Firebase v8 | Modular Firebase v9+ (SDK v12 in this project) | Firebase v9 (2021) | `connectAuthEmulator` / `connectFirestoreEmulator` are the v9+ modular API |

**Deprecated/outdated:**
- `firebase.auth().useEmulator(url)` — v8 compat syntax. This project uses Firebase SDK v12 modular only; use `connectAuthEmulator(auth, url)` instead.
- `Expo Go` for Maestro testing — never works; Maestro cannot target the Expo Go container app ID.

---

## Open Questions

1. **Does `firebase emulators:start --detach` work reliably on this machine?**
   - What we know: `--detach` flag exists in firebase-tools and allows background startup
   - What's unclear: Some versions of firebase-tools have issues with `--detach` on macOS; may need to run emulators in a separate terminal
   - Recommendation: Plan should include a note to test `--detach` and fall back to split-terminal instructions if it fails

2. **What is the exact bundle ID after `npx expo run:ios`?**
   - What we know: Expo defaults to `com.anonymous.{slug}` = `com.anonymous.towlink` when no `bundleIdentifier` is set
   - What's unclear: Adding `bundleIdentifier` to `app.config.js` requires a full rebuild of the native binary
   - Recommendation: Set `bundleIdentifier: 'com.towlink.app'` in the first plan (dev build plan) and build once with that ID

3. **Which screens need `testID` props added?**
   - What we know: Auth screens (`login.tsx`, `signup.tsx`), commuter flow (`index.tsx` request sheet), driver flow (`index.tsx` job card), admin flow (`index.tsx`, `drivers.tsx`) all need testIDs on key elements
   - What's unclear: Full inventory requires reading each screen file
   - Recommendation: Include a testID audit task in Wave 1 of the plan, before writing YAML flows

---

## Sources

### Primary (HIGH confidence)
- Maestro CLI v2.2.0 installed at `/Users/chris/.maestro/bin/maestro` — version confirmed
- `firebase.json` in repo — emulator config verified (missing `auth` entry confirmed)
- `services/firebase/config.ts` in repo — SDK initialization pattern verified (Firebase JS SDK v12 modular)
- `package.json` in repo — firebase-tools v15.6.0 already in devDeps; firebase v12.11.0 in deps
- [Firebase Auth Emulator docs](https://firebase.google.com/docs/emulator-suite/connect_auth) — `connectAuthEmulator` API
- [Firebase Firestore Emulator docs](https://firebase.google.com/docs/emulator-suite/connect_firestore) — `connectFirestoreEmulator` API
- [Expo local app development docs](https://docs.expo.dev/guides/local-app-development/) — `npx expo run:ios` confirmed

### Secondary (MEDIUM confidence)
- [Maestro blog: Running Maestro UI Tests in Expo Dev Builds](https://maestro.dev/blog/running-maestro-ui-tests-in-an-expo-development-builds) — EAS + Maestro setup patterns
- [Maestro runFlow docs](https://docs.maestro.dev/api-reference/commands/runflow) — subflow syntax confirmed via search
- [Maestro React Native guide](https://docs.maestro.dev/platform-support/react-native) — testID → `id` selector mapping
- [WebSearch: firebase-admin emulator env vars] — `FIRESTORE_EMULATOR_HOST`/`FIREBASE_AUTH_EMULATOR_HOST` auto-detection confirmed by multiple sources

### Tertiary (LOW confidence)
- `firebase emulators:start --detach` behavior — not directly verified; should be tested during Wave 0
- `@firebase/rules-unit-testing` `withFunctionTriggersDisabled` for seed script — referenced in one source but not verified against current package version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry; Maestro already installed
- Architecture: HIGH — firebase.json inspected directly; emulator connection patterns from official Firebase docs
- Pitfalls: HIGH — auth missing from firebase.json is a direct observation; other pitfalls from verified sources
- YAML flow examples: MEDIUM — Maestro commands verified via docs/search; exact text labels depend on current screen implementations not fully reviewed

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (Maestro updates frequently; check `maestro --version` before planning if delayed)
