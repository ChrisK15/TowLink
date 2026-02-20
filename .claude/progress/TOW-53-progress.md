# Implementation Progress: TOW-53
# Integrate Real-Time Request Listening

## Story Summary

As a driver, I want to automatically see requests pop up when I'm online, so that I don't have to manually refresh.

The core work here is refactoring and connecting pieces that are already partially in place. Think of this as a "wiring and quality" story rather than a "build from scratch" story. The listener logic works, but it needs to be cleaned up, extracted into a reusable hook, and made accurate with server timestamps.

---

## Key Learning Concepts

Before starting, understand these two ideas. They are central to everything in this story.

### Imperative vs Reactive State

Right now, when a driver accepts a request, the driver screen does two things:
1. Calls `acceptClaimedRequest()` in Firestore
2. Immediately calls `setShowPopup(false)` to close the popup

That second call is **imperative** - the code is saying "close the popup now."

After this story, step 2 goes away. Instead, when the Firestore operation succeeds, the request document's status changes. The `onSnapshot` listener detects that change, the query no longer matches any document, it fires the callback with `null`, `claimedRequest` becomes `null`, and since `showPopup = claimedRequest !== null`, the popup closes itself. That is **reactive** - the UI reacts to data changes rather than being told what to do.

This is the design pattern of the whole Firebase + React architecture. Understanding it here will help you for every future story.

### useRef for "invisible" values

You already know `useState` triggers a re-render when its value changes. Sometimes you need to store a value in a component (or hook) that should NOT trigger a re-render when it changes - for example, a function reference like an `unsubscribe` callback. That is what `useRef` is for. The unsubscribe function from `onSnapshot` is a perfect candidate: you need to hold onto it so you can call it later, but you never want a re-render just because you stored it.

---

## Implementation Steps

### Step 1: Fix Timestamp Conversion in `listenForClaimedRequests`

**File:** `/Users/chris/projects/towlink/services/firebase/firestore.ts`
**Lines to look at:** 164-186 (the `listenForClaimedRequests` function)

**What is the problem?**

Look at lines 179-182. When a Firestore document is returned by `onSnapshot`, timestamps like `createdAt`, `expiresAt`, and `claimExpiresAt` come back as Firestore `Timestamp` objects, not JavaScript `Date` objects. They look like `{ seconds: 1234567890, nanoseconds: 0 }` - NOT a regular Date.

The popup's timer (Step 4) will need to do math like `new Date(request.claimExpiresAt).getTime()`. If `claimExpiresAt` is a Firestore `Timestamp`, wrapping it in `new Date()` gives you `NaN`, and the timer breaks.

**What to do:**

Instead of spreading `snapshot.docs[0].data()` raw, pull the `data` out first, then build the `Request` object manually and convert each timestamp field using Firestore's `.toDate()` method.

Every Firestore `Timestamp` has a `.toDate()` method that returns a regular JavaScript `Date`.

**How to think through this:**
- What does `snapshot.docs[0].data()` return? (a plain JS object with some fields as Firestore Timestamps)
- If I do `const data = snapshot.docs[0].data()`, what type is `data.claimExpiresAt`?
- What method on a Firestore `Timestamp` converts it to a JS `Date`?
- What should happen if the field is missing/null? (use `?? undefined` or `?? new Date()` as a fallback)

**Checkpoint:** After making this change, add a temporary `console.log(typeof request.claimExpiresAt, request.claimExpiresAt)` in the driver screen's listener callback. When a request is claimed, it should log `"object"` and print a Date, NOT a Firestore Timestamp object. Remove the log when you are satisfied.

---

### Step 2: Create the `useClaimedRequest` Custom Hook

**File to create:** `/Users/chris/projects/towlink/hooks/use-claimed-request.ts` (new file)

**What and why:**

Right now, the listener logic lives directly inside the driver screen (`app/(driver)/index.tsx`, lines 70-85). This is functional but not ideal. The pattern in this project (see `PATTERNS.md`) is to keep screens focused on rendering and move data-fetching logic into services or hooks.

Extracting this into a hook means:
- The driver screen becomes simpler and easier to read
- The hook can be reused in other screens in the future (e.g., a trip status screen)
- The listener lifecycle logic is in one place, easy to reason about

**What the hook should do:**
- Accept two parameters: `driverId` (string or null) and `isOnline` (boolean)
- When BOTH `driverId` is truthy AND `isOnline` is true: start the Firestore listener
- When EITHER condition is false: stop the listener and reset state to null
- Return: `{ claimedRequest: Request | null, isListening: boolean }`

**Key decisions to think through before writing:**

1. You need to store the unsubscribe function somewhere so you can call it in cleanup. Should this go in `useState` or `useRef`? Think about what happens each time the reference updates - do you want a re-render?

2. The `useEffect` dependencies should be `[driverId, isOnline]`. What happens when `isOnline` changes from true to false? What code needs to run?

3. The cleanup function returned from `useEffect` runs when the component unmounts OR when the dependencies change. How does this interact with your manual cleanup inside the effect?

