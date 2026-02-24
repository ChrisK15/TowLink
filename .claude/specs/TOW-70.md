# Technical Specification: TOW-70

## Story Reference

**Title**: Trip State Machine & Progress Tracking
**Epic**: EPIC 3 - Driver Job Management (TOW-3)
**Points**: 5 | **Sprint**: TOW Sprint 2 (active)
**Jira**: https://chriskelamyan115.atlassian.net/browse/TOW-70

**User Story**: As a driver, I want to progress through trip stages with clear visual feedback so that I can complete the service workflow step-by-step.

**Key Acceptance Criteria**:

- Trip progresses through states: `en_route` -> `arrived` -> `in_progress` -> `completed`
- Action button in the ActiveTripSheet updates its label per state:
  - `en_route`: "I've Arrived"
  - `arrived`: "Start Service"
  - `in_progress`: "Complete Trip"
- Pressing the button transitions to the next state and writes to Firestore
- Timestamps recorded for each transition: `arrivedAt`, `startedAt`, `completedAt`
- Checklist shows 3 steps with dynamic completion/active highlighting:
  1. "Drive to pickup location" (subtitle: pickup address) — complete when status leaves `en_route`
  2. "Provide service" (subtitle: service type) — complete when status leaves `arrived`
  3. "Complete drop-off" (subtitle: dropoff address) — complete when status is `completed`
- Checkmarks animate when a step completes
- Button disabled while Firestore update is in-flight
- Error handling: show error message and re-enable button on failure

---

## Current State Analysis

**What TOW-68 already built** (do NOT re-implement these):

- `components/ActiveTripSheet.tsx` — fully rendered bottom sheet with:
  - `STATUS_LABELS` and `ACTION_LABELS` lookup maps already in place
  - `ProgressStep` sub-component renders a dot + label row
  - `handleStatusUpdate()` already calls `updateTripStatus(trip.id, nextStatus)`
  - `NEXT_STATUS` map: `en_route → arrived → in_progress → completed`
  - Three `<ProgressStep>` calls with correct `done`/`active` logic
  - A green action button that shows when an action label exists

- `services/firebase/firestore.ts` — `updateTripStatus()` already handles:
  - Writing `arrivalTime: Timestamp.now()` when status becomes `arrived`
  - Writing `completionTime: Timestamp.now()` when status becomes `completed`
  - Basic `updateDoc` for all other statuses

- `hooks/use-active-trip.ts` — real-time Firestore listener returns `trip` with live status updates

- `types/models.ts` — `Trip` interface has `arrivalTime?: Date` and `completionTime?: Date`

**What is missing / incomplete** (what TOW-70 actually needs to deliver):

1. `updateTripStatus` does NOT record a `startedAt` timestamp for the `in_progress` transition.
2. The Trip TypeScript interface has no `startedAt` field — it needs to be added.
3. The `handleStatusUpdate` in `ActiveTripSheet` has no loading state — button stays pressable during the async call, allowing double-taps.
4. There is no error feedback displayed in the UI (only `Alert.alert` on error, which is minimal but acceptable — this could be enhanced).
5. The `ProgressStep` component shows a dot but no checkmark icon when `done === true`. The acceptance criteria calls for a visible checkmark.
6. Each `ProgressStep` shows only a label, no subtitle (pickup address, service type, dropoff address). The acceptance criteria specifically requires subtitles.
7. No animation on step completion (the dot changes color via style, but there is no animate-in effect when done transitions from false to true).

**Scope decision**: TOW-70 is specifically about completing the state machine and progress checklist UX. The foundation is already in place. The work is targeted improvements to `ActiveTripSheet.tsx`, a small addition to `firestore.ts`, and a one-line addition to `types/models.ts`.

---

## Architecture Overview

The state machine logic is already fully wired end-to-end from TOW-68. The Firestore listener in `use-active-trip.ts` pushes status changes into `trip.status`, which flows as a prop into `ActiveTripSheet`. When the driver presses the action button, `updateTripStatus` writes the new status to Firestore, Firestore triggers the listener, and `trip.status` updates — causing the button label, progress steps, and status badge to all re-render automatically.

