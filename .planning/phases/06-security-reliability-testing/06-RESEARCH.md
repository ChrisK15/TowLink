# Phase 6: Security, Reliability & Testing - Research

**Researched:** 2026-03-25
**Domain:** Firestore security rules testing, React Native loading/error UX, expo-splash-screen, Jest + @firebase/rules-unit-testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Companies collection keeps `allow read: if true` — required for pre-auth driver signup flow that checks authorizedEmails before account creation
- **D-02:** Automated Firestore security rules tests written using Firebase emulator test SDK (Jest + `@firebase/rules-unit-testing`)
- **D-05:** Create a shared `LoadingOverlay` component used by all screens — replace inconsistent per-screen ActivityIndicator placements
- **D-06:** Replace `Alert.alert` error pattern with auto-dismiss toast notifications (~3 seconds, non-blocking). Requires a toast provider/context component.
- **D-07:** Add React error boundaries around MapView and main screen groups to catch unhandled render crashes with fallback UI
- **D-08:** Use `expo-splash-screen` (`SplashScreen.preventAutoHideAsync()`) to hold the splash screen until auth state fully resolves
- **D-09:** Test scope: Firestore security rules tests + service-level unit tests for key functions (createRequest, dispatch logic, calculations)
- **D-10:** Update emulator seed script to add new scenarios (completed trip, in-progress trip with companyId, completionTime, finalPrice). Existing seed entries untouched.

### Claude's Discretion

- **D-03:** Claude decides whether to add server-side validation in Cloud Functions (dispatch, claim timeouts) — evaluate defense-in-depth vs. code duplication for trusted admin SDK code
- **D-04:** Claude decides whether to scope request reads by role (commuters see own, drivers see searching + claimed) vs. keeping current open authenticated reads — evaluate complexity vs. security benefit for capstone scope

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Firestore rules enforce role-based access (admin writes company data, drivers write own data, commuters write requests) | Existing rules are comprehensive; need automated tests to verify each path — D-02 |
| SEC-02 | Loading states shown throughout all async operations | LoadingOverlay component pattern, migration from per-screen ActivityIndicator — D-05 |
| SEC-03 | Error handling with user-friendly messages across all Firebase operations | Toast notification library, provider pattern, migration from Alert.alert — D-06, D-07 |
| SEC-04 | Fix route flickering on app startup for authenticated users | SplashScreen.preventAutoHideAsync() holds splash until auth resolves, current loading guard already present in RootLayoutNav — D-08 |
| TEST-01 | Firebase emulator infrastructure for local testing | @firebase/rules-unit-testing v5 against running emulator, Jest setup, seed script expansion — D-09, D-10 |

</phase_requirements>

---

## Summary

Phase 6 hardens existing functionality — no new features are introduced. The work divides cleanly into five streams: (1) Firestore security rules audit and automated tests, (2) shared LoadingOverlay component replacing 15 screen-level ActivityIndicator instances, (3) toast notification system replacing Alert.alert in all screens and components, (4) splash screen hold to eliminate the startup route-flicker bug, and (5) Jest infrastructure with rules-unit-testing and service unit tests plus expanded emulator seed data.

The codebase already has a solid foundation. `firestore.rules` is comprehensive with role helpers, field validation, and state machine enforcement for all 6 collections. `auth-context.tsx` already exposes an `authLoading` (called `loading`) boolean that can directly gate the splash screen dismissal. `expo-splash-screen` is already installed at v31.0.13. The main work is wiring these pieces together and adding missing test infrastructure.

The two Claude's Discretion decisions (D-03, D-04) should both resolve conservatively: Cloud Function code runs as admin SDK (bypasses client rules entirely), so duplicating rules server-side adds little security value; and open authenticated reads on requests is acceptable for capstone scope given the tight client-side filtering already in place.

**Primary recommendation:** Implement in this sequence — (1) Jest + rules test infra, (2) LoadingOverlay + splash hold, (3) toast system, (4) error boundaries, (5) seed expansion. This order ensures test infrastructure is in place before any new components are added.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-splash-screen | 31.0.13 (already installed) | Hold splash until auth resolves | Official Expo SDK, already in project |
| @firebase/rules-unit-testing | 5.0.0 (latest) | Test Firestore security rules against emulator | Official Firebase testing SDK; only supported way to run rules tests |
| jest | 30.3.0 (npm latest) | Test runner | Industry standard; Expo provides jest-expo preset |
| jest-expo | 55.0.11 (npm latest) | Expo-compatible Jest preset | Configures transforms for RN/Expo modules |
| react-native-toast-message | 2.3.3 (latest stable) | Toast notifications replacing Alert.alert | Actively maintained, zero native dependencies, works with React 19 + RN 0.81 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/jest | Match jest version | TypeScript support for Jest | Always with TypeScript Jest setup |
| firebase-admin | 13.7.0 (already in devDependencies) | Seed script and test data setup | Already used by seed-emulator.js |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-toast-message | react-native-simple-toast | Less maintained, no provider pattern |
| react-native-toast-message | Custom toast context | More control but ~80 lines to hand-roll |
| jest-expo preset | bare jest with manual transforms | Significantly more configuration; jest-expo handles RN module transforms automatically |

**Installation:**
```bash
npm install react-native-toast-message
npm install --save-dev @firebase/rules-unit-testing jest jest-expo @types/jest
```

**Version verification (run before installing):**
```bash
npm view @firebase/rules-unit-testing version   # 5.0.0 as of 2026-03-25
npm view react-native-toast-message version      # 2.3.3 as of 2026-03-25
npm view jest-expo version                       # 55.0.11 as of 2026-03-25
```

---

## Architecture Patterns

### Recommended Project Structure Changes

```
components/
├── LoadingOverlay.tsx        # NEW — shared loading indicator
├── ToastProvider.tsx         # NEW — wraps Toast component for app root
├── ErrorBoundary.tsx         # NEW — generic error boundary
├── MapErrorBoundary.tsx      # NEW — MapView-specific error boundary
│
context/
├── auth-context.tsx          # EXISTING — loading flag drives splash hold
│
app/
├── _layout.tsx               # MODIFIED — add SplashScreen.preventAutoHideAsync(), ToastProvider, ErrorBoundary
│
__tests__/
├── firestore-rules/
│   ├── companies.rules.test.ts   # NEW — rules tests per collection
│   ├── requests.rules.test.ts
│   ├── trips.rules.test.ts
│   ├── drivers.rules.test.ts
│   ├── users.rules.test.ts
│   └── driverLocations.rules.test.ts
├── services/
│   ├── requestCalculations.test.ts  # NEW — pure function unit tests
│   └── firestore.test.ts            # NEW — service-level unit tests (mocked)
```

### Pattern 1: Splash Screen Hold Until Auth Resolves (D-08)

**What:** Call `SplashScreen.preventAutoHideAsync()` at module level in `_layout.tsx`. Inside `RootLayoutNav`, call `SplashScreen.hideAsync()` once `loading` from `useAuth()` becomes false.

**When to use:** Any app with async initialization (auth, onboarding state) that could cause flicker on the wrong screen.

**Key detail for this codebase:** `auth-context.tsx` already sets `loading = true` initially and flips it to `false` in both the `if (firebaseUser)` and `else` branches of `onAuthStateChanged`. The loading guard is already correct — just needs the splash hold wired to it.

**Example:**
```typescript
// app/_layout.tsx — module level (outside component)
SplashScreen.preventAutoHideAsync();

// Inside RootLayoutNav component
const { user, role, loading } = useAuth();

useEffect(() => {
  if (!loading) {
    SplashScreen.hideAsync();
  }
}, [loading]);

if (loading) {
  return null; // splash screen is still visible
}
```

Note: Remove the current `ActivityIndicator` loading spinner from `_layout.tsx` — the splash screen replaces it.

### Pattern 2: Shared LoadingOverlay Component (D-05)

**What:** A modal overlay component with ActivityIndicator + optional message text. Accepts `visible: boolean` prop. Rendered above content, not replacing it.

**When to use:** All screens with async Firebase operations: commuter request flow, driver dashboard, admin screens, auth screens.

**Migration targets (verified by grep):**
- `app/_layout.tsx` — loading spinner (replaced by splash hold, see Pattern 1)
- `app/(auth)/index.tsx` — ActivityIndicator during auth check
- `app/(admin)/index.tsx` — ActivityIndicator loading guard
- `app/(admin)/drivers.tsx` — ActivityIndicator during driver fetch
- `app/(admin)/company-setup.tsx` — ActivityIndicator during save

**Example:**
```typescript
// components/LoadingOverlay.tsx
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    </Modal>
  );
}
```

### Pattern 3: Toast Notification System (D-06)

**What:** `react-native-toast-message` provides a declarative `Toast.show()` API. A `<Toast />` component must be placed at the root of the app (inside `_layout.tsx`, outside the Stack navigator). No custom context needed — the library manages its own global state.

**When to use:** Replace every `Alert.alert('Error', ...)` call in screens and components with `Toast.show({ type: 'error', text1: 'message' })`.

**Migration targets (verified by grep):**
- Screens: `app/(commuter)/index.tsx`, `app/(driver)/index.tsx`, `app/(admin)/drivers.tsx`
- Components: `components/FindingDriverModal.tsx`, `components/ActiveTripSheet.tsx`, `components/RequestServiceSheet.tsx`, `components/CommuterTripSheet.tsx`

**Provider placement in `_layout.tsx`:**
```typescript
// app/_layout.tsx — after all providers, last child before closing tag
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        {/* ... existing providers ... */}
        <RootLayoutNav />
        <Stack>{/* screens */}</Stack>
        <Toast />  {/* must be last — renders above all other content */}
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

**Call site pattern:**
```typescript
// Replace: Alert.alert('Error', 'Could not load drivers');
// With:
import Toast from 'react-native-toast-message';
Toast.show({ type: 'error', text1: 'Could not load drivers', visibilityTime: 3000 });
```

### Pattern 4: React Error Boundaries (D-07)

**What:** Class components (error boundaries must be class components in React) that catch render errors in the subtree and display fallback UI.

**When to use:** Wrap `MapView` usage (commuter and driver screens) and the main screen group rendered by Expo Router.

**Key React 19 note:** React 19 still requires class components for error boundary `componentDidCatch`. There is no hook equivalent. The react-error-boundary package provides a functional wrapper but requires the class internally.

**Example:**
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View><Text>Something went wrong. Please restart the app.</Text></View>
      );
    }
    return this.props.children;
  }
}
```

### Pattern 5: Firestore Security Rules Tests with @firebase/rules-unit-testing v5 (D-02)

**What:** `@firebase/rules-unit-testing` v5 provides `initializeTestEnvironment()` which creates a test environment connected to a running Firestore emulator. Tests call `testEnv.authenticatedContext(uid, tokenClaims)` to get a Firestore instance with a simulated auth token.

**Critical requirement:** The Firebase emulator must be running when tests execute. Tests are NOT mocked — they hit the real emulator. This is by design: rules tests need to actually evaluate rule expressions.

**When to use:** For every collection in `firestore.rules`, write a test file verifying (a) allowed operations succeed and (b) denied operations throw PERMISSION_DENIED.

**Setup pattern:**
```typescript
// __tests__/firestore-rules/setup.ts
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

export async function setupTestEnvironment() {
  testEnv = await initializeTestEnvironment({
    projectId: 'towlink-71a59',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
  return testEnv;
}
```

**Test pattern:**
```typescript
// __tests__/firestore-rules/requests.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

it('allows commuter to create their own request', async () => {
  const commuter = testEnv.authenticatedContext('commuter-uid', { role: 'commuter' });
  // NOTE: rules use get() on users doc, so pre-seed user doc in testEnv
  await assertSucceeds(
    setDoc(doc(commuter.firestore(), 'requests', 'req-1'), { ...validRequestData })
  );
});

it('denies driver from creating a request', async () => {
  const driver = testEnv.authenticatedContext('driver-uid', { role: 'driver' });
  await assertFails(
    setDoc(doc(driver.firestore(), 'requests', 'req-1'), { ...validRequestData })
  );
});
```

**Important v5 API note:** `@firebase/rules-unit-testing` v5 dropped the v3/v4 `loadFirestoreRules()` API. The v5 API uses `initializeTestEnvironment()` only. Rule evaluation happens at write/read time, not load time.

**Role-based rule helpers use get():** The `isAdmin()`, `isDriver()`, `isCommuter()` functions in the rules call `get()` to fetch the user's doc. This means tests must pre-seed user documents in the emulator before testing role-guarded paths.

```typescript
// Pre-seed user doc so isAdmin() / isDriver() / isCommuter() resolve correctly
await testEnv.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), 'users', 'commuter-uid'), {
    role: 'commuter', email: 'c@test.com', createdAt: Timestamp.now()
  });
});
```

### Pattern 6: Jest Configuration for Expo + TypeScript (TEST-01)

**What:** `jest-expo` preset handles React Native module transforms automatically. For rules tests that run against the emulator, a separate Jest project config is recommended to avoid mixing RN transforms with Node.js emulator tests.

**jest.config.js:**
```javascript
module.exports = {
  projects: [
    {
      displayName: 'rules',
      testMatch: ['**/__tests__/firestore-rules/**/*.test.ts'],
      preset: 'ts-jest',  // or transform with ts-jest
      testEnvironment: 'node',
    },
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/services/**/*.test.ts'],
      preset: 'jest-expo',
      testEnvironment: 'node',
    },
  ],
};
```

**package.json script additions:**
```json
"test": "jest",
"test:rules": "jest --projects rules",
"test:unit": "jest --projects unit"
```

### Pattern 7: Emulator Seed Expansion (D-10)

**What:** Add new seed scenarios to `scripts/seed-emulator.js` WITHOUT touching existing entries. New scenarios: completed trip (with `completionTime`, `finalPrice`, `companyId`) and in-progress trip.

**Approach:** Append a new `seedPhase6Scenarios()` async function to the existing seed file. Call it at the end of `seed()`. Existing user creation and initial seed data remains untouched.

### Anti-Patterns to Avoid

- **Calling SplashScreen.hideAsync() unconditionally:** Must only be called once loading is false. Calling it before auth resolves defeats the purpose.
- **Placing `<Toast />` inside AuthProvider children rendered before Stack:** Toast must render last in the tree to appear above modals. See Pattern 3.
- **Testing rules with mocked Firestore:** Rules tests MUST hit a real emulator — `assertFails`/`assertSucceeds` only work against the actual rules engine.
- **Forgetting to pre-seed user docs for role-based tests:** The `isAdmin()`, `isDriver()`, `isCommuter()` helpers use Firestore `get()` calls — without the user doc, these return false and tests give misleading results.
- **Using Alert.alert in components after migration:** After toast system is in place, all `Alert.alert` calls in error paths should be replaced. Leaving some creates inconsistent UX.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast context with state + animation | react-native-toast-message | Handles z-index, animation, queue, accessibility, dismissal — ~300 lines of non-trivial RN animation code |
| Rules test assertions | Manual try/catch around Firestore calls | @firebase/rules-unit-testing `assertFails`/`assertSucceeds` | Handles PERMISSION_DENIED vs. other errors correctly; `assertFails` expects Firebase error code 'permission-denied' specifically |
| Splash screen | setTimeout or navigation guard | expo-splash-screen (already installed) | Native splash screen hold; setTimeout always has a visible flash |

**Key insight:** The toast library and rules testing library eliminate ~500 lines of custom code that would need their own edge case handling.

---

## Claude's Discretion Recommendations

### D-03: Cloud Function Server-Side Validation

**Recommendation: Do NOT duplicate Firestore rules in Cloud Functions.**

Cloud Function handlers (dispatch, claim timeouts) use the Firebase Admin SDK, which bypasses security rules entirely. Adding rule-equivalent logic to Cloud Functions would be dead code from a security perspective. The rules protect against client writes; Cloud Functions are trusted server code. Adding duplicate validation adds maintenance burden with no security benefit.

**Exception:** Input validation on Cloud Function HTTP endpoints (if any exist) should validate request parameters — but this is argument validation, not security rules.

### D-04: Request Read Scoping by Role

**Recommendation: Keep current open authenticated reads on the requests collection.**

The current rule (`allow read: if isAuthenticated()`) is appropriate for capstone scope. Scoping by role (commuters see own, drivers see searching + claimed) requires role-aware queries in every listener, adds index complexity, and would require refactoring `listenForRequests()` and related hooks. The security benefit is low: requests contain no sensitive data beyond the commuter's location and vehicle info, and all readers must be authenticated. Defer read scoping to a future production hardening phase.

---

## Common Pitfalls

### Pitfall 1: Route Flicker Persists After Splash Hold

