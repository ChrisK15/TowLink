# Phase 7: After-Trip Completion Screen - Research

**Researched:** 2026-03-24
**Domain:** React Native UI — full-screen overlay, Animated API, shared component with role prop
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full-screen overlay that replaces the map view when trip status becomes `completed`. Clean summary card centered on screen. Matches Uber/Lyft completion pattern
- **D-02:** Animated green checkmark that draws in when the screen appears, using React Native Animated API (no extra library)
- **D-03:** Essential info only: estimated price, pickup address, dropoff address, trip duration, distance
- **D-04:** Show the other party's name — commuter sees driver name, driver sees commuter name. Data already available from `use-active-trip` and `use-commuter-trip` hooks
- **D-05:** Single "Done" button at bottom of screen. Tapping returns to idle home/dashboard state. Back gesture also works
- **D-06:** No rating prompt for v1. Rating system deferred as a separate feature/phase
- **D-07:** Shared `TripCompletionScreen` component with a `role` prop. Same layout, swaps other party's name based on role. DRY approach
- **D-08:** Role-specific headers: driver sees "Job Complete!", commuter sees "Trip Complete!"

### Claude's Discretion

- Background color/styling of the completion screen (match existing theme)
- Exact animation timing and easing for the checkmark
- How to calculate and display trip duration (from trip timestamps or Directions API data)
- Text formatting for addresses (full address vs abbreviated)
- Whether to show a static mini-map snapshot or just text addresses

### Deferred Ideas (OUT OF SCOPE)

- Rating system (star rating for driver/commuter) — separate feature, adds data model and UI complexity
- Payment receipt with fee breakdown (base + per-mile) — deferred to v2 payments phase
- Trip history / past trips list — separate feature
</user_constraints>

---

## Summary

Phase 7 adds a full-screen trip completion overlay that appears when `trip.status === 'completed'`, giving both driver and commuter a clean summary before returning to idle state. The implementation is self-contained: no new Firebase collections, no new hooks, no new data fetching. All required data (addresses, price, timestamps, other party name) is already live in the trip document and existing hooks.

The core work is three pieces: (1) a `TripCompletionScreen` component with a `role` prop that renders role-appropriate copy and data, (2) a checkmark SVG path animation using `Animated.Value` (already the established pattern in this codebase), and (3) wiring both `app/(driver)/index.tsx` and `app/(commuter)/index.tsx` to show the overlay instead of immediately clearing trip state on `completed`.

The critical implementation detail is **state sequencing**: the screen must render while `activeTripId` / `tripId` is still set (so trip data is available), and only clear that state when the "Done" button is tapped. The current code clears `activeTripId` immediately on `completed` — this must be changed to a deferred clear.

**Primary recommendation:** Implement as a `components/TripCompletionScreen.tsx` component rendered conditionally in each screen, controlled by a `showCompletion` boolean state that is set `true` on `completed` and cleared `false` (along with trip ID cleanup) when "Done" is tapped.

---

## Standard Stack

### Core (no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native `Animated` | 0.81.5 (bundled) | Checkmark draw-in animation | Already used for all animation in app-specific components (ActiveTripSheet, CommuterTripSheet ProgressStep). D-02 locks this choice |
| React Native `Modal` | 0.81.5 (bundled) | Full-screen overlay | Already proven in this codebase (replaced BottomSheetModal in Phase 1 for iOS reliability) |
| `@expo/vector-icons` Ionicons | ^15.0.2 | Checkmark icon base or supplemental icons | Already imported in ActiveTripSheet and CommuterTripSheet |

### Not Needed / Excluded

| Library | Reason Excluded |
|---------|----------------|
| `react-native-reanimated` | Present in package.json but only used in Expo scaffold components (hello-wave, parallax). D-02 locks Animated API. Do not switch to Reanimated for this phase |
| `react-native-svg` | Not installed. SVG path animation for checkmark requires it. Use Ionicons `checkmark-circle` + Animated scale/opacity instead |
| Stripe, payments | Deferred to v2 |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Component Structure