TOW-70's job is to:

1. Fill the gap in the state machine (`startedAt` timestamp)
2. Harden the button (loading state, disable during in-flight request)
3. Upgrade the progress checklist (subtitles, checkmark icons, completion animation)

No new hooks, screens, or Firestore collections are needed.

```
Driver presses action button
  └── handleStatusUpdate() sets isUpdating = true (button disabled)
        └── updateTripStatus(trip.id, nextStatus)
              └── Firestore trips/{tripId} updated (status + timestamp)
                    └── onSnapshot fires in use-active-trip.ts
                          └── trip prop updates in ActiveTripSheet
                                └── UI re-renders:
                                      - Button label changes
                                      - Status badge changes
                                      - ProgressStep marks previous step done
                                      - Checkmark animates in
  └── handleStatusUpdate() sets isUpdating = false (button re-enabled)
```

---

## Technical Requirements

### Frontend Components

**Files to modify:**

- `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
  - Add `isUpdating` loading state to `handleStatusUpdate`
  - Disable action button while `isUpdating === true`
  - Add `subtitle` prop to `ProgressStep` component
  - Pass pickup address, service type, and dropoff address as subtitles to the three steps
  - Replace the plain dot with a checkmark icon when `done === true`
  - Add an `Animated.Value` scale animation to the checkmark that plays when `done` transitions from false to true

- `/Users/chris/projects/towlink/services/firebase/firestore.ts`
  - Add `startedAt: Timestamp.now()` to the `in_progress` branch of `updateTripStatus`

**Files to modify (minor):**

- `/Users/chris/projects/towlink/types/models.ts`
  - Add `startedAt?: Date` field to the `Trip` interface

**Files NOT to touch:**

- `hooks/use-active-trip.ts` — no changes needed
- `app/(driver)/index.tsx` — no changes needed
- `app/(driver)/_layout.tsx` — no changes needed

---

### TypeScript Types / Interfaces

**Add to `types/models.ts`** — one new optional field on the `Trip` interface:

```typescript
export interface Trip {
	id: string;
	requestId: string;
	commuterId: string;
	driverId: string;
	status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
	pickupLocation: Location;
	dropoffLocation: Location;
	pickupAddress: string;
	dropoffAddress: string;
	startTime: Date;
	arrivedAt?: Date; // renamed from arrivalTime for consistency (see note below)
	startedAt?: Date; // NEW — recorded when status becomes 'in_progress'
	completedAt?: Date; // renamed from completionTime for consistency (see note below)
	distance: number;
	estimatedPrice: number;
	finalPrice?: number;
	driverPath: Location[];
}
```

**IMPORTANT naming note**: The existing Firestore data and TypeScript model use `arrivalTime` and `completionTime`. The story acceptance criteria uses `arrivedAt`, `startedAt`, `completedAt`. To avoid a breaking migration mid-sprint, the spec recommends keeping the existing field names (`arrivalTime`, `completionTime`) and simply adding `startedAt` as the new field. Rename only if the team decides to do a data migration. The code-coach should flag this decision to the student.

**Revised recommendation — keep existing names, just add the missing one:**

```typescript
// Add only this one field to the existing Trip interface:
startedAt?: Date;  // recorded when status transitions to 'in_progress'
```

**New internal type in `ActiveTripSheet.tsx`** for the progress step data:

```typescript
interface ProgressStepData {
	label: string;
	subtitle: string;
	done: boolean;
	active: boolean;
}
```

---

### State Machine Logic

The state machine is already defined in `ActiveTripSheet.tsx` as:

```typescript
const NEXT_STATUS = {
	en_route: 'arrived',
	arrived: 'in_progress',
	in_progress: 'completed',
} as const;
```

**No changes needed to the transition map.** The machine is linear and correct.

**What needs to be added is an `isUpdating` guard in the action handler:**

```typescript
// Existing (incomplete):
async function handleStatusUpdate() {
  const NEXT_STATUS = { ... } as const;
  if (!trip) return;
  try {
    const nextStatus = NEXT_STATUS[trip.status as keyof typeof NEXT_STATUS];
    if (!nextStatus) return;
    await updateTripStatus(trip.id, nextStatus);
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
}

// Required (complete):
const [isUpdating, setIsUpdating] = useState(false);

async function handleStatusUpdate() {
  const NEXT_STATUS = {
    en_route: 'arrived',
    arrived: 'in_progress',
    in_progress: 'completed',
  } as const;
  if (!trip || isUpdating) return;

  const nextStatus = NEXT_STATUS[trip.status as keyof typeof NEXT_STATUS];
  if (!nextStatus) return;

  try {
    setIsUpdating(true);
    await updateTripStatus(trip.id, nextStatus);
    // No setIsUpdating(false) here — Firestore listener will update trip.status,
    // causing the button label to change. The button re-enables after state updates.
    // See Edge Cases section for why this matters.
  } catch (error: any) {
    Alert.alert('Error', error.message ?? 'Failed to update trip status. Please try again.');
    setIsUpdating(false); // Only re-enable on failure
  }
}
```

**Why not call `setIsUpdating(false)` in `finally`?** Because when the Firestore write succeeds, the `onSnapshot` listener fires and updates `trip.status`. At that point, the `ACTION_LABELS[trip.status]` changes, which naturally changes what the button does next. If you re-enable the button in `finally` before the listener fires, there is a brief window where the user can tap the button twice and advance two states. By only re-enabling on error, the state machine stays clean. The re-render from the Firestore update is typically immediate (under 500ms on a good connection).

**The button render:**

```typescript
{ACTION_LABELS[trip?.status ?? ''] && (
  <TouchableOpacity
    style={[
      styles.actionButton,
      isUpdating && styles.actionButtonDisabled,
    ]}
    onPress={handleStatusUpdate}
    disabled={isUpdating}
  >
    {isUpdating ? (
      <ActivityIndicator color="white" />
    ) : (
      <Text style={styles.actionButtonText}>
        {ACTION_LABELS[trip?.status ?? '']}
      </Text>
    )}
  </TouchableOpacity>
)}
```

---

### Firestore Update Function

**File**: `/Users/chris/projects/towlink/services/firebase/firestore.ts`

**Current implementation** (lines 123-147) — the `in_progress` branch falls into the else and does not write a timestamp:

```typescript
export async function updateTripStatus(
	tripId: string,
	status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled',
): Promise<void> {
	try {
		if (status === 'arrived') {
			await updateDoc(doc(db, 'trips', tripId), {
				status: status,
				arrivalTime: Timestamp.now(), // existing
			});
		} else if (status === 'completed') {
			await updateDoc(doc(db, 'trips', tripId), {
				status: status,
				completionTime: Timestamp.now(), // existing
			});
		} else {
			await updateDoc(doc(db, 'trips', tripId), {
				status: status,
				// no timestamp — problem for in_progress
			});
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
}
```

**Required change** — add an `in_progress` branch:

```typescript
} else if (status === 'in_progress') {
  await updateDoc(doc(db, 'trips', tripId), {
    status: status,
    startedAt: Timestamp.now(),  // NEW
  });
} else {
  await updateDoc(doc(db, 'trips', tripId), {
    status: status,
  });
}
```

**Firestore document structure after all transitions complete:**

```javascript
trips/{tripId} {
  status: 'completed',
  startTime: Timestamp,      // set at trip creation (en_route)
  arrivalTime: Timestamp,    // set when driver taps "I've Arrived"
  startedAt: Timestamp,      // set when driver taps "Start Service" (NEW)
  completionTime: Timestamp, // set when driver taps "Complete Trip"
  // ...all other existing fields unchanged
}
```

**Security Rules**: No changes needed. Development rules allow all writes. Production rules (Phase 4) will restrict trip updates to the assigned driver only — already designed in ARCHITECTURE.md.

---

### UI Component Breakdown

#### ProgressStep — Enhanced Version

The existing `ProgressStep` component:

```typescript
function ProgressStep({ label, done, active }: {
  label: string;
  done: boolean;
  active: boolean;
}) { ... }
```

**Required enhancements:**

1. Add `subtitle: string` prop
2. Show subtitle text below the label (smaller, muted color)
3. Replace the plain dot with a checkmark icon when `done === true`
4. Animate the checkmark scaling in when the step completes

**Enhanced signature:**

```typescript
function ProgressStep({
  label,
  subtitle,
  done,
  active,
}: {
  label: string;
  subtitle: string;
  done: boolean;
  active: boolean;
}) { ... }
```

**Checkmark icon**: Use `@expo/vector-icons` which is already installed in the project. The `Ionicons` set has a `checkmark-circle` icon that is clean and well-suited.

```typescript
import { Ionicons } from '@expo/vector-icons';

// In ProgressStep:
{done ? (
  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
) : (
  <View style={[
    stepStyles.dot,
    active && stepStyles.dotActive,
  ]} />
)}
```

**Completion animation**: Use `Animated.Value` with a scale spring to pop the checkmark in when it first appears.

```typescript
function ProgressStep({ label, subtitle, done, active }) {
  const scaleAnim = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    if (done) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }).start();
    }
  }, [done]);

  return (
    <View style={stepStyles.row}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {done ? (
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
        ) : (
          <View style={[stepStyles.dot, active && stepStyles.dotActive]} />
        )}
      </Animated.View>
      <View style={stepStyles.textContainer}>
        <Text style={[stepStyles.label, done && stepStyles.labelDone, active && stepStyles.labelActive]}>
          {label}
        </Text>
        <Text style={stepStyles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}
```

**Note on `useNativeDriver: true`**: Scale transforms CAN use the native driver. This is a performance win — unlike height animations (which must use JS thread), transform animations run on the native thread.

#### Progress Steps Data

The three steps need subtitles derived from the `trip` prop. In the parent `ActiveTripSheet`, the steps should be built as data, not hardcoded JSX calls:

```typescript
// Build step data from trip prop
const steps: ProgressStepData[] = [
  {
    label: 'Drive to pickup location',
    subtitle: trip?.pickupAddress ?? 'Loading...',
    done: ['arrived', 'in_progress', 'completed'].includes(trip?.status ?? ''),
    active: trip?.status === 'en_route',
  },
  {
    label: 'Provide service',
    subtitle: 'Towing',  // serviceType is always 'tow' in MVP
    done: ['in_progress', 'completed'].includes(trip?.status ?? ''),
    active: trip?.status === 'arrived',
  },
  {
    label: 'Complete drop-off',
    subtitle: trip?.dropoffAddress ?? 'Loading...',
    done: trip?.status === 'completed',
    active: trip?.status === 'in_progress',
  },
];

// Then render:
{steps.map((step, index) => (
  <ProgressStep
    key={index}
    label={step.label}
    subtitle={step.subtitle}
    done={step.done}
    active={step.active}
  />
))}
```

#### Loading and Error States

**Loading (during Firestore write)**:

- `isUpdating === true` — button shows `<ActivityIndicator color="white" />` instead of text
- Button has reduced opacity (`styles.actionButtonDisabled`)
- `disabled={isUpdating}` prevents any tap event

**Error (Firestore write fails)**:

- `Alert.alert('Error', message)` — matches the existing pattern used throughout the codebase
- `setIsUpdating(false)` — button re-enables so driver can retry

**No retry mechanism** is needed beyond the re-enabled button. The acceptance criteria says "retry mechanism if network error" — re-enabling the button satisfies this since the driver can simply press again.

---

## Implementation Steps

### Step 1: Add `startedAt` to the Trip type

**File**: `/Users/chris/projects/towlink/types/models.ts`
**Action**: Add one optional field to the existing `Trip` interface.
**What to learn**: TypeScript optional fields with `?`. Why timestamps matter for analytics.

Add the line `startedAt?: Date;` after `arrivalTime?: Date;` in the Trip interface.

---

### Step 2: Add `startedAt` timestamp to `updateTripStatus`

**File**: `/Users/chris/projects/towlink/services/firebase/firestore.ts`
**Action**: Add an `else if (status === 'in_progress')` branch that writes `startedAt: Timestamp.now()`.

**What to learn**: Why each state transition should record a timestamp. How `Timestamp.now()` differs from `new Date()` in Firestore.

**Hint**: The pattern is already there for `arrived` and `completed`. Mirror it exactly for `in_progress`.

**Test this step**: After saving, go to the Firebase Console and accept a test request. Tap "Start Service". Verify the `startedAt` field appears in the Firestore trips document.

---

### Step 3: Add `isUpdating` state to `handleStatusUpdate`

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Add `const [isUpdating, setIsUpdating] = useState(false);` and update `handleStatusUpdate` to set it before the async call and reset it on error only.

**What to learn**: Why disabling UI during async operations prevents bugs. The pattern of "optimistic disable, re-enable on error only."

**Hint**: Add `isUpdating` to the guard at the top of `handleStatusUpdate`:

```typescript
if (!trip || isUpdating) return;
```

Set it to `true` before `await updateTripStatus(...)`. In the `catch` block, set it back to `false`.

---

### Step 4: Update the action button to show loading state

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Wrap the button in a `disabled={isUpdating}` prop and conditionally render an `ActivityIndicator` instead of text when `isUpdating` is true.

**What to learn**: The `disabled` prop on `TouchableOpacity`. Conditional rendering with ternary expressions. `ActivityIndicator` from `react-native`.

**Import needed**: `ActivityIndicator` from `'react-native'` (add to existing import).

**Style needed**: Add to `styles`:

```typescript
actionButtonDisabled: {
  opacity: 0.6,
},
```

---

### Step 5: Add `subtitle` prop to `ProgressStep`

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Extend the `ProgressStep` function signature to include `subtitle: string`. Add a `<Text>` below the label text to render it.

**What to learn**: How component props evolve as requirements grow. Vertical text layout using a wrapping `<View>`.

**Style needed**:

```typescript
// In stepStyles:
textContainer: {
  flex: 1,
},
subtitle: {
  fontSize: 12,
  color: '#999',
  marginTop: 2,
},
labelActive: {
  color: '#000',
  fontWeight: '600',
},
```

**Row layout change**: The `stepStyles.row` currently has `flexDirection: 'row'` and `alignItems: 'center'`. When the text block is two lines, change `alignItems` to `'flex-start'` so the dot aligns to the top of the text, not the vertical center.

---

### Step 6: Replace dot with checkmark icon when step is done

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Import `Ionicons` and conditionally render it instead of the dot `View` when `done === true`.

**What to learn**: Using `@expo/vector-icons` (it is already installed — no `npm install` needed). Conditional rendering with ternary vs `&&`.

**Import needed**:

```typescript
import { Ionicons } from '@expo/vector-icons';
```

**Render logic**:

```typescript
{done ? (
  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
) : (
  <View style={[stepStyles.dot, active && stepStyles.dotActive]} />
)}
```

**Visual check**: Run the app, manually advance a trip to `arrived` in Firebase Console. The first step dot should become a green checkmark.

---

### Step 7: Add scale animation to the checkmark

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Inside `ProgressStep`, add an `Animated.Value` and a `useEffect` that fires a spring animation when `done` becomes `true`. Wrap the icon/dot in an `Animated.View` with a scale transform.

**What to learn**: `Animated.spring` with `useNativeDriver: true` (safe for transforms). `useRef` for stable `Animated.Value` across re-renders. `useEffect` with a dependency to react to prop changes.

**Key insight**: `useRef(new Animated.Value(done ? 1 : 0))` initializes correctly — if the component mounts with `done === true` (e.g., screen loads mid-trip), the checkmark should be at full scale immediately, not animate in from 0.

**Imports needed**: Add `useRef, useEffect` to the React import at the top (they are likely already imported in the file).

---

### Step 8: Pass address subtitles to `ProgressStep` calls

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Replace the three hardcoded `<ProgressStep>` JSX calls with a mapped array. Build a `steps` array from `trip?.pickupAddress`, `trip?.dropoffAddress`, and the hardcoded service type `'Towing'`.

**What to learn**: Deriving display data from props at render time. The `.map()` pattern for rendering lists. Why `key` prop is required in lists.

**After this step**, the three checklist items should show:

- "Drive to pickup location" / [the actual pickup address]
- "Provide service" / "Towing"
- "Complete drop-off" / [the actual dropoff address]

---

### Step 9: Manual end-to-end test

**Action**: Run the full driver flow and verify all state machine requirements.

**Checklist**:

- [ ] Accept a test request — trip appears in `en_route` state
- [ ] Button shows "I've Arrived" — tap it
- [ ] Button shows `ActivityIndicator` during write (may be fast on good connection)
- [ ] First checklist step shows green checkmark, second step becomes active (highlighted)
- [ ] Button shows "Start Service" — tap it
- [ ] Check Firebase Console: `startedAt` field exists on the trip document
- [ ] Second checklist step shows green checkmark, third step becomes active
- [ ] Button shows "Complete Trip" — tap it
- [ ] All three steps show green checkmarks
- [ ] Trip status is `completed` in Firestore
- [ ] Driver screen returns to idle state (trip listener clears `activeTripId`)
- [ ] Double-tap the button quickly — second tap should be ignored (button disabled)
- [ ] Simulate error: use Firebase Console to delete the trip document mid-flow, then tap button — Alert should show

---

## Edge Cases

1. **Double-tap the action button** — Handled by `isUpdating` guard. Second tap is a no-op because `if (!trip || isUpdating) return` fires before any async work.

1. **Firestore write succeeds but the listener is slow** — The button stays disabled until `trip.status` updates (since we do not call `setIsUpdating(false)` on success). On a good connection this is under 500ms. On a slow connection, the driver may wait a second. This is acceptable and correct — it is better than allowing a double-advance.

1. **Network offline during button press** — Firestore JS SDK has offline persistence. The `updateDoc` call will queue the write and resolve immediately with an optimistic update if the device is offline. The listener will also fire with the cached new value. On reconnect, Firestore syncs. This means the button will behave normally even offline in most cases. No special handling needed for MVP.

1. **`trip` is null when button pressed** — Handled by `if (!trip || isUpdating) return` guard.

1. **Trip completes while driver is reading expanded sheet** — The `useEffect` in `app/(driver)/index.tsx` already watches `trip?.status` and sets `activeTripId(null)` when status is `completed` or `cancelled`, which unmounts the `ActiveTripSheet`. The sheet will disappear cleanly.

1. **`ProgressStep` mounts with `done === true`** — This can happen if the driver's app restarts mid-trip. The `useRef(new Animated.Value(done ? 1 : 0))` initialization handles this — the checkmark is at scale 1 immediately with no animation, which is the correct behavior.

1. **`trip.pickupAddress` or `trip.dropoffAddress` is undefined** — The `Trip` interface marks both as required strings (no `?`). The `acceptClaimedRequest` function in `firestore.ts` copies them from the request document, which should always have them. Use `?? 'Address unavailable'` as a defensive fallback in the subtitle.

1. **`ActivityIndicator` on dark backgrounds** — The button is green (`#34C759`). `<ActivityIndicator color="white" />` will be visible. No contrast issue.

1. **`Ionicons` icon name typo** — `checkmark-circle` is the correct Ionicons name. If the app crashes with "icon not found", check for a typo. Alternative safe option: `checkmark-circle-outline`.

1. **`startedAt` in Firestore vs `startedAt` in TypeScript** — The Firestore field name `startedAt` and the TypeScript field name `startedAt` must match exactly. The `listenToTrip` function in `firestore.ts` spreads `...data` onto the Trip object, so as long as Firestore writes the field as `startedAt`, it will be available on `trip.startedAt`. No mapping code needed.

---

## Testing Strategy

### Manual Testing (Primary for this project phase)

**Core flow test:**

1. Go online as driver
2. Accept a request
3. Verify initial state: status badge "En Route to Pickup", button "I've Arrived", step 1 active (green dot), steps 2-3 inactive
4. Tap "I've Arrived" — verify button goes to loading, then updates to "Start Service"
5. Open Firebase Console — verify `arrivalTime` timestamp exists on trip document
6. Verify step 1 now shows a checkmark (with spring animation), step 2 is now active
7. Tap "Start Service" — verify button updates to "Complete Trip"
8. Open Firebase Console — verify `startedAt` timestamp exists
9. Verify step 2 shows checkmark, step 3 is now active
10. Verify subtitle on step 3 shows the actual dropoff address
11. Tap "Complete Trip" — verify all three steps show checkmarks
12. Verify `completionTime` exists in Firestore
13. Verify ActiveTripSheet disappears and driver returns to idle map view

**Error handling test:**

1. Accept a trip
2. Open Firebase Console and delete the trip document
3. Tap the action button
4. Verify Alert appears with error message
5. Verify button re-enables (not stuck in loading)

**Double-tap test:**

1. Accept a trip
2. Very quickly double-tap "I've Arrived"
3. Verify the trip only advances one state (not to `in_progress`)

**Mid-trip resume test:**

1. Accept a trip, advance to `arrived` state
2. Force-close the app
3. Reopen — navigate to driver screen
4. `activeTripId` in `index.tsx` comes from `useState` which resets on app restart. **Note**: This is a known limitation — the driver loses their active trip context on force-close. This is a separate story (trip persistence). Not in scope for TOW-70.

---

## Dependencies

### Prerequisites (already complete)

- TOW-68 — `ActiveTripSheet.tsx`, `use-active-trip.ts`, `listenToTrip`, driver index wiring — all done and merged

### No New Packages Needed

All required APIs are already available:

- `Animated`, `ActivityIndicator` — `react-native` (built-in)
- `Ionicons` — `@expo/vector-icons` (already installed via Expo)
- `useRef`, `useEffect`, `useState` — `react` (already imported in the component)

### Related Upcoming Stories

- TOW-71 — likely handles commuter-side trip status visibility (reads the same Firestore fields being written here)

---

## File Summary

```
Files to modify:
  /Users/chris/projects/towlink/types/models.ts
    → Add: startedAt?: Date  to Trip interface

  /Users/chris/projects/towlink/services/firebase/firestore.ts
    → Add: else if (status === 'in_progress') branch with startedAt: Timestamp.now()

  /Users/chris/projects/towlink/components/ActiveTripSheet.tsx
    → Add: isUpdating state + guard in handleStatusUpdate
    → Add: disabled + ActivityIndicator to action button
    → Add: subtitle prop to ProgressStep
    → Add: Ionicons checkmark when done === true
    → Add: Animated scale spring on checkmark appearance
    → Change: Three ProgressStep calls to use steps array with subtitles

Files NOT to modify:
  hooks/use-active-trip.ts        — no changes needed
  app/(driver)/index.tsx          — no changes needed
  app/(driver)/_layout.tsx        — no changes needed
```

---

## Key Learning Moments for the Student

1. **State machines in UI** — How a simple string (`trip.status`) drives all UI decisions: button label, which steps are done, what the status badge says. This is a fundamental pattern.

1. **Disabling UI during async operations** — Why optimistic disable (set disabled immediately, re-enable on error only) is the right pattern for action buttons in a sequential workflow.

1. **Timestamps in distributed systems** — Why `Timestamp.now()` (server-side or client-side Firestore timestamp) is used instead of `new Date()`, and why recording a timestamp for each state transition is valuable for analytics, billing, and debugging.

1. **Animated API with `useNativeDriver`** — Transform animations (scale, translate) can run on the native thread (`useNativeDriver: true`) for 60fps performance. Layout property animations (height, width, top) cannot and must use `useNativeDriver: false`.

1. **Building data arrays for rendering** — Instead of copy-pasting three JSX blocks with slightly different props, deriving an array of step data and using `.map()` is more maintainable and scales to N steps.