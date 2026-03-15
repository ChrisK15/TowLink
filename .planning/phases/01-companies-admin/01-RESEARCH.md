# Phase 1: Companies & Admin - Research

**Researched:** 2026-03-15
**Domain:** Firebase Firestore multi-role auth, Expo Router route groups, React Native swipe gestures, company data modeling
**Confidence:** HIGH

## Summary

This phase introduces the `companies` Firestore collection and the `admin` role into an existing React Native + Expo + Firebase JS SDK v12 project that already has commuter and driver flows working. The core technical work is: (1) extending the auth system with a third role (`admin`), (2) implementing a pre-authorization email pattern for driver invitations, (3) building two Firestore listener hooks for the admin dashboard, and (4) creating the `app/(admin)/` route group following the established pattern.

All decisions are already locked in CONTEXT.md. The implementation has no major unknowns — all building blocks (Expo Router route groups, Firestore listeners, `@gorhom/bottom-sheet`, `geofire-common`, `geocodeAddress()`) are already present and working in the codebase. The only non-trivial design decision left to Claude is whether to store a geohash alongside the company location (recommended YES for Phase 2 readiness, cost is negligible).

**Primary recommendation:** Follow the commuter/driver pattern exactly. Every new construct (hook, screen, Firestore function) has a direct analog already in the codebase — copy the pattern, change the data shape.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin Registration**
- Admin accounts are created manually via Firestore seed (developer sets role='admin' and companyId directly in Firebase console) — no in-app admin signup screen needed
- Role detection: add `'admin'` to the `role` field on the existing `users/{uid}` Firestore doc (consistent with current commuter/driver pattern)
- Admin's `users/{uid}` doc gets a `companyId` field linking them to their company document
- `AuthContext` reads role and routes `'admin'` users to a new `app/(admin)` route group

**Driver Invitation (COMP-02)**
- Mechanism: pre-authorize emails — admin adds a driver email to `companies/{id}.authorizedEmails[]` array
- Linkage timing: at driver signup — `signUpWithEmail` checks all companies' `authorizedEmails` for the new email; if found, sets `role='driver'` and `companyId` on the user doc immediately
- If email is NOT in any company's authorized list → block signup with error: "This email isn't registered with a tow yard. Contact your company admin."
- No invite email or separate invitations collection needed

**Service Area (COMP-01)**
- Stored as `serviceRadiusKm: number` on the company doc (e.g., 25 for 25 km)
- Company location stored as `location: { latitude, longitude }` — auto-geocoded from the admin's entered address using the existing Google Maps API integration (no manual coordinate entry)
- This `location` + `serviceRadiusKm` combo is what Phase 2 will use for nearest-company routing queries

**Driver Deactivation (COMP-03)**
- Admin deactivates a driver via swipe-to-deactivate on the Drivers tab row (swipe left reveals red "Deactivate" button)
- Deactivation sets `isActive: false` on the driver's record (or removes them from the active roster)

**Admin Dashboard Layout (COMP-04, COMP-05)**
- Structure: tabbed screen — Jobs tab | Drivers tab
- Jobs tab: real-time list of active requests/trips; each row shows: status badge + commuter name + service type + assigned driver name
- Drivers tab: roster of all company drivers with online/offline badge; swipe-left to deactivate
- Real-time updates via Firestore listeners (same pattern as existing `listenForRequests()` hooks)