```
components/
└── TripCompletionScreen.tsx   # New: shared completion overlay

app/(driver)/index.tsx         # Modified: show overlay, defer clear
app/(commuter)/index.tsx       # Modified: show overlay, defer clear
```

### Pattern 1: Full-Screen Overlay with React Native Modal

**What:** A `Modal` with `animationType="fade"` covering the full screen. This matches how the app already handles the `FindingDriverModal` and the Phase 1 modal replacement.

**When to use:** When a UI must fully replace the current screen without navigation — no route change, no back stack modification.

**Established precedent in this codebase:** `components/FindingDriverModal.tsx` uses `<Modal visible={visible} animationType="slide">`. The completion screen uses `animationType="fade"` for a calmer feel.

```typescript
// Pattern from FindingDriverModal.tsx — adapt for TripCompletionScreen
import { Modal, View, StyleSheet } from 'react-native';

export function TripCompletionScreen({ visible, role, trip, otherPartyName, onDone }) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* content */}
      </View>
    </Modal>
  );
}
```

**Why Modal over absolute-positioned View:** Modal renders above the keyboard, status bar, and system overlays. Absolute-positioned Views in the same render tree can be occluded by MapView on Android. The existing codebase already learned this lesson (BottomSheetModal → Modal migration in Phase 1).

### Pattern 2: Animated Checkmark with Existing Animated API

**What:** Scale + opacity animation on mount using `Animated.Value`. This is identical to the `ProgressStep` spring animation already in `ActiveTripSheet.tsx` and `CommuterTripSheet.tsx`.

**When to use:** Entry animation for success indicators. Keep it under 600ms total so it feels snappy.

```typescript
// Pattern identical to ProgressStep in ActiveTripSheet.tsx
const scaleAnim = useRef(new Animated.Value(0)).current;
const opacityAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (visible) {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }
}, [visible]);

// In render:
<Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
  <Ionicons name="checkmark-circle" size={80} color="#34C759" />
</Animated.View>
```

**Note on color:** `#34C759` (green) is the app's success color — used on `ActiveTripSheet` action button and `ProgressStep` checkmarks. The completion screen checkmark should use this same color.

### Pattern 3: State Sequencing — Deferred Clear

**What:** The critical change in both driver and commuter screens. Currently, `activeTripId` is cleared immediately on `completed`. This must become a two-step process.

**Current (broken for Phase 7) in `app/(driver)/index.tsx` lines 77-82:**
```typescript
useEffect(() => {
  if (trip?.status === 'completed' || trip?.status === 'cancelled') {
    setActiveTripId(null);  // clears trip data immediately
    ...
  }
}, [trip?.status]);
```

**Required pattern (Phase 7):**
```typescript
// Add new state
const [showCompletion, setShowCompletion] = useState(false);

// Modified effect: show overlay instead of clearing
useEffect(() => {
  if (trip?.status === 'completed') {
    setShowCompletion(true);  // show screen, keep activeTripId alive
  }
  if (trip?.status === 'cancelled') {
    setActiveTripId(null);  // cancelled still clears immediately (no summary needed)
    ...
  }
}, [trip?.status]);

// Done handler: clears everything
function handleDone() {
  setShowCompletion(false);
  setActiveTripId(null);
  // driver only: restore availability
  if (user?.uid) {
    updateDriverAvailability(user.uid, true, driverLocation ?? undefined);
  }
}
```

**Why this matters:** The `TripCompletionScreen` needs `trip`, `commuterName`/`driverName`, and `estimatedPrice` to display the summary. If `activeTripId` is cleared before the user taps Done, `useActiveTrip` / `useCommuterTrip` unsubscribes and `trip` becomes `null`.

**Commuter side:** `CommuterTripSheet.tsx` currently calls `onTripCompleted()` on `completed` (line 117-121). This callback currently sets `activeTripId` to null in the commuter screen. For Phase 7, the commuter screen should intercept `completed` before `CommuterTripSheet` calls `onTripCompleted`, OR change `CommuterTripSheet`'s `onTripCompleted` prop to accept a reason/status and gate the clear. The simpler path: watch `trip?.status` directly in the commuter screen (same pattern as driver), set `showCompletion = true`, and only call the clear when Done is tapped.

