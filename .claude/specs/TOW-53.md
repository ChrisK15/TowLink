# Technical Specification: TOW-53

## Story Reference

**Jira**: [TOW-53 - Integrate Real-Time Request Listening](https://chriskelamyan115.atlassian.net/browse/TOW-53)

**Story**: As a driver, I want to automatically see requests pop up when I'm online, so that I don't have to manually refresh.

**Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
**Story Points**: 3
**Priority**: Medium

---

## Current State Assessment

Before diving into implementation, it is important to understand what is already built from TOW-52.

**Already implemented and working:**
- `listenForClaimedRequests(driverId, callback)` exists in `services/firebase/firestore.ts`
- The driver screen (`app/(driver)/index.tsx`) already contains a `useEffect` that starts the listener when `isOnline` becomes true and cleans it up when it goes false or the component unmounts
- `RequestPopup` is already rendered in the driver screen, wired to `onAccept` and `onDecline` handlers
- `acceptClaimedRequest` and `declineClaimedRequest` are already called from the driver screen

**What still needs to be done for TOW-53:**
1. Extract the listener logic from the driver screen into a reusable `useClaimedRequest` custom hook
2. Sync the `RequestPopup` countdown timer to `claimExpiresAt` from Firestore (currently runs a local 30-second timer that is not tied to the server timestamp)
3. Handle the popup auto-dismiss when the timer expires on the driver screen side (not just inside the popup)
4. Handle a cancelled request case where popup should close without calling `declineClaimedRequest`
5. Add a loading/error state to the accept and decline actions

---

## Architecture Overview

The integration has three layers that need to connect cleanly:

```
Firestore (requests collection)
    ↓  onSnapshot listener
useClaimedRequest hook  (new custom hook)
    ↓  returns { claimedRequest, isListening }
app/(driver)/index.tsx  (consumes hook)
    ↓  passes props
RequestPopup component  (displays request, handles timer)
```

The key architectural decision for this story is to **extract the listener into a custom hook** rather than keeping it inline in the driver screen. This follows the project's convention for separating data-fetching logic from rendering logic, makes the code easier to test, and makes it easier to reuse the listener elsewhere (e.g., a future trip status screen).

---

## Technical Requirements

### Custom Hook: `useClaimedRequest`

**File to create:** `/Users/chris/projects/towlink/hooks/use-claimed-request.ts`

**Purpose:** Encapsulate the Firestore real-time listener for claimed requests. Start listening when `isOnline` is true and `driverId` is available. Stop listening automatically when either condition changes or the component unmounts.

**Hook API:**

```typescript
function useClaimedRequest(
  driverId: string | null | undefined,
  isOnline: boolean
): {
  claimedRequest: Request | null;
  isListening: boolean;
}
```

**State managed inside the hook:**
- `claimedRequest: Request | null` - the currently claimed request, or null if none
- `isListening: boolean` - true when the Firestore listener is active (useful for debugging/UI)

**Firestore query (already exists in `listenForClaimedRequests`):**
```
collection: requests
where: status == 'claimed'
where: claimedByDriverId == driverId
```

The hook calls `listenForClaimedRequests` from `services/firebase/firestore.ts` and stores its return value (the unsubscribe function) in a ref so it can be cleaned up.

**Lifecycle rules:**
- Start listener when: `driverId` is truthy AND `isOnline === true`
- Stop listener when: `driverId` becomes null/undefined, OR `isOnline` becomes false, OR component unmounts
- When listener stops: set `claimedRequest` back to `null`, `isListening` to `false`

**Implementation skeleton (for code-coach to walk student through):**

```typescript
import { useEffect, useRef, useState } from 'react';
import { listenForClaimedRequests } from '@/services/firebase/firestore';
import { Request } from '@/types/models';

export function useClaimedRequest(
  driverId: string | null | undefined,
  isOnline: boolean
): { claimedRequest: Request | null; isListening: boolean } {
  const [claimedRequest, setClaimedRequest] = useState<Request | null>(null);
  const [isListening, setIsListening] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Conditions to start listening
    if (!driverId || !isOnline) {
      // Clean up any existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setClaimedRequest(null);
      setIsListening(false);
      return;
    }

    // Start listener
    setIsListening(true);
    const unsubscribe = listenForClaimedRequests(driverId, (request) => {
      setClaimedRequest(request);
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or dependency change
    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
      setIsListening(false);
    };
  }, [driverId, isOnline]);

  return { claimedRequest, isListening };
}
```

---

### Driver Screen Updates

**File to modify:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**What to change:**

1. **Remove** the inline `useEffect` that calls `listenForClaimedRequests` directly (lines 70-85 in current file)
2. **Remove** the `currentRequest` and `showPopup` local state declarations (they move into or are driven by the hook)
3. **Import** and **call** `useClaimedRequest` instead
4. **Derive** `showPopup` from the hook's return value: `const showPopup = claimedRequest !== null`
5. **Update** `handleDeclineRequest` to guard against calling Firestore when the request was auto-expired on the server (the popup's `onDecline` fires for both manual decline and timer expiry)

**New state and hook usage in the driver screen:**

```typescript
// Replace the old useEffect + state with this:
const { claimedRequest } = useClaimedRequest(user?.uid, isOnline);
const showPopup = claimedRequest !== null;
```

**Updated `handleAcceptRequest`:**

The current implementation is correct in logic. Add a loading guard to prevent double-tapping.

```typescript
const [isActioning, setIsActioning] = useState(false);

async function handleAcceptRequest() {
  if (!claimedRequest || !user?.uid || isActioning) return;

  try {
    setIsActioning(true);
    await acceptClaimedRequest(claimedRequest.id, user.uid);
    Alert.alert('Request Accepted!', 'Starting trip...');
    // No need to call setShowPopup(false) — the listener will fire
    // and set claimedRequest to null automatically when status changes to 'accepted'
  } catch (error: any) {
    Alert.alert('Error', error.message);
  } finally {
    setIsActioning(false);
  }
}
```

**Updated `handleDeclineRequest`:**

The `onDecline` prop on `RequestPopup` is called both when the driver manually taps Decline AND when the countdown timer hits zero. When the timer expires, the Cloud Function has already returned the request to `searching` status on the server side. If the driver's app tries to call `declineClaimedRequest` at that moment, the transaction will fail because the request status is no longer `claimed`.

Handle this by checking the current status before calling Firestore:

```typescript
async function handleDeclineRequest() {
  if (!claimedRequest || !user?.uid || isActioning) return;

  // If request is no longer claimed (server-side timeout already fired),
  // just close the popup without hitting Firestore
  if (claimedRequest.status !== 'claimed') {
    // The listener will set claimedRequest to null on its own
    // Nothing more to do
    return;
  }

  try {
    setIsActioning(true);
    await declineClaimedRequest(claimedRequest.id, user.uid);
    Alert.alert('Request Declined', 'Looking for another driver...');
  } catch (error: any) {
    // If we get an error because status changed, just close
    // The listener will handle resetting the state
    console.warn('Decline error (may have already expired):', error.message);
  } finally {
    setIsActioning(false);
  }
}
```

**Pass `isActioning` down to the popup so buttons can be disabled during async operations:**

```typescript
<RequestPopup
  request={claimedRequest ?? undefined}
  visible={showPopup}
  onAccept={handleAcceptRequest}
  onDecline={handleDeclineRequest}
  isLoading={isActioning}
/>
```

---

### RequestPopup Timer Sync

**File to modify:** `/Users/chris/projects/towlink/components/RequestPopup.tsx`

**Current behavior:** The popup starts a local 30-second countdown when it becomes visible. This countdown is completely disconnected from the `claimExpiresAt` timestamp on the Firestore document.

**Problem with the current approach:**
- There is a delay between when Firestore claims a request and when the popup renders on the driver's device (network latency, React re-render). If a request was claimed 5 seconds ago before the popup appeared, the popup shows 30 seconds but the real expiry is only 25 seconds away.
- If the request is declined and immediately re-claimed (unlikely but possible), the local timer resets from 30 even though less time may be available.

**What to change:**
Update the timer `useEffect` in `RequestPopup` to calculate `timeLeft` from `request.claimExpiresAt` rather than counting down from a fixed 30.

The `Request` type already has `claimExpiresAt?: Date` defined in `types/models.ts`.

**Updated timer logic:**

```typescript
// Replace the two timer useEffects with this single useEffect
useEffect(() => {
  if (!visible || !request?.claimExpiresAt) {
    setTimeLeft(30);
    return;
  }

  const calculateTimeLeft = () => {
    const now = Date.now();
    const expiresAt = new Date(request.claimExpiresAt!).getTime();
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  };

  // Set immediately so there's no flash of "30"
  setTimeLeft(calculateTimeLeft());

  const interval = setInterval(() => {
    const remaining = calculateTimeLeft();
    setTimeLeft(remaining);
    if (remaining === 0) {
      clearInterval(interval);
      onDecline(); // Auto-dismiss when time is up
    }
  }, 1000);

  return () => clearInterval(interval);
}, [visible, request?.claimExpiresAt, onDecline]);
```

**Note on `onDecline` in the dependency array:** This will cause a re-render loop if `onDecline` is an inline function defined inside the driver screen. The driver screen's `handleDeclineRequest` should be wrapped in `useCallback` to give it a stable reference:

```typescript
// In driver screen:
import { useCallback } from 'react';

const handleDeclineRequest = useCallback(async () => {
  // ... same logic as above
}, [claimedRequest, user?.uid, isActioning]);
```

**Add `isLoading` prop to `RequestPopupProps`:**

```typescript
interface RequestPopupProps {
  request?: Request;
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean; // NEW - disables buttons during async operations
}
```

Use `isLoading` to disable both buttons while an action is in flight:

```typescript
<TouchableOpacity
  style={[styles.acceptButton, isLoading && styles.buttonDisabled]}
  onPress={onAccept}
  disabled={isLoading}
>
  <Text style={styles.acceptButtonText}>
    {isLoading ? 'Processing...' : 'Accept Request'}
  </Text>
</TouchableOpacity>
<TouchableOpacity
  style={[styles.declineButton, isLoading && styles.buttonDisabled]}
  onPress={onDecline}
  disabled={isLoading}
>
  <Text style={styles.declineButtonText}>
    {isLoading ? 'Processing...' : 'Decline'}
  </Text>
</TouchableOpacity>
```

---

### Firestore Timestamp Conversion

**File to review:** `/Users/chris/projects/towlink/services/firebase/firestore.ts`

The existing `listenForClaimedRequests` function maps snapshot data directly without converting Firestore `Timestamp` objects to JavaScript `Date` objects:

```typescript
// Current code in firestore.ts:
const request = {
  id: snapshot.docs[0].id,
  ...snapshot.docs[0].data(),  // claimExpiresAt is a Firestore Timestamp here
};
callback(request);
```

The `RequestPopup` expects `request.claimExpiresAt` to be a JavaScript `Date` (or something `new Date()` can wrap). Firestore `Timestamp` objects have a `.toDate()` method.

**Update `listenForClaimedRequests` to convert timestamps:**

```typescript
export function listenForClaimedRequests(
  driverId: string,
  callback: (request: Request | null) => void,
) {
  const q = query(
    collection(db, 'requests'),
    where('status', '==', 'claimed'),
    where('claimedByDriverId', '==', driverId),
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const request: Request = {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to JavaScript Dates
        createdAt: data.createdAt?.toDate() ?? new Date(),
        expiresAt: data.expiresAt?.toDate() ?? new Date(),
        claimExpiresAt: data.claimExpiresAt?.toDate() ?? undefined,
      } as Request;
      callback(request);
    }
  });
}
```

This is a small but critical change - without it, `new Date(request.claimExpiresAt).getTime()` in the popup timer will produce `NaN` because you cannot directly wrap a Firestore `Timestamp` in `new Date()`.

---

## File-by-File Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `/Users/chris/projects/towlink/hooks/use-claimed-request.ts` | **CREATE** | New custom hook encapsulating the Firestore listener |
| `/Users/chris/projects/towlink/app/(driver)/index.tsx` | **MODIFY** | Replace inline useEffect+state with `useClaimedRequest` hook, add `isActioning` state, wrap handlers in `useCallback`, update `handleDeclineRequest` to guard against expired requests |
| `/Users/chris/projects/towlink/components/RequestPopup.tsx` | **MODIFY** | Sync timer to `claimExpiresAt` from Firestore, add `isLoading` prop, disable buttons during actions |
| `/Users/chris/projects/towlink/services/firebase/firestore.ts` | **MODIFY** | Convert Firestore Timestamps to JS Dates in `listenForClaimedRequests` |

---

## Implementation Steps

### Step 1: Update `listenForClaimedRequests` to convert timestamps

**File:** `/Users/chris/projects/towlink/services/firebase/firestore.ts`

**Action:** Modify the existing `listenForClaimedRequests` function to convert `createdAt`, `expiresAt`, and `claimExpiresAt` Firestore `Timestamp` objects to JavaScript `Date` objects before passing to the callback.

**Why first:** Every other step depends on having a proper `Date` in `claimExpiresAt`. This is the foundation.

**Code hint:** Firestore `Timestamp` objects have a `.toDate()` method that returns a JavaScript `Date`. The data from `doc.data()` will have these as `Timestamp` instances.

**Test:** Add a `console.log(typeof request.claimExpiresAt)` in the callback in the driver screen. It should log `"object"` (a Date) not something that prints like `{ seconds: ..., nanoseconds: ... }`.

---

### Step 2: Create the `useClaimedRequest` custom hook

**File:** `/Users/chris/projects/towlink/hooks/use-claimed-request.ts` (new file)

**Action:** Create a new file with the hook that:
- Takes `driverId` and `isOnline` as parameters
- Calls `listenForClaimedRequests` when both are truthy
- Returns `{ claimedRequest, isListening }`
- Cleans up the listener on unmount or when going offline

**Code hint:** Use `useRef` to store the unsubscribe function. This is preferable to storing it in `useState` because you do not want a re-render when the unsubscribe function reference changes. The pattern looks like:

```typescript
const unsubscribeRef = useRef<(() => void) | null>(null);
```

**Test:** Add a `console.log` inside the hook when the listener starts and stops. Go online as a driver and verify the start log appears. Go offline and verify the stop log appears.

---

### Step 3: Refactor the driver screen to use the hook

**File:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**Action:**
1. Import `useClaimedRequest` from `@/hooks/use-claimed-request`
2. Import `useCallback` from `react`
3. Remove the `useEffect` at lines 70-85 (the one that calls `listenForClaimedRequests`)
4. Remove the `currentRequest` state and `showPopup` state declarations
5. Add `const { claimedRequest } = useClaimedRequest(user?.uid, isOnline);`
6. Add `const showPopup = claimedRequest !== null;`
7. Add `const [isActioning, setIsActioning] = useState(false);`
8. Update `handleAcceptRequest` to guard with `isActioning` and use `claimedRequest` instead of `currentRequest`
9. Update `handleDeclineRequest` to guard with `isActioning` and check `claimedRequest.status` before calling Firestore
10. Wrap both handlers in `useCallback`

**Note on the test popup:** The `handleTestPopup` function and the "Test Popup" button currently set `currentRequest` and `showPopup` directly. After removing those state variables, the test button will no longer work as-is. The student has two options:
- **Option A (recommended):** Remove the test button entirely, since real requests now flow through the listener. The app can be tested end-to-end.
- **Option B:** Keep the test button but store a separate `testRequest` state just for mock testing. Only use it when `claimedRequest` is null.

The spec recommends Option A for this story, but the student should decide.

**Test:** Go online as a driver. Manually update a Firestore document to have `status: 'claimed'` and `claimedByDriverId` set to the driver's UID. Verify the popup appears automatically.

---

### Step 4: Update `RequestPopup` to sync timer with `claimExpiresAt`

**File:** `/Users/chris/projects/towlink/components/RequestPopup.tsx`

**Action:**
1. Add `isLoading?: boolean` to the `RequestPopupProps` interface
2. Replace the two existing timer `useEffect` hooks with a single one that calculates time from `request.claimExpiresAt`
3. Disable buttons and show "Processing..." text when `isLoading` is true
4. Add the disabled style to `StyleSheet.create`

**Why two separate effects become one:** The current implementation separates "decrement the counter" and "call onDecline when counter hits zero" into two effects. When deriving time from a server timestamp, you calculate the remaining time directly each tick, so there is no intermediate counter state to watch. The auto-decline can happen inside the same `setInterval` callback.

**Test:** With the popup open, check that the countdown starts from the correct remaining time (not always 30). If a request was claimed 10 seconds ago, the popup should start at approximately 20 seconds.

---

### Step 5: Pass `isLoading` from driver screen to popup

**File:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**Action:** Update the `<RequestPopup>` JSX to pass `isLoading={isActioning}`.

**Test:** Tap "Accept Request". Verify buttons become disabled and show "Processing..." while the Firestore transaction is in flight. Verify they become interactive again if the operation fails.

---

### Step 6: Wrap handlers in `useCallback`

**File:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**Action:** Wrap `handleAcceptRequest` and `handleDeclineRequest` in `useCallback`. This prevents the `RequestPopup` timer `useEffect` from re-running every render because `onDecline` changed reference.

```typescript
const handleDeclineRequest = useCallback(async () => {
  // ...
}, [claimedRequest, user?.uid, isActioning]);

const handleAcceptRequest = useCallback(async () => {
  // ...
}, [claimedRequest, user?.uid, isActioning]);
```

**Test:** Open React DevTools profiler (or add a `console.log` inside the popup timer useEffect). Verify it does not fire on every render of the parent.

---

### Step 7: End-to-end integration test

**Action:** Test the full flow from commuter request creation to driver popup and resolution.

**Test scenario 1 - Accept flow:**
1. Start app on a device/simulator as a driver, go online
2. On another device/simulator (or using the commuter tab), create a new tow request
3. Wait for the Cloud Function to claim the request for the driver
4. Verify popup appears automatically on the driver screen
5. Verify the countdown starts from the correct remaining time
6. Tap "Accept Request"
7. Verify popup closes
8. Verify a `trips` document is created in Firestore

**Test scenario 2 - Decline flow:**
1. Same as above through step 4
2. Tap "Decline"
3. Verify popup closes
4. Verify request status returns to `searching` in Firestore

**Test scenario 3 - Timeout flow:**
1. Same as above through step 4
2. Wait for the 30-second timer to expire without responding
3. Verify popup closes automatically
4. Verify request status returns to `searching` in Firestore (handled by Cloud Function from TOW-52)

**Test scenario 4 - Go offline:**
1. Go online as driver
2. While no claim is active, toggle offline
3. Verify no listener errors appear in the console
4. Verify `isListening` returns to false (add a console.log if needed)

---

## Firestore Query Structure

The listener query (already implemented, no changes needed to the query itself):

```javascript
// Collection: requests
// Filters:
//   status == 'claimed'
//   claimedByDriverId == <driverId>

query(
  collection(db, 'requests'),
  where('status', '==', 'claimed'),
  where('claimedByDriverId', '==', driverId),
)
```

**Composite index requirement:** This query uses two `where` clauses on different fields. Firestore requires a composite index for this. The index should already exist from TOW-52 (it was listed in the TOW-52 spec). If you get an index error in the logs, follow the link Firestore provides to create it automatically.

---

## Edge Cases

1. **Driver goes offline while popup is open** - The `useClaimedRequest` hook will stop the listener and set `claimedRequest` to null. Since `showPopup = claimedRequest !== null`, the popup will close automatically. No explicit Firestore write needed.

2. **Request is claimed but popup hasn't rendered yet** - The `claimExpiresAt`-based timer handles this correctly by calculating from the server timestamp, so if 3 seconds passed before the popup rendered, the timer starts at 27 seconds instead of 30.

3. **`onDecline` is called when timer hits zero but request already expired on server** - The updated `handleDeclineRequest` checks `claimedRequest.status !== 'claimed'` before calling Firestore. However, there is a race condition: the status in local state might still say `claimed` even though the server has changed it. The Firestore transaction in `declineClaimedRequest` will throw, and the `catch` block should log a warning and let the listener naturally update the state.

4. **Commuter cancels while driver is viewing popup** - The Firestore listener is watching for `status == 'claimed'`. When the commuter cancels, status becomes `cancelled`. The snapshot will now be empty (no documents match `status == 'claimed'`), so the callback receives `null`, `claimedRequest` becomes `null`, and `showPopup` becomes `false`. The popup closes automatically. No additional code needed.

5. **Driver accepts but network fails mid-transaction** - The `try/catch` in `handleAcceptRequest` will catch the error, show an alert, and reset `isActioning` to false. The request remains in `claimed` state. The driver can retry. The claim will eventually time out if they cannot reconnect.

6. **Double-tap on Accept or Decline** - The `isActioning` guard (`if (!claimedRequest || !user?.uid || isActioning) return;`) prevents duplicate Firestore operations.

7. **`claimExpiresAt` is missing from the request** - The timer `useEffect` falls back to `setTimeLeft(30)` if `request.claimExpiresAt` is null/undefined. This is a safe fallback.

---

## Testing Strategy

**Manual tests (required for story sign-off):**
- Popup appears when request is claimed by the driver's UID
- Popup disappears automatically when request is accepted by same driver
- Popup disappears automatically when request is declined
- Timer counts down from the correct remaining seconds (not always 30)
- Timer auto-dismisses when it hits zero
- Buttons are disabled while accept/decline is processing
- Going offline while popup is open closes the popup

**Console/Firestore checks:**
- No listener errors when toggling online/offline repeatedly
- No "Cannot update a component while rendering a different component" React warnings
- Firestore `requests` document correctly transitions from `claimed` to `accepted` or back to `searching`

---

## Dependencies

**From TOW-52 (already complete):**
- `listenForClaimedRequests` in `firestore.ts`
- `acceptClaimedRequest` and `declineClaimedRequest` in `firestore.ts`
- `claimedByDriverId` and `claimExpiresAt` fields on the `Request` model
- Cloud Function that claims requests for drivers
- Cloud Function that times out expired claims

**No new npm packages required** for this story. All Firebase and React Native libraries are already installed.

---

## Notes for Code Coach

### Learning objectives for this story

This is a 3-point story with well-defined scope. The main concepts the student practices:

1. **Extracting custom hooks** - Moving stateful logic out of a screen component into a reusable hook. This is a fundamental React skill.
2. **`useRef` for imperative values** - Storing the unsubscribe function in a ref (not state) because changing it should not trigger a re-render.
3. **`useCallback` for stable function references** - Understanding why passing a new function reference to a child's `useEffect` dependency array causes infinite loops.
4. **Server timestamps vs client timestamps** - Why the `claimExpiresAt` timer from Firestore is more accurate than a local 30-second countdown.
5. **Listener cleanup patterns** - This story reinforces proper `onSnapshot` unsubscription.

### What to emphasize

The most important conceptual shift is: **state derived from a Firestore listener is the source of truth**. After the refactor, `showPopup` is NOT directly set with `setShowPopup(false)`. Instead, the student learns that the popup closes itself because the Firestore data changed. This is reactive programming.

Show the student the before/after:
- Before: `acceptClaimedRequest()` → `setShowPopup(false)` (imperative)
- After: `acceptClaimedRequest()` → Firestore updates → listener fires → `claimedRequest` becomes null → `showPopup` becomes false (declarative/reactive)

### Common gotcha to watch for

The `onDecline` callback in `RequestPopup`'s dependency array will cause the timer `useEffect` to restart every render if `onDecline` is not wrapped in `useCallback`. The student will notice this as the timer resetting to ~27 seconds repeatedly. Guide them to add `useCallback` in the parent and explain why function references matter in dependency arrays.

---

_Specification Author: technical-architect agent_
_Created: 2026-02-20_
_Story: TOW-53_