**What goes wrong:** Even with `SplashScreen.preventAutoHideAsync()`, a brief flicker can occur if `SplashScreen.hideAsync()` is called during a render cycle before navigation resolves.

**Why it happens:** Expo Router's `<Redirect>` components fire in the same render tick as `hideAsync()`. If the Stack navigator isn't mounted yet, the redirect races with navigation.

**How to avoid:** Call `hideAsync()` in a `useEffect` (not inline during render) and add a small `useEffect` dependency on `loading` only. The existing code in `_layout.tsx` already uses `<Redirect>` declaratively (not `useEffect/router.replace`) — this is the correct pattern and avoids the navigator-not-ready warning already logged in STATE.md.

**Warning signs:** Splash disappears but a white flash appears before the commuter/driver screen.

### Pitfall 2: @firebase/rules-unit-testing v5 vs v3/v4 API

**What goes wrong:** Using v3/v4 API calls (`loadFirestoreRules()`, `apps()`, `clearFirestoreData()`) in v5 — these do not exist.

**Why it happens:** Most Stack Overflow answers and blog posts document v3/v4. The npm registry has v5 as latest (5.0.0) but the docs gap is significant.

**How to avoid:** Use only `initializeTestEnvironment()`, `testEnv.cleanup()`, `testEnv.clearFirestore()`, `testEnv.withSecurityRulesDisabled()`. Do not import from `@firebase/rules-unit-testing/dist/*` paths.

**Warning signs:** `TypeError: loadFirestoreRules is not a function`

### Pitfall 3: Jest Transform Conflicts for Rules Tests

**What goes wrong:** jest-expo preset configures transforms for React Native modules (JSX, RN internals). Rules tests run in pure Node.js and don't need these transforms — but if the same Jest config applies, it may try to transform Firebase SDK files incorrectly.

**Why it happens:** Single Jest project config with jest-expo preset applied to all tests including rules tests.

**How to avoid:** Use Jest `projects` array to separate rules tests (testEnvironment: 'node', no RN transforms) from unit tests (jest-expo preset). See Pattern 6.

**Warning signs:** `SyntaxError: Cannot use import statement in a module` in Firebase SDK files during rules test run.

### Pitfall 4: Toast Not Visible Above Modals

**What goes wrong:** Toast renders but is hidden behind Modal components (admin modals, FindingDriverModal, etc.).

**Why it happens:** `<Toast />` is placed inside a component that renders inside a Modal, or is placed before the `<Stack>` navigator in the tree.

**How to avoid:** Place `<Toast />` as the LAST child of the top-level GestureHandlerRootView in `_layout.tsx`, after the Stack navigator. See Pattern 3.

**Warning signs:** Toast visible on non-modal screens but disappears behind modals.

### Pitfall 5: User Docs Missing in Rules Tests Causes False Passes

**What goes wrong:** A test for "driver cannot create request" passes incorrectly because `isDriver()` returns false (no user doc exists) — the test passes for the wrong reason.

**Why it happens:** `isDriver()` calls `get(/databases/.../users/$(uid))` — if no user doc exists, the function returns false, making the rule deny writes even for commuters. Tests may appear to "pass" without correctly verifying the role check.

**How to avoid:** Always pre-seed the user document for the test subject using `testEnv.withSecurityRulesDisabled()` before running the test. Include a positive control test ("commuter CAN create request") alongside negative tests.

**Warning signs:** Both "commuter creates request" and "driver creates request" fail — role check is returning false for all roles.

---

## Code Examples

### Splash Screen Integration

```typescript
// app/_layout.tsx
import * as SplashScreen from 'expo-splash-screen';

// Module-level: call before any render
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null; // Splash screen is still showing
  }

  if (!user) return <Redirect href="/(auth)" />;
  if (role === 'commuter') return <Redirect href="/(commuter)" />;
  if (role === 'driver') return <Redirect href="/(driver)" />;
  if (role === 'admin') return <Redirect href="/(admin)" />;
  return <Redirect href="/(auth)/onboarding/commuter-login" />;
}
```

### Rules Test Setup and Teardown