### Pattern 4: Trip Duration Calculation

**What:** How to derive display duration from existing trip data.

**Available timestamps on Trip model:**
- `startTime: Date` — set when trip doc is created (en_route begins)
- `completionTime?: Date` — set when status transitions to `completed` (via `updateTripStatus` in `firestore.ts` line 150)
- `startedAt?: Date` — set when `in_progress` begins (when driver picks up commuter)

**Recommended calculation:** `completionTime - startedAt` = service duration (pickup to dropoff). If `startedAt` is null, fall back to `completionTime - startTime` = full trip duration including drive time. Both values are already deserialized as JavaScript `Date` objects by `listenToTrip` (firestore.ts lines 348-351).

```typescript
function formatDuration(trip: Trip): string {
  const end = trip.completionTime;
  const start = trip.startedAt ?? trip.startTime;
  if (!end || !start) return '—';
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
```

### Pattern 5: TripCompletionScreen Props Interface

**What:** The shared component interface that serves both driver and commuter with a `role` prop (D-07).

```typescript
interface TripCompletionScreenProps {
  visible: boolean;
  role: 'driver' | 'commuter';
  trip: Trip;
  otherPartyName: string | null;  // commuter name (for driver) or driver name (for commuter)
  onDone: () => void;
}
```

**Why not pass the whole hook return:** Keep the component pure/presentational. Pass only what it needs to render. The parent screens own the hooks; they extract what's needed and pass it down. This also makes the component easier to test manually with seed data.

### Anti-Patterns to Avoid

- **Clearing activeTripId before showing the completion screen:** The trip data will be null by the time the screen renders. Always show first, clear on Done.
- **Using react-native-reanimated for the checkmark:** D-02 locks Animated API. Do not introduce Reanimated for this component even though it's installed.
- **Separate driver and commuter completion components:** D-07 requires a single shared component with role prop. No copy-paste variants.
- **Showing completion on `cancelled` status:** Only show the summary screen on `completed`. Cancelled trips clear immediately as today (no summary needed per scope).
- **Using `navigation.navigate` to a new route:** This is an overlay pattern, not a navigation pattern. Use Modal or conditional render, not Expo Router navigation. The existing screens stay mounted.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-screen overlay | Custom `position: absolute` View tree | React Native `Modal` | Modal renders above MapView on Android; proven in this codebase |
| Checkmark animation | Custom SVG path draw | `Ionicons` + `Animated.spring` scale | No `react-native-svg` installed; existing pattern in ProgressStep works well |
| Duration math | Directions API call | `completionTime - startedAt` arithmetic | Both timestamps already on trip document; no network call needed |
| Price display | New pricing calculation | `trip.estimatedPrice` | Already calculated and stored on trip at request creation via `calculateFare()` in `requestCalculations.ts` |

---

## Common Pitfalls

### Pitfall 1: Trip Data Disappears Before Screen Renders

**What goes wrong:** Developer sets `activeTripId = null` on `completed` (existing behavior), then tries to render `TripCompletionScreen` — trip is null, screen shows "—" everywhere.

**Why it happens:** `useActiveTrip` / `useCommuterTrip` unsubscribe from Firestore when `tripId` is null. State clears synchronously before the modal renders.

**How to avoid:** Use a `showCompletion` boolean. Keep `activeTripId` alive until user taps Done. Clear `activeTripId` only inside `handleDone()`.

**Warning signs:** Summary screen shows dashes or "Loading..." instead of trip data. Trip doc is not deleted from Firestore on completion — the data is still there; the problem is the local React state was cleared too early.

### Pitfall 2: CommuterTripSheet Races the Completion Screen

**What goes wrong:** `CommuterTripSheet` has its own `useEffect` that calls `onTripCompleted()` on status `completed`. If the commuter screen's `onTripCompleted` callback clears `activeTripId`, it fires before the completion screen can show.

**Why it happens:** Both the commuter screen and `CommuterTripSheet` watch `trip?.status`. The sheet fires its callback and the parent clears state in the same render cycle.

**How to avoid:** Modify `CommuterTripSheet`'s behavior so it no longer calls `onTripCompleted()` on `completed` — only on `cancelled`. Or, change the `onTripCompleted` callback in the commuter screen to set `showCompletion = true` instead of clearing `activeTripId`. The sheet's `onTripCompleted` prop is already wired; changing what it does (not that it fires) is the cleanest fix.

### Pitfall 3: Driver Availability Not Restored on Done

**What goes wrong:** Driver taps "Done", `activeTripId` clears, driver goes back to idle. But `updateDriverAvailability(uid, true, ...)` was previously called in the `completed` useEffect — if that effect is now suppressed in favor of showing the completion screen, availability never resets.

**Why it happens:** The `updateDriverAvailability` call in the current `completed` handler gets moved/removed when refactoring the effect.

**How to avoid:** Move `updateDriverAvailability(uid, true, driverLocation)` into `handleDone()` for the driver screen. Do not call it in the status-change useEffect anymore (for `completed` — keep it for `cancelled`).

### Pitfall 4: Back Gesture Bypasses Done Handler

**What goes wrong:** On iOS, swipe-down on Modal dismisses it without calling `onDone`. `activeTripId` stays set. Driver/commuter screen thinks there's still an active trip.

**Why it happens:** Modal's `onRequestClose` (Android back button) and iOS swipe-dismiss fire separately from the onDone prop.

**How to avoid:** Pass `onRequestClose={onDone}` to the Modal so any dismiss path calls `handleDone`. D-05 explicitly says "back gesture also works" — this is the implementation.

```typescript
<Modal
  visible={visible}
  animationType="fade"
  onRequestClose={onDone}  // Android back + iOS swipe-down
>
```

### Pitfall 5: estimatedPrice May Be Undefined

**What goes wrong:** `trip.estimatedPrice` displays as `undefined` or `NaN` instead of a dollar amount.

**Why it happens:** `Trip` type has `estimatedPrice: number` (non-optional) but `finalPrice?: number` (optional). In emulator seed data, `estimatedPrice` may not have been set. Also, the fare calculation uses the `Request` document's `estimatedPrice` field, which is copied to the trip at creation — if the request was created before `calculateFare` was wired up, it could be 0 or undefined.

**How to avoid:** Render `trip.estimatedPrice ? \`$\${trip.estimatedPrice}\` : '—'`. Do not crash on missing price; just show dash.

---

## Code Examples

### TripCompletionScreen Skeleton

```typescript
// Source: established patterns from ActiveTripSheet.tsx and FindingDriverModal.tsx

import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@/types/models';

interface TripCompletionScreenProps {
  visible: boolean;
  role: 'driver' | 'commuter';
  trip: Trip;
  otherPartyName: string | null;
  onDone: () => void;
}

export function TripCompletionScreen({
  visible, role, trip, otherPartyName, onDone,
}: TripCompletionScreenProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }).start();
    }
  }, [visible]);

  const header = role === 'driver' ? 'Job Complete!' : 'Trip Complete!';
  const otherLabel = role === 'driver' ? 'Customer' : 'Driver';
  const duration = formatDuration(trip);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onDone}>
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
        </Animated.View>
        <Text style={styles.header}>{header}</Text>
        <Text style={styles.otherParty}>{otherLabel}: {otherPartyName ?? '—'}</Text>
        {/* Summary card: price, pickup, dropoff, duration */}
        <View style={styles.summaryCard}>
          <SummaryRow label="Estimated Fare" value={trip.estimatedPrice ? `$${trip.estimatedPrice}` : '—'} />
          <SummaryRow label="Pickup" value={trip.pickupAddress || '—'} />
          <SummaryRow label="Dropoff" value={trip.dropoffAddress || '—'} />
          <SummaryRow label="Duration" value={duration} />
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

### Duration Helper

```typescript
// Source: Trip model timestamps (types/models.ts) — completionTime set by updateTripStatus()