### Claude's Discretion
- Exact visual styling of admin screens (colors, spacing, badge styles) — follow existing `constants/theme.ts`
- Whether deactivated drivers are hidden from the Drivers tab or shown with a "Deactivated" state
- Exact Firestore query used to look up authorized emails at signup (cross-collection query or subcollection)
- Geohash storage on company location (useful for Phase 2 — Claude can decide based on Phase 2 requirements)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | Admin can register a tow yard company (name, address, service area) | `geocodeAddress()` in `geoLocationUtils.ts` already converts address → lat/lng; `companies` collection schema defined; geohash via `getGeohash()` from `geofire-common` |
| COMP-02 | Admin can add a driver by registering their company email (no self-registration) | `arrayUnion` already used in codebase (firestore.ts); pre-authorization pattern maps to `companies/{id}.authorizedEmails[]` array field |
| COMP-03 | Admin can remove or deactivate a driver | `react-native-gesture-handler` (v2.28) already installed — `Swipeable` component provides swipe-to-deactivate; `updateDoc` for `isActive: false` |
| COMP-04 | Admin can view all active jobs and their statuses in real-time | `onSnapshot` pattern established in `listenForRequests()` — replicate as `listenToCompanyJobs(companyId)` filtering by `companyId` field on trips |
| COMP-05 | Admin can view which drivers are currently online | `onSnapshot` query on `users` collection where `companyId == X` and `role == 'driver'`; driver online status read from `isAvailable` field on drivers collection |
| AUTH-01 | Driver logs in with company email and is automatically associated with their tow yard | `signUpWithEmail` in `authService.ts` must query `companies` collection for matching `authorizedEmails` before creating account; on match: set `role='driver'` and `companyId` on user doc |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase (JS SDK) | ^12.4.0 | Firestore, Auth | Already integrated; all data ops go through this |
| expo-router | ~6.0.22 | File-based routing, route groups | Established pattern for `(commuter)`, `(driver)` — replicate for `(admin)` |
| react-native-gesture-handler | ~2.28.0 | Swipeable rows (driver deactivation) | Already installed; provides `Swipeable` component used in gesture contexts |
| @gorhom/bottom-sheet | ^5.2.8 | Add Driver sheet | Already installed, `BottomSheetModalProvider` already in root `_layout.tsx` |
| expo-location | ~19.0.8 | `geocodeAddress()` for company address → lat/lng | Already in `geoLocationUtils.ts` |
| geofire-common | ^6.0.0 | `geohashForLocation()` for company location geohash | Already in `geoLocationUtils.ts`; needed for Phase 2 radius queries |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons (Ionicons) | ^15.0.2 | Tab icons (Android fallback), UI icons | For `briefcase` and `people` icons on Android; iOS uses `expo-symbols` |
| expo-symbols | ~1.0.8 | Tab icons on iOS (`briefcase.fill`, `person.2.fill`) | iOS-only; already pattern in `(commuter)/_layout.tsx` via `IconSymbol` component |
| react-native-reanimated | ~4.1.1 | Swipeable row animations | Transitive dependency of `react-native-gesture-handler`; already initialized |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Swipeable` from gesture-handler | Custom PanResponder | Gesture-handler is already installed and tested; PanResponder is lower-level and more error-prone |
| `arrayUnion` for authorizedEmails | Separate `invitations` subcollection | Array is simpler for this scale; subcollection adds overhead the locked decisions explicitly reject |
| `onSnapshot` per collection | Firebase Realtime Database | Firestore is the established store; switching would be regression |

**Installation:** No new packages needed. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure

```
app/(admin)/
├── _layout.tsx          # Tabs: index (Jobs) + drivers (Drivers)
├── index.tsx            # Jobs tab — real-time active jobs list
└── drivers.tsx          # Drivers tab — roster with swipe-to-deactivate

hooks/
├── use-company-jobs.ts  # Firestore listener for active trips by companyId
└── use-company-drivers.ts  # Firestore listener for company driver roster

services/firebase/
└── firestore.ts         # Add: createCompany, addAuthorizedEmail,
                         #      deactivateDriver, listenToCompanyJobs,
                         #      listenToCompanyDrivers, findCompanyByEmail

types/
└── models.ts            # Add: Company interface; extend User.role with 'admin';
                         #      add companyId?: string to User