**Checkpoint:** Add `console.log` statements inside the hook: one when the listener starts, one when it stops. Go online as a driver in the app. Verify the start log appears. Toggle offline. Verify the stop log appears. No Firestore errors should appear in the console.

---

### Step 3: Refactor the Driver Screen to Use the Hook

**File:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**What to change:**

This step is about swapping out old code for the new hook. Here is the before/after at a high level:

Before:
```
const [currentRequest, setCurrentRequest] = useState(...)
const [showPopup, setShowPopup] = useState(false)

useEffect(() => {
  // listener logic directly here
}, [user?.uid, isOnline])
```

After:
```
const { claimedRequest } = useClaimedRequest(user?.uid, isOnline)
const showPopup = claimedRequest !== null
```

Notice that `showPopup` is no longer a piece of state - it is a derived value. You never call `setShowPopup`. The popup visibility is a pure function of whether there is a claimed request.

**What to remove:**
- Lines 37-40: The `currentRequest` and `showPopup` state declarations
- Lines 70-85: The `useEffect` that calls `listenForClaimedRequests` directly

**What to add:**
- Import `useClaimedRequest` from `@/hooks/use-claimed-request`
- Import `useCallback` from `react` (you will need this in Step 6)
- The two lines above replacing the removed code
- A new `isActioning` state: `const [isActioning, setIsActioning] = useState(false)`

**The test button problem:**

The `handleTestPopup` function at lines 203-207 sets `currentRequest` and `showPopup` directly. After removing those state variables, this will break. You have two options:
- **Option A:** Remove the test button entirely. Real requests flow through the listener now - you can test end-to-end.
- **Option B:** Keep the test button with a separate `testRequest` state just for mock testing, and show the popup when either `claimedRequest !== null` OR `testRequest !== null`.

Think about which makes more sense at this stage of the project. Option A is cleaner. Option B is useful if you want a quick way to preview UI changes without triggering the full flow.

**Update `handleAcceptRequest`:**

The current version (line 209-219) calls `setShowPopup(false)` after accepting. Remove that line. The popup will close reactively when Firestore updates. Also:
- Change `currentRequest` to `claimedRequest` everywhere in this function
- Add the `isActioning` guard: `if (!claimedRequest || !user?.uid || isActioning) return;`
- Add `setIsActioning(true)` in the try and `setIsActioning(false)` in the finally

**Update `handleDeclineRequest`:**

The current version (lines 221-231) has a gap: when the countdown timer hits zero, `onDecline` is called from inside the popup. But at that moment, the Cloud Function may have already returned the request to `searching` status on the server. If the driver's app then tries to call `declineClaimedRequest`, the Firestore transaction will fail because the request is no longer `claimed`.

Fix this by checking `claimedRequest.status` before calling Firestore. If it is not `'claimed'`, do nothing - the listener will clear the state on its own.

Apply the same `isActioning` guard and try/catch/finally pattern here.

**Checkpoint:** Go online as a driver. In Firestore console, manually set a request's `status` to `'claimed'` and `claimedByDriverId` to your driver UID. The popup should appear automatically without touching the app. Tap Accept - the popup should close on its own.

---

### Step 4: Update `RequestPopup` Timer to Use Server Timestamp

**File:** `/Users/chris/projects/towlink/components/RequestPopup.tsx`

**What is wrong with the current timer:**

Look at the two `useEffect` hooks starting at lines 28 and 47. The timer starts a local 30-second countdown from the moment the popup becomes visible. This is a client-side clock and has no connection to Firestore.

The problem: by the time the popup appears on the driver's screen, some time has already passed. If the claim happened 8 seconds ago, the popup says "30 seconds" but the real expiry is only 22 seconds away. The Cloud Function will time out at 22 seconds, but the driver's popup will still show 8 more seconds remaining. The popup auto-declines at the wrong time.

**What to do instead:**

Use `request.claimExpiresAt` (a JavaScript `Date` after your Step 1 fix) to calculate how many seconds remain at each tick.

The math is:
```
remainingSeconds = (claimExpiresAt.getTime() - Date.now()) / 1000
```

At each interval tick, recalculate from the current time. This stays accurate regardless of when the popup appeared.

**The two effects become one:**

Currently there are two separate effects: one to decrement the counter, one to watch when it hits zero. When you calculate from a server timestamp, you calculate the remaining time directly each tick, so you can handle the auto-decline check inside the same `setInterval` callback. Combine the two effects into one.

**Add `isLoading` prop:**

Add `isLoading?: boolean` to the `RequestPopupProps` interface. Use it to:
- Disable both buttons: `disabled={isLoading}`
- Apply a disabled style: `style={[styles.acceptButton, isLoading && styles.buttonDisabled]}`
- Show different button text: `{isLoading ? 'Processing...' : 'Accept Request'}`

You already have a `buttonDisabled` style defined in `PATTERNS.md` (`opacity: 0.5`). Add it to the StyleSheet.