function formatDuration(trip: Trip): string {
  const end = trip.completionTime;
  const start = trip.startedAt ?? trip.startTime;
  if (!end || !start) return '—';
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
```

### Driver Screen Integration

```typescript
// Replaces the current completed/cancelled useEffect in app/(driver)/index.tsx

const [showCompletion, setShowCompletion] = useState(false);

useEffect(() => {
  if (trip?.status === 'completed') {
    setShowCompletion(true);  // show screen, keep activeTripId alive
  } else if (trip?.status === 'cancelled') {
    setActiveTripId(null);
    if (user?.uid) {
      updateDriverAvailability(user.uid, true, driverLocation ?? undefined);
    }
  }
}, [trip?.status]);

function handleCompletionDone() {
  setShowCompletion(false);
  setActiveTripId(null);
  if (user?.uid) {
    updateDriverAvailability(user.uid, true, driverLocation ?? undefined);
  }
}

// In JSX, after <ActiveTripSheet>:
{showCompletion && trip && (
  <TripCompletionScreen
    visible={showCompletion}
    role="driver"
    trip={trip}
    otherPartyName={commuterName}
    onDone={handleCompletionDone}
  />
)}
```

### Commuter Screen Integration

```typescript
// Replaces the onTripCompleted callback behavior in app/(commuter)/index.tsx

const [showCompletion, setShowCompletion] = useState(false);
const { trip, driverName } = useCommuterTrip(activeTripId);  // already present

useEffect(() => {
  if (trip?.status === 'completed') {
    setShowCompletion(true);  // intercept before CommuterTripSheet fires
  }
}, [trip?.status]);

function handleCompletionDone() {
  setShowCompletion(false);
  setActiveTripId(null);
  setActiveRequestId(null);
}

// CommuterTripSheet onTripCompleted now only fires for cancelled:
// Option A: Pass a modified callback that ignores completed
// Option B: Update CommuterTripSheet to not call onTripCompleted on completed

// In JSX:
{showCompletion && trip && (
  <TripCompletionScreen
    visible={showCompletion}
    role="commuter"
    trip={trip}
    otherPartyName={driverName}
    onDone={handleCompletionDone}
  />
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Immediate clear on completed | Deferred clear until Done tap | Phase 7 | Trip data stays available for summary display |
| Both screens clear independently | Shared TripCompletionScreen component | Phase 7 | DRY, consistent UX for both roles |

---

## Open Questions

1. **CommuterTripSheet `onTripCompleted` on completed**
   - What we know: `CommuterTripSheet` currently calls `onTripCompleted()` for both `completed` and `cancelled` statuses (line 117-121 of `CommuterTripSheet.tsx`)
   - What's unclear: Whether to modify `CommuterTripSheet` internals (don't call on `completed`) or change what `onTripCompleted` does in the parent screen
   - Recommendation: Modify the commuter screen's `onTripCompleted` callback to only clear state for `cancelled`, and add a separate `useEffect` in the commuter screen that watches `trip?.status === 'completed'` to show the overlay. This avoids changing `CommuterTripSheet`'s existing behavior contract.

2. **Address display: full vs abbreviated**
   - What we know: `trip.pickupAddress` and `trip.dropoffAddress` are full strings (e.g., "123 Main St, Calgary, AB T2P 1B1")
   - What's unclear: Whether to truncate long addresses on the summary card
   - Recommendation: Use `numberOfLines={2}` with `ellipsizeMode="tail"` on the Text component. No truncation logic needed in code.

3. **Mini-map snapshot vs text addresses (Claude's Discretion)**
   - What we know: `react-native-maps` is installed; a static map snapshot could be shown via `MapView` with `scrollEnabled={false}` or `MapView.takeSnapshot()`
   - What's unclear: Whether this adds enough value to justify the complexity
   - Recommendation: Skip mini-map for v1. Text addresses on a clean card are sufficient and faster to implement. A map snapshot adds complexity (async, permissions, layout) that is not worth it for a summary screen.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely React Native component/UI work. No external CLIs, services, or runtimes beyond the existing project stack. All dependencies already installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework installed in this project |
| Config file | None |
| Quick run command | `npm run lint` (ESLint only) |
| Full suite command | `npm run lint` |

### Phase Requirements → Test Map

| Behavior | Test Type | How to Verify | Notes |
|----------|-----------|---------------|-------|
| Driver sees completion screen after marking trip completed | Manual | Emulator: advance trip to completed via ActiveTripSheet; confirm overlay appears | Use `npm run emulators && npm run emulators:seed` |
| Commuter sees completion screen when trip is completed | Manual | Emulator: driver completes trip; commuter screen should show overlay | Two devices or two simulator windows |
| Completion screen shows correct data (price, addresses, duration, name) | Manual | Compare screen values against Firestore trip document in emulator UI |  |
| "Done" returns driver to idle/offline state | Manual | After Done: driver should see online/offline toggle, activeTripId = null | |
| "Done" returns commuter to request button state | Manual | After Done: commuter should see "Request Roadside Assistance" button | |
| Back gesture dismisses screen and returns to idle | Manual | iOS: swipe down on Modal; Android: press back button | |
| No completion screen shown for cancelled trips | Manual | Cancel a trip during en_route; confirm no completion overlay appears | |

### Sampling Rate

- **Per task commit:** `npm run lint` — confirms no TypeScript/ESLint regressions
- **Per wave merge:** `npm run lint` + manual smoke test in emulator
- **Phase gate:** Manual verification of all 7 scenarios above before `/gsd:verify-work`

### Wave 0 Gaps

None — no test files to create. This project uses manual testing with Firebase emulators (TEST-01, confirmed in REQUIREMENTS.md and memory notes).

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 7 |
|-----------|-------------------|
| Educational project — guide, don't do | Plans should include learning steps; student implements with guidance |
| TypeScript required | `TripCompletionScreen` props must be fully typed |
| Path aliases (`@/components`, `@/hooks`, etc.) | Import the new component as `@/components/TripCompletionScreen` |
| `Animated` API established pattern | D-02 locks this; do not use Reanimated for checkmark |
| No Maestro E2E | Manual testing with emulators only (memory note confirmed) |
| React Native Modal over custom overlays | Proven choice from Phase 1 (BottomSheetModal replacement) |
| `npm run lint` for code quality | Run after implementation |

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `app/(driver)/index.tsx` — integration points at lines 77-82
- Direct code inspection: `app/(commuter)/index.tsx` — integration points and `onTripCompleted` callback
- Direct code inspection: `components/ActiveTripSheet.tsx` — `Animated.spring` pattern, checkmark animation in `ProgressStep`
- Direct code inspection: `components/CommuterTripSheet.tsx` — `onTripCompleted` race condition analysis
- Direct code inspection: `hooks/use-active-trip.ts`, `hooks/use-commuter-trip.ts` — confirmed all needed data is already returned
- Direct code inspection: `types/models.ts` — Trip interface: `startTime`, `completionTime`, `startedAt`, `estimatedPrice` all present
- Direct code inspection: `services/firebase/firestore.ts` — `completionTime: Timestamp.now()` set at line 150 on completed transition
- Direct code inspection: `services/requestCalculations.ts` — `calculateFare` price formula already used upstream
- `package.json` — confirmed React Native 0.81.5, no react-native-svg, Animated API available, `react-native-reanimated` installed but not used in app-specific components

### Secondary (MEDIUM confidence)

- React Native Modal documentation (established API, unchanged across versions): `onRequestClose` fires on Android back button and iOS modal dismiss gesture
- Expo documentation: `expo-vector-icons` Ionicons `checkmark-circle` confirmed available in @expo/vector-icons ^15.0.2

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code confirmed by direct file inspection; no new packages
- Architecture patterns: HIGH — all integration points confirmed by reading actual source files
- Pitfalls: HIGH — derived from direct analysis of current code paths and their side effects
- Duration calculation: HIGH — timestamps confirmed in Trip model and firestore.ts deserialization

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stable — React Native Animated API and Modal are not fast-moving)