```typescript
// __tests__/firestore-rules/requests.rules.test.ts
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'towlink-71a59',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

async function seedUser(uid: string, role: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      email: `${uid}@test.com`,
      role,
      createdAt: Timestamp.now(),
    });
  });
}

it('allows commuter to create a request for themselves', async () => {
  await seedUser('commuter-1', 'commuter');
  const ctx = testEnv.authenticatedContext('commuter-1');
  await assertSucceeds(
    setDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
      commuterId: 'commuter-1',
      location: { latitude: 34.05, longitude: -118.24 },
      dropoffLocation: { latitude: 34.06, longitude: -118.25 },
      pickupAddress: '123 Main St',
      dropoffAddress: '456 Oak Ave',
      vehicleInfo: { year: 2020, make: 'Toyota', model: 'Camry' },
      estimatedPrice: 50,
      totalTripDistance: 5,
      serviceType: 'tow',
      status: 'searching',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 600000)),
    })
  );
});

it('denies driver from creating a request', async () => {
  await seedUser('driver-1', 'driver');
  const ctx = testEnv.authenticatedContext('driver-1');
  await assertFails(
    setDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
      commuterId: 'driver-1',
      // ... same fields
    })
  );
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @firebase/rules-unit-testing v3/v4 `loadFirestoreRules()` | v5 `initializeTestEnvironment()` | Firebase 9+ (modular SDK era) | All old tutorials are wrong; must use new API |
| expo-splash-screen v2 `SplashScreen.hide()` | v31 `SplashScreen.hideAsync()` | Expo SDK 49+ | Returns a Promise; should be awaited |
| Expo Router `unstable_settings` for anchor | Still supported in expo-router v6 | — | Current code correctly uses `anchor: '(auth)'` |

**Deprecated/outdated:**
- `SplashScreen.hide()`: Deprecated in favor of `hideAsync()` — project uses expo-splash-screen v31 which has `hideAsync()`.
- `@firebase/rules-unit-testing` v3 API: `apps()`, `loadFirestoreRules()`, `initializeAdminApp()` — all removed in v5.

---

## Open Questions

1. **jest-expo compatibility with React 19 + jest 30**
   - What we know: jest-expo 55 targets Expo SDK 54 (which ships React 19.1.0). The project uses expo ~54.0.32.
   - What's unclear: Whether jest-expo 55 requires jest 29 or supports jest 30. jest 30 was released recently.
   - Recommendation: Install jest-expo 55 first and run `npx jest --version` to confirm compatibility. If conflicts, pin jest to 29.x.

2. **@firebase/rules-unit-testing v5 with Firebase JS SDK v12**
   - What we know: The project uses `firebase: ^12.4.0`. `@firebase/rules-unit-testing` v5 is designed for the modular Firebase SDK.
   - What's unclear: Whether v5 has peer dependency conflicts with firebase v12.
   - Recommendation: Run `npm install --save-dev @firebase/rules-unit-testing` and check for peer warnings before writing tests.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Rules tests, seed script | Yes | v22.17.1 | — |
| Firebase CLI | Emulator startup | Yes | 15.6.0 | — |
| Firebase Emulator (Firestore + Auth) | Rules tests, seed script | Yes (via `npm run emulators`) | — | — |
| expo-splash-screen | SEC-04 splash hold | Yes (installed) | 31.0.13 | — |
| Jest | TEST-01 | No (not installed) | — | Install via devDependencies |
| @firebase/rules-unit-testing | TEST-01 | No (not installed) | — | Install via devDependencies |
| react-native-toast-message | SEC-03 toast | No (not installed) | — | Install as dependency |

**Missing dependencies with no fallback:**
- Jest + jest-expo: Must be installed before any tests can run.
- @firebase/rules-unit-testing: Required for D-02 automated rules tests.

**Missing dependencies with fallback:**
- react-native-toast-message: Could fall back to custom context (D-06 explicitly chose this library — not a real fallback in this phase).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + jest-expo 55 |
| Config file | `jest.config.js` (does not exist — Wave 0 gap) |
| Quick run command | `npx jest --testPathPattern=services` |
| Full suite command | `npx jest` (requires emulator running for rules tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Commuters can only create their own requests | unit (rules) | `npx jest --testPathPattern=rules` | No — Wave 0 |
| SEC-01 | Only admins can write company data | unit (rules) | `npx jest --testPathPattern=rules` | No — Wave 0 |
| SEC-01 | Only drivers can write own status/location | unit (rules) | `npx jest --testPathPattern=rules` | No — Wave 0 |
| SEC-02 | All async screens show loading indicator | manual smoke | `npx expo start` — visual verification | N/A (UI) |
| SEC-03 | Firebase errors show readable toast message | manual smoke | `npx expo start` — trigger network error | N/A (UI) |
| SEC-04 | No route flicker on startup | manual smoke | Device test with auth state pre-set | N/A (UI) |
| TEST-01 | Emulator seed covers completed trip scenario | manual + unit | `npm run emulators:seed` then verify UI | Partial (expand existing) |

### Sampling Rate

- **Per task commit:** `npm run lint` (always) + `npx jest --testPathPattern=services` (unit tests only, no emulator needed)
- **Per wave merge:** `npx jest` (full suite, requires emulator running)
- **Phase gate:** Full suite green + manual smoke test on device before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `jest.config.js` — root config separating rules tests (node env) from unit tests (jest-expo)
- [ ] `__tests__/firestore-rules/setup.ts` — shared test environment factory
- [ ] `__tests__/firestore-rules/requests.rules.test.ts` — skeleton for requests collection tests
- [ ] `__tests__/firestore-rules/companies.rules.test.ts` — skeleton for companies collection tests
- [ ] Framework install: `npm install --save-dev jest jest-expo @firebase/rules-unit-testing @types/jest`
- [ ] App install: `npm install react-native-toast-message`
- [ ] `package.json` test scripts: add `"test": "jest"` entry

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|-----------|
| Educational project — guide, don't automate | Plans should explain WHY before HOW; break into learning steps |
| TypeScript strict mode | All new components/hooks must have explicit return types and typed props interfaces |
| Path alias `@/*` | All internal imports use `@/` prefix |
| Tabs indentation, single quotes | All new files follow existing prettier config |
| No `error: any` expansion | New code should use `error instanceof Error ? error.message : String(error)` pattern — do not add more `error: any` catch blocks |
| Naming: component files PascalCase, hooks kebab-case with `use-` prefix | LoadingOverlay.tsx, ErrorBoundary.tsx; no new hooks needed for this phase |
| No Maestro / E2E frameworks | Manual testing preferred; confirmed in project memory |
| Firebase emulators via `npm run emulators` | Rules tests must require emulator to be running separately |

---

## Sources

### Primary (HIGH confidence)

- Official expo-splash-screen docs (https://docs.expo.dev/versions/v54.0.0/sdk/splash-screen/) — `preventAutoHideAsync`, `hideAsync` API
- @firebase/rules-unit-testing v5 official GitHub (https://github.com/firebase/firebase-js-sdk/tree/main/packages/rules-unit-testing) — v5 API: `initializeTestEnvironment`, `assertFails`, `assertSucceeds`
- Direct inspection of `/Users/chris/projects/towlink/firestore.rules` — confirmed 6 collections with role helpers using `get()` calls
- Direct inspection of `/Users/chris/projects/towlink/context/auth-context.tsx` — confirmed `loading` boolean, auth resolution path
- Direct inspection of `/Users/chris/projects/towlink/app/_layout.tsx` — confirmed current ActivityIndicator pattern, provider tree structure
- npm registry queries (2026-03-25) — confirmed current versions of all recommended packages

### Secondary (MEDIUM confidence)

- react-native-toast-message GitHub README (https://github.com/calintamas/react-native-toast-message) — placement pattern, `Toast.show()` API, React Native 0.81 compatibility verified by package.json peer deps
- jest-expo README (https://github.com/expo/expo/tree/main/packages/jest-expo) — Expo SDK 54 / jest 29 compatibility

### Tertiary (LOW confidence)

- Jest 30 + jest-expo 55 compatibility: known from npm metadata but full peer dependency resolution not confirmed — flag as Open Question 1

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — packages verified on npm registry 2026-03-25; expo-splash-screen already installed and confirmed working version
- Architecture: HIGH — based on direct code inspection of auth-context, _layout, firestore.rules, and conventions docs
- Pitfalls: HIGH — v5 API change is documented fact; user doc pre-seeding requirement derived from direct rules inspection of isAdmin()/isDriver() get() calls
- Test patterns: MEDIUM — jest 30 + jest-expo 55 compatibility flagged as open question

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable ecosystem; @firebase/rules-unit-testing v5 is recent but stable)