Also note: the progress bar uses `(timeLeft / 30) * 100`. When the timer is server-based, the total duration might not always start at exactly 30. Consider using a different approach for the progress bar - perhaps store the `initialTime` when the popup first becomes visible, then calculate `(timeLeft / initialTime) * 100`.

**Checkpoint:** Open the popup. Check that the countdown starts from the correct remaining time, not always 30. If you trigger a claim and wait 10 seconds before the popup shows, it should start around 20, not 30.

---

### Step 5: Pass `isLoading` from Driver Screen to Popup

**File:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**What to do:**

Update the `<RequestPopup>` JSX (currently around line 346-351) to pass the new prop:

```
<RequestPopup
  request={claimedRequest ?? undefined}
  visible={showPopup}
  onAccept={handleAcceptRequest}
  onDecline={handleDeclineRequest}
  isLoading={isActioning}
/>
```

Note `claimedRequest ?? undefined` - `RequestPopup` expects `request?: Request` (undefined is okay, null is not, because of the `if (!request) return null` inside the component).

**Checkpoint:** Tap "Accept Request." Both buttons should immediately disable and show "Processing..." text. If the operation succeeds, the popup closes. If it fails, the buttons should become active again (because `finally` sets `isActioning` back to false).

---

### Step 6: Wrap Handlers in `useCallback`

**File:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**Why this matters:**

Look at the timer `useEffect` you just wrote in `RequestPopup`. Its dependency array includes `onDecline`. Every time the driver screen re-renders (which happens frequently - for map updates, state changes, etc.), React creates a NEW function reference for `handleDeclineRequest`. Even though the function logic is identical, it is a different object in memory. This causes the popup's `useEffect` to run again, which resets the timer.

The fix is `useCallback`. Wrapping a function in `useCallback` tells React: "only create a new function reference when these specific dependencies change." As long as `claimedRequest`, `user?.uid`, and `isActioning` stay the same, the exact same function reference is reused.

**What to do:**

Import `useCallback` from react (you should have added this import in Step 3).

Wrap both handlers:
```typescript
const handleDeclineRequest = useCallback(async () => {
  // ... same logic
}, [claimedRequest, user?.uid, isActioning]);

const handleAcceptRequest = useCallback(async () => {
  // ... same logic
}, [claimedRequest, user?.uid, isActioning]);
```

**Checkpoint:** With the popup visible, add a `console.log('timer effect running')` inside the timer `useEffect` in `RequestPopup`. It should log once when the popup opens, and not again on subsequent parent re-renders. If it logs repeatedly every second, `useCallback` is not working correctly.

---

### Step 7: End-to-End Integration Test

Run through all four test scenarios manually before marking this story complete.

**Scenario 1 - Accept flow:**
1. Go online as a driver
2. On another device or the commuter tab, create a new tow request
3. Wait for the Cloud Function to assign the request (or manually set `status: 'claimed'` and `claimedByDriverId: <your UID>` in Firestore)
4. Verify popup appears automatically
5. Verify the countdown starts from the correct remaining time (not necessarily 30)
6. Tap "Accept Request" - buttons should disable briefly, popup should close, a `trips` document should appear in Firestore

**Scenario 2 - Decline flow:**
1. Same as Scenario 1 through step 4
2. Tap "Decline"
3. Popup closes, request status returns to `searching` in Firestore

**Scenario 3 - Timeout flow:**
1. Same as Scenario 1 through step 4
2. Do NOT tap anything - let the timer count down to zero
3. Popup closes automatically when timer hits zero
4. Firestore shows request status returning to `searching` (Cloud Function handles this)

**Scenario 4 - Go offline while popup is open:**
1. Go online as a driver, trigger a claim so the popup is visible
2. Toggle the Online/Offline switch to offline
3. Popup should close automatically (because `claimedRequest` becomes null when the listener stops)
4. No Firestore errors in the console

---

## Completed Steps
- [x] Step 1: Fix timestamp conversion in `listenForClaimedRequests`
- [x] Step 2: Create `useClaimedRequest` custom hook
- [x] Step 3: Refactor driver screen to use the hook
- [x] Step 4: Update `RequestPopup` timer to use `claimExpiresAt`
- [x] Step 5: Pass `isLoading` from driver screen to popup
- [x] Step 6: Wrap handlers in `useCallback`
- [ ] Step 7: End-to-end integration test

## Current Step
Step 2: Create `useClaimedRequest` custom hook

## Notes
_Add your notes, questions, and observations here as you work through each step._

---

## Files Changed in This Story

| File | Action |
|------|--------|
| `/Users/chris/projects/towlink/services/firebase/firestore.ts` | Modify - convert Firestore Timestamps in `listenForClaimedRequests` |
| `/Users/chris/projects/towlink/hooks/use-claimed-request.ts` | Create - new custom hook |
| `/Users/chris/projects/towlink/app/(driver)/index.tsx` | Modify - use hook, add `isActioning`, update handlers, `useCallback` |
| `/Users/chris/projects/towlink/components/RequestPopup.tsx` | Modify - server-based timer, `isLoading` prop |

---

_Progress file created by: code-coach agent_
_Story: TOW-53_
_Date: 2026-02-20_