```

### Pattern 1: Extending AuthContext for Admin Role

**What:** Add `'admin'` to the role union type and handle the redirect in `RootLayoutNav`.
**When to use:** Every role-gated feature in this app follows this pattern.

```typescript
// context/auth-context.tsx — extend role type
interface AuthContextType {
  user: FirebaseUser | null;
  role: 'commuter' | 'driver' | 'admin' | null;  // add 'admin'
  companyId: string | null;  // add for admin/driver use
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

// In onAuthStateChanged handler — extend role check:
if (data?.role === 'commuter' || data?.role === 'driver' || data?.role === 'admin') {
  setRole(data.role);
  setCompanyId(data.companyId ?? null);  // read companyId from user doc
}

// app/_layout.tsx — add admin redirect:
if (role === 'admin') {
  return <Redirect href="/(admin)" />;
}
// Also add Stack.Screen for (admin) in the Stack navigator
```

**Source:** Existing `auth-context.tsx` — extend, don't rewrite.

### Pattern 2: Admin Tab Layout (replicate commuter pattern)

**What:** `app/(admin)/_layout.tsx` using `Expo Router Tabs` — exact same structure as `app/(commuter)/_layout.tsx`.

```typescript
// app/(admin)/_layout.tsx
export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="briefcase.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.2.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Source:** `app/(commuter)/_layout.tsx` — direct analog.

### Pattern 3: Firestore Listener Hook

**What:** Custom hook wrapping `onSnapshot` — returns typed data + loading + error. Unsubscribes on unmount.
**When to use:** All real-time data in this app uses this pattern.

```typescript
// hooks/use-company-jobs.ts
export function useCompanyJobs(companyId: string | null) {
  const [jobs, setJobs] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    const unsubscribe = listenToCompanyJobs(companyId, (updatedJobs) => {
      setJobs(updatedJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [companyId]);

  return { jobs, loading, error };
}
```

**Source:** `hooks/use-active-trip.ts` — direct analog.

### Pattern 4: Pre-Authorization Email Check at Signup

**What:** Before creating the Firebase Auth account, query Firestore for a company whose `authorizedEmails` array contains the email. If found, set `role='driver'` and `companyId` on the user doc at creation time.
**When to use:** Driver signup only (not commuter).

```typescript
// services/firebase/firestore.ts — new function
export async function findCompanyByEmail(email: string): Promise<{ id: string } | null> {
  const q = query(
    collection(db, 'companies'),
    where('authorizedEmails', 'array-contains', email)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id };
}

// services/firebase/authService.ts — modify signUpWithEmail for drivers
export async function signUpDriverWithEmail(email: string, password: string) {
  // 1. Check authorization BEFORE creating auth account
  const company = await findCompanyByEmail(email);
  if (!company) {
    throw new Error("This email isn't registered with a tow yard. Contact your company admin.");
  }
  // 2. Create auth account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  // 3. Create user doc with role and companyId already set
  await setDoc(doc(db, 'users', user.uid), {
    id: user.uid,
    email: user.email,
    role: 'driver',
    companyId: company.id,
    createdAt: Timestamp.now(),
  });
  return { userId: user.uid, email: user.email ?? email };
}
```

**Source:** Existing `signUpWithEmail` in `authService.ts` — extend with pre-check.

### Pattern 5: Swipeable Row for Driver Deactivation

**What:** `Swipeable` from `react-native-gesture-handler` wrapping each driver row. Reveals a red "Deactivate Driver" action cell on swipe-left. Tap triggers `Alert.alert()` confirmation, then `updateDoc`.

```typescript
import { Swipeable } from 'react-native-gesture-handler';

function renderRightActions() {
  return (
    <TouchableOpacity
      style={styles.deactivateAction}
      onPress={() => handleDeactivatePress(driver.id)}
    >
      <Text style={styles.deactivateText}>Deactivate Driver</Text>
    </TouchableOpacity>
  );
}

<Swipeable renderRightActions={renderRightActions}>
  <DriverRow driver={driver} />
</Swipeable>
```

**Source:** `react-native-gesture-handler` docs; `GestureHandlerRootView` already wraps the app in `_layout.tsx`.

### Pattern 6: Geohash on Company Location (Claude's Discretion — Recommended YES)

**Recommendation:** Store `geohash: string` on the company document alongside `location: { latitude, longitude }`. Cost is one extra field at write time using the already-available `getGeohash()` utility. Phase 2 needs this for `geohashQueryBounds`-based nearest-company lookups — adding it now avoids a migration.

```typescript
// In createCompany():
const coords = await geocodeAddress(address);
const company = {
  name, address,
  location: coords,
  geohash: getGeohash(coords.latitude, coords.longitude),  // free win for Phase 2
  serviceRadiusKm,
  authorizedEmails: [],
  ownerUid: adminUid,
  createdAt: Timestamp.now(),
};
```

### Anti-Patterns to Avoid

- **Calling Firebase SDK directly from screens:** All Firestore ops must go through `services/firebase/firestore.ts`. The existing codebase is consistent on this — don't break the pattern.
- **Querying `authorizedEmails` after account creation:** The auth check MUST happen before `createUserWithEmailAndPassword`. If account creation succeeds but the Firestore write fails, you have a zombie auth account with no user doc and no role.
- **Adding `'admin'` to `updateUserRole()`:** That function accepts `'commuter' | 'driver'`. Admin role is set only via manual Firestore seed — don't change `updateUserRole` to accept admin (it would create a privilege escalation path).
- **Using `role-selection.tsx` for driver signup routing:** The existing `signup.tsx` routes to `/role-selection` after account creation — that flow needs to be bypassed for drivers (they already have their role assigned). Create a separate `signUpDriverWithEmail` function rather than modifying the existing `signUpWithEmail`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture for deactivation | Custom `PanResponder` | `Swipeable` from `react-native-gesture-handler` | Gesture-handler handles velocity thresholds, snap animation, accessibility; already installed |
| Bottom sheet for Add Driver | Custom modal with animation | `@gorhom/bottom-sheet` | Already installed; `BottomSheetModalProvider` in root; handles keyboard avoidance, backdrop, spring physics |
| Address → coordinates | Google Maps API direct call | `geocodeAddress()` from `geoLocationUtils.ts` | Already implemented using `expo-location`; handles null results |
| Company location geohash | Custom geohash algorithm | `getGeohash()` from `geoLocationUtils.ts` | Already wraps `geofire-common`; matches what Phase 2 queries will expect |
| Real-time list | Polling / manual refresh | `onSnapshot` via `listenToCompanyJobs` hook | WebSocket-based; zero battery drain from polling; already the established pattern |
| Array membership query | Fetch all companies + filter in JS | `where('authorizedEmails', 'array-contains', email)` Firestore query | Server-side filtering; scales; available in Firebase JS SDK v12 |

**Key insight:** Every problem in this phase has a solution already present in the codebase. The work is wiring, not inventing.

---

## Common Pitfalls

### Pitfall 1: Auth Account Created Before Email Check

**What goes wrong:** Driver completes Firebase Auth account creation, then the `authorizedEmails` query runs and finds no match — but the auth account already exists. The user doc has `role: null` and no `companyId`. The driver is stuck: they can't log in (routed to `/(auth)/onboarding/commuter-login`), and can't sign up again (email-already-in-use).

**Why it happens:** `createUserWithEmailAndPassword` is called before the Firestore check.

**How to avoid:** Always query `findCompanyByEmail` FIRST. Only call `createUserWithEmailAndPassword` if the company lookup succeeds.

**Warning signs:** Auth users in Firebase console with no corresponding Firestore `users` doc.

### Pitfall 2: `RootLayoutNav` Missing Admin Redirect

**What goes wrong:** Admin logs in, `role` resolves to `'admin'` in AuthContext, but `RootLayoutNav` falls through to `role === null` branch and redirects to the commuter login screen.

**Why it happens:** The existing `if/else` chain in `RootLayoutNav` only handles `'commuter'`, `'driver'`, and `null`. Adding `'admin'` to the role type without adding the redirect case.

**How to avoid:** Add `if (role === 'admin') return <Redirect href="/(admin)" />` AND register `(admin)` as a `Stack.Screen` in the root `Stack` navigator.

**Warning signs:** Admin gets redirected to commuter login after successful sign-in.

### Pitfall 3: `(admin)` Stack.Screen Not Registered

**What goes wrong:** Expo Router throws "Unmatched route" for `/(admin)` at runtime even though the file exists.

**Why it happens:** The root `_layout.tsx` only has `Stack.Screen` entries for `(auth)`, `(commuter)`, `(driver)`. The new `(admin)` group must be registered.

**How to avoid:** Add `<Stack.Screen name="(admin)" options={{ headerShown: false }} />` to the `Stack` in `app/_layout.tsx`.

### Pitfall 4: Firestore `array-contains` Requires No Composite Index for Single Field

**What:** `where('authorizedEmails', 'array-contains', email)` on the `companies` collection requires no composite index. However, combining `array-contains` with a second `where` clause requires a composite index.

**How to avoid:** Keep `findCompanyByEmail` to a single `array-contains` clause. Don't add a second filter (e.g., `where('isActive', '==', true)`) — that forces a composite index that must be created in Firebase console.

### Pitfall 5: `refreshRole` Does Not Read `companyId`

**What goes wrong:** After admin logs in, `companyId` is null in AuthContext because `refreshRole()` only reads `role`, not `companyId`. Hooks that take `companyId` from context receive null and return empty data.

**Why it happens:** `refreshRole` in `auth-context.tsx` only sets `role` — it doesn't read `companyId`. This needs to be extended alongside role.

**How to avoid:** Update `refreshRole` to also call `setCompanyId(data.companyId ?? null)` in the same read.

### Pitfall 6: Driver Signup Screen Routing

**What goes wrong:** The existing `signup.tsx` calls `signUpWithEmail` and then routes to `/role-selection`. For drivers, this is wrong — role is already assigned at signup. If the driver hits role-selection, they could accidentally set themselves as a commuter.

**Why it happens:** The existing signup screen was built before the B2B pivot.

**How to avoid:** Create a separate driver signup screen (or modify routing based on returned role). After `signUpDriverWithEmail` succeeds, route directly to `/(driver)` (or let `AuthContext` role redirect handle it).

---

## Code Examples

Verified patterns from existing codebase:

### Firestore `array-contains` Query

```typescript
// Source: Firebase JS SDK v12 docs + geofire-common already in codebase
import { collection, query, where, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'companies'),
  where('authorizedEmails', 'array-contains', email)
);
const snapshot = await getDocs(q);
// snapshot.empty → email not authorized
// snapshot.docs[0].id → the companyId
```

### `arrayUnion` for Adding Authorized Email

```typescript
// Source: arrayUnion already imported and used in firestore.ts (claimRequest function)
import { arrayUnion, updateDoc, doc } from 'firebase/firestore';

await updateDoc(doc(db, 'companies', companyId), {
  authorizedEmails: arrayUnion(email),
});
```

### Firestore Listener with companyId Filter

```typescript
// Pattern from listenForRequests() in firestore.ts — add companyId filter
export function listenToCompanyJobs(
  companyId: string,
  callback: (trips: Trip[]) => void,
) {
  const q = query(
    collection(db, 'trips'),
    where('companyId', '==', companyId),
    where('status', 'in', ['en_route', 'arrived', 'in_progress', 'claimed', 'searching']),
  );
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Trip[];
    callback(trips);
  });
}
```

**Note:** The existing `trips` collection does not yet have a `companyId` field. Phase 1 does not create trips directly — it reads them. The dashboard query for jobs must adapt to available data (requests + trips). See Open Questions.

### `Swipeable` Row Pattern

```typescript
// Source: react-native-gesture-handler Swipeable API
// GestureHandlerRootView already wraps entire app in _layout.tsx
import { Swipeable } from 'react-native-gesture-handler';

const renderRightActions = (driverId: string) => () => (
  <TouchableOpacity
    style={{ backgroundColor: '#FF3B30', justifyContent: 'center',
             paddingHorizontal: 20, minHeight: 44 }}
    onPress={() => confirmDeactivate(driverId)}
  >
    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
      Deactivate Driver
    </Text>
  </TouchableOpacity>
);

<Swipeable renderRightActions={renderRightActions(driver.id)}>
  <DriverRowContent driver={driver} />
</Swipeable>
```

### `Company` TypeScript Interface

```typescript
// To add to types/models.ts
export interface Company {
  id: string;
  name: string;
  address: string;
  location: Location;       // { latitude, longitude }
  geohash: string;          // for Phase 2 radius queries
  serviceRadiusKm: number;
  authorizedEmails: string[];
  ownerUid: string;
  createdAt: Date;
}
```

### Extending User Interface

```typescript
// types/models.ts — extend existing User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'commuter' | 'driver' | 'admin' | 'both' | null;  // add 'admin'
  companyId?: string;   // add — links driver/admin to their company
  phone?: string;
  createdAt: Date;
  rating?: number;
  isActive?: boolean;   // add — for driver deactivation state
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Independent driver marketplace | B2B company dispatch (tow yards as customers) | 2026-03-15 pivot | Drivers must belong to a company; standalone driver auth is invalid |
| `role: 'commuter' \| 'driver'` | `role: 'commuter' \| 'driver' \| 'admin'` | This phase | Admin route group and company management unlock |
| No company entity in Firestore | `companies/{companyId}` collection | This phase | All Phase 2 dispatch routing depends on company geolocation data |

**Deprecated/outdated:**
- The existing `signup.tsx` screen's post-signup routing (goes to `/role-selection`) is incompatible with driver auth post-pivot — drivers get their role assigned at signup, not from a role picker.
- The `drivers` Firestore collection (`updateDriverAvailability` writes to `drivers/{driverId}`) is a separate collection from `users`. Phase 1 driver roster queries should target `users` where `role == 'driver' && companyId == X`, not the `drivers` collection (which stores availability/geolocation state, not identity).

---

## Open Questions

1. **Do active jobs in the dashboard query `trips` or `requests`?**
   - What we know: The `trips` collection stores in-progress jobs (en_route → completed). The `requests` collection stores the initial booking (searching → accepted). Phase 1 context says "active requests/trips" with statuses like `pending`, `claimed`, `en_route`, etc.
   - What's unclear: Which collection should the Jobs tab listen to? `trips` has no `companyId` field yet. `requests` has the `searching`/`claimed` statuses but no assigned driver yet.
   - Recommendation: Listen to both — a `requests` listener (for `searching`/`claimed` status) AND a `trips` listener (for `en_route`/`arrived`/`in_progress`). Both must be filtered by `companyId` once that field is added. For Phase 1, the simplest viable approach is to listen to `trips` only and accept that "searching" jobs won't appear (they don't have a `companyId` yet — that's a Phase 2 dispatch concern). Flag this tradeoff with the user before implementing.

2. **Should the driver signup screen be a new screen or a modification of existing `signup.tsx`?**
   - What we know: `signup.tsx` is the existing driver signup entry point, called from `role-selection.tsx` via "Continue as Driver". It uses `signUpWithEmail` which creates accounts with `role: null`.
   - What's unclear: Is `signup.tsx` used for anything else? Can it be safely modified?
   - Recommendation: Create a new `signUpDriverWithEmail` function in `authService.ts` (doesn't break existing `signUpWithEmail` used for commuters). Modify `signup.tsx` to call the new function — since it's already the driver signup screen, updating it is appropriate. The post-signup routing can rely on `AuthContext` role redirect rather than explicit `router.replace`.

3. **Driver online/offline status source**
   - What we know: The `drivers` Firestore collection has `isAvailable: boolean`. The `users` collection has `role` and will get `companyId`. The Drivers tab shows "Online/Offline" per driver.
   - What's unclear: Should `listenToCompanyDrivers` join data from `users` + `drivers`, or is `isAvailable` redundantly stored on the `users` doc?
   - Recommendation: Keep the two-collection design (users for identity, drivers for availability state). The `listenToCompanyDrivers` hook queries `users` where `companyId == X` to get the roster, then reads availability from the `drivers` collection by `userId`. This is a two-query approach but consistent with existing architecture.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no Jest, Vitest, or test runner configured in project |
| Config file | Wave 0 gap — see below |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

This is a React Native / Expo project with no test infrastructure currently in place. The project's REQUIREMENTS.md shows `TEST-01` (Maestro E2E) is deferred to Phase 5. For Phase 1, validation should be **manual smoke testing** using the Expo development server and Firebase Emulator Suite.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Company doc created in Firestore with correct fields | manual-smoke | n/a — no test runner | Wave 0 gap |
| COMP-02 | Email added to `authorizedEmails[]`; driver signup succeeds | manual-smoke | n/a | Wave 0 gap |
| AUTH-01 | Unauthorized email blocked with correct error message | manual-smoke | n/a | Wave 0 gap |
| COMP-03 | Driver row shows "Deactivated" chip after swipe+confirm | manual-smoke | n/a | Wave 0 gap |
| COMP-04 | Jobs tab updates in real-time when Firestore trip doc changes | manual-smoke | n/a | Wave 0 gap |
| COMP-05 | Drivers tab shows Online/Offline badge reflecting `isAvailable` | manual-smoke | n/a | Wave 0 gap |

**Justification for manual-only:** React Native component testing (Jest + `@testing-library/react-native`) requires significant setup effort and is blocked by the New Architecture (`newArchEnabled: true`) requiring specific Jest config. Since TEST-01 (Maestro E2E) is the chosen testing strategy for this project (Phase 5), introducing a separate unit test framework in Phase 1 would create maintenance overhead that contradicts the educational project's scope.

### Sampling Rate

- **Per task commit:** Manual: launch app in Expo Go/simulator, exercise the changed feature
- **Per wave merge:** Manual: run through all 5 success criteria from CONTEXT.md
- **Phase gate:** All 5 success criteria verifiably TRUE before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No automated test infrastructure — deferred to Phase 5 (TEST-01 Maestro). Manual validation protocol is the gate for this phase.
- [ ] Firebase Emulator config (`firebase.json` emulators section) — verify emulators are configured for auth + firestore before implementation begins
- [ ] Firestore seed script for admin user — developer needs a script or documented steps to create the first admin account (Firebase console: set `users/{uid}.role = 'admin'` and `users/{uid}.companyId = {companyId}`)

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — `auth-context.tsx`, `authService.ts`, `firestore.ts`, `types/models.ts`, `app/_layout.tsx`, `app/(commuter)/_layout.tsx`, `hooks/use-active-trip.ts` — all patterns verified by direct file read
- `package.json` — all dependency versions verified by direct file read
- `services/geoLocationUtils.ts` — `geocodeAddress()`, `getGeohash()`, `getGeohashQueryBounds()` verified available

### Secondary (MEDIUM confidence)

- Firebase JS SDK v12 Firestore `array-contains` query — standard documented operator; used pattern (`where` + `getDocs`) already in codebase
- `react-native-gesture-handler` v2 `Swipeable` API — `GestureHandlerRootView` already in root layout confirming library is active; `Swipeable` is the standard swipe-action component for this library
- `@gorhom/bottom-sheet` v5 — `BottomSheetModalProvider` confirmed in root `_layout.tsx`; API stable across v4→v5 for basic sheet usage

### Tertiary (LOW confidence)

- None — all claims in this document are grounded in the existing codebase or Firebase/Expo official APIs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by package.json and direct file reads
- Architecture: HIGH — all patterns exist in codebase; research is about wiring, not discovery
- Pitfalls: HIGH — derived from direct code analysis of existing files (auth-context.tsx, signup.tsx, firestore.ts)
- Test infrastructure: HIGH (for the absence) — no test config files found anywhere in project root

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable — Firebase JS SDK v12, Expo 54, react-native-gesture-handler v2 are all stable releases)
