# Implementation Progress: TOW-18

## Story
**US-3.2: View Request Details** — Replace all hardcoded/mock values in the `RequestPopup` with real calculated values (distance, ETA, fare, time posted).

---

## Before You Start

Right now, when a driver receives a request, the popup shows placeholder text like `'Distance Calculating...'`, `'--'`, and `'Price Calculating...'`. That is because the `Request` object coming from Firestore already has slots for those values (`estimatedPickupDistance`, `estimatedETA`, etc.) but nobody has filled them in yet.

Your job in this story is to fill those slots with real numbers before the object reaches the popup.

Here is how the data flows end-to-end:

```
Firestore request doc (coordinates, addresses, commuter info)
        +
Driver's live GPS (driverLocation state in driver/index.tsx)
        |
        v
  New service file: services/requestCalculations.ts
  (four pure math functions + one orchestrator function)
        |
        v
  useMemo in app/(driver)/index.tsx
  (recomputes whenever request or driver location changes)
        |
        v
  enrichedRequest passed as prop to <RequestPopup />
        |
        v
  Real numbers appear in the popup
```

Key things to notice before you write a single line of code:

1. `types/models.ts` already has all five optional fields on the `Request` interface. No type changes needed.
2. `services/geoLocationUtils.ts` already wraps `geofire-common`'s Haversine implementation in a function called `getDistanceInKm()`. You will import and use this — do not write your own Haversine from scratch.
3. `components/RequestPopup.tsx` already renders all five fields with conditional fallbacks. Once real values arrive, the UI "just works".
4. The Accept button flow is already fully wired. You are not touching that.

The only new file you will create is `services/requestCalculations.ts`. You will also make small edits to `app/(driver)/index.tsx` and `components/RequestPopup.tsx`.

---

## Key Concepts

### Pure Functions
A pure function always returns the same output for the same input and has no side effects (no network calls, no state mutations, no console logs). Pure functions are easy to test and easy to reason about.

Your calculation functions should be pure:
- Input: two `Location` objects (or a number)
- Output: a number
- No side effects

### useMemo
`useMemo` is a React hook that memoises (caches) the result of a computation. It only re-runs the computation when one of its listed dependencies changes.

```typescript
const result = useMemo(() => {
  return expensiveComputation(a, b);
}, [a, b]); // only re-runs if a or b change
```

In this story you will use `useMemo` to compute the enriched request. It will re-run whenever `claimedRequest` or `driverLocation` changes. This means if the driver moves while the popup is open, the distances update automatically.

Why `useMemo` and not `useEffect`? Because you need a value synchronously for rendering. `useEffect` runs after the render — you would need an extra `useState` to hold the result. `useMemo` gives you the value directly, without the extra state variable.

### The Haversine Approach
The Haversine formula calculates the straight-line ("as the crow flies") distance between two points on Earth given their latitude and longitude. It accounts for the curvature of the Earth.

It is not the same as driving distance (which depends on roads), but for a driver deciding whether a job is worth accepting, straight-line distance is accurate enough. It is also instant, free, and works offline — unlike the Google Distance Matrix API.

The project already has `geofire-common` installed. Its `distanceBetween` function is a well-tested Haversine implementation. `services/geoLocationUtils.ts` already wraps it for you as `getDistanceInKm()`.

One important note: `getDistanceInKm()` returns kilometres. The UI displays miles. You will need to convert using the factor `0.621371`.

---

## Completed Steps

*(none yet)*

---

## Current Step

- [ ] Step 1: Create `services/requestCalculations.ts` with the four calculation functions

---

## Remaining Steps

- [ ] Step 1: Create `services/requestCalculations.ts` with the four pure calculation functions
- [ ] Step 2: Add `enrichRequestWithCalculations` to the same service file
- [ ] Step 3: Wire `enrichRequestWithCalculations` into `app/(driver)/index.tsx` using `useMemo`
- [ ] Step 4: Add the "Time Posted" line to `RequestPopup.tsx`
- [ ] Step 5: Add the trip distance line to the Drop-off card in `RequestPopup.tsx`
- [ ] Step 6: Verify the Accept button flow (read-only, no code changes)

---

## Step-by-Step Lesson Plan

---

### Step 1: Create the pure calculation functions

**What you will learn:** How to write pure utility functions in a service file, how to use an existing helper (`getDistanceInKm`), and how to do unit conversions in code.

**Files to edit:** Create `/Users/chris/projects/towlink/services/requestCalculations.ts`

**Guiding question:** Before you write any code, look at `services/geoLocationUtils.ts`. What does `getDistanceInKm` take as input, and what does it return? Now look at `types/models.ts`. What does the `Location` interface look like? How will you use these two things together?

**What to do:**
1. Create a new file at `services/requestCalculations.ts`
2. Import `getDistanceInKm` from `@/services/geoLocationUtils`
3. Import `Location` and `Request` from `@/types/models`
4. Define a constant `KM_TO_MILES = 0.621371` at the top of the file
5. Write four exported functions:
   - `calculatePickupDistance(driverLocation: Location, pickupLocation: Location): number` — returns distance in miles, rounded to 1 decimal place
   - `calculateTripDistance(pickupLocation: Location, dropoffLocation: Location): number` — returns distance in miles, rounded to 1 decimal place
   - `calculateETA(distanceToPickupMiles: number): number` — returns whole minutes, rounded up. Assume average speed of 25 mph. Formula: `(distanceMiles / 25) * 60`, use `Math.ceil()`
   - `calculateEstimatedFare(totalTripMiles: number): number` — returns fare in dollars. Formula: base fare $50 + ($5 per mile). Minimum fare is $65. Round to nearest dollar with `Math.round()`. Use `Math.max()` to enforce the minimum.

**What "done" looks like:**
- The file exists at `services/requestCalculations.ts`
- All four functions are exported with correct TypeScript types
- The file has no TypeScript errors (check with your editor)
- If you call `calculateEstimatedFare(6.2)` mentally, you get $81. If you call `calculateETA(2.1)` mentally, you get 6 minutes.

---

### Step 2: Add the `enrichRequestWithCalculations` orchestrator function

**What you will learn:** The "object spread" pattern for creating a new object without mutating the original — a core React pattern.

**Files to edit:** `/Users/chris/projects/towlink/services/requestCalculations.ts` (same file as Step 1)

**Guiding question:** In React, you almost never mutate an existing object directly. Instead you create a *new* object with the updated values. In TypeScript, how do you create a copy of an object and override some of its fields? (Hint: look up the spread operator `...` with objects.)

**What to do:**
1. Add one more exported function to `requestCalculations.ts`:
   ```
   enrichRequestWithCalculations(request: Request, driverLocation: Location): Request
   ```
2. Inside this function:
   - Call `calculatePickupDistance` with the driver location and `request.location` (the pickup coordinates)
   - Call `calculateTripDistance` with `request.location` and `request.dropoffLocation`
   - Call `calculateETA` with the pickup distance result
   - Call `calculateEstimatedFare` with the trip distance result
3. Return a new `Request` object using the spread operator: `{ ...request, estimatedPickupDistance: ..., totalTripDistance: ..., estimatedETA: ..., estimatedPrice: ... }`
4. Add a defensive guard at the top: if `request.dropoffLocation` is missing, return the original `request` unchanged

**What "done" looks like:**
- The function accepts a `Request` and a `Location`, and returns a `Request`
- It does not mutate (modify) the original request object
- It calls all four calculation functions from Step 1
- TypeScript is happy with all the types

---

### Step 3: Wire the enrichment into the driver screen

**What you will learn:** How `useMemo` works, how to add a new import to an existing file, and how to pass a computed value as a prop.

**Files to edit:** `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**Guiding question:** Look at line 13 in `driver/index.tsx` — the React imports line. What hooks are currently imported? Now look at lines 37–38 where `claimedRequest` and `showPopup` are set up. Where would you add a `useMemo` that depends on `claimedRequest` and `driverLocation`? And what should it return when either value is `null`?

**What to do:**
1. Add `useMemo` to the React imports on line 13 (it is not there yet)
2. Add the import for `enrichRequestWithCalculations` from `@/services/requestCalculations`
3. Add a `useMemo` block after line 38 (after the `showPopup` line):
   ```typescript
   const enrichedRequest = useMemo(() => {
     if (!claimedRequest || !driverLocation) return claimedRequest;
     return enrichRequestWithCalculations(claimedRequest, driverLocation);
   }, [claimedRequest, driverLocation]);
   ```
4. Scroll down to the `<RequestPopup />` usage (around line 333). Change `request={claimedRequest ?? undefined}` to `request={enrichedRequest ?? undefined}`

**What "done" looks like:**
- `useMemo` is imported from `'react'`
- `enrichRequestWithCalculations` is imported from `'@/services/requestCalculations'`
- `enrichedRequest` is computed with `useMemo`
- `<RequestPopup />` receives `enrichedRequest` instead of `claimedRequest`
- No TypeScript errors

---

### Step 4: Add "Time Posted" to the Commuter Info card

**What you will learn:** How to write a small formatting helper function inside a component, and how to work with JavaScript `Date` objects.

**Files to edit:** `/Users/chris/projects/towlink/components/RequestPopup.tsx`

**Guiding question:** Look at the `Request` interface in `types/models.ts`. The `createdAt` field is already a `Date` object (the Firestore listener converts it before it arrives). How would you calculate how many minutes ago a date was? `Date.now()` gives the current time in milliseconds, and `someDate.getTime()` gives a past date in milliseconds. What arithmetic would you do to get minutes?

**What to do:**
1. Inside `RequestPopup` (before the `return` statement), add a helper function:
   ```typescript
   const formatTimePosted = (date: Date): string => {
     const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);
     if (minutesAgo < 1) return 'Just now';
     if (minutesAgo === 1) return '1 minute ago';
     return `${minutesAgo} minutes ago`;
   };
   ```
2. Find the Commuter Info card (around line 114). It currently only shows `request.commuterName`. Add a `<Text>` below the name that shows `Posted {formatTimePosted(request.createdAt)}`
3. Add a style for this text in the `StyleSheet.create` block at the bottom:
   ```typescript
   timePosted: {
     fontSize: 12,
     color: '#8E8E93',
     marginTop: 2,
   },
   ```

**What "done" looks like:**
- A new line appears below the commuter name in the popup
- It shows something like "Posted 3 minutes ago" or "Posted just now"
- The text is small and grey (less prominent than the name)
- No TypeScript errors

---

### Step 5: Add trip distance to the Drop-off card

**What you will learn:** How to read an existing pattern in the code and apply it consistently to a similar element.

**Files to edit:** `/Users/chris/projects/towlink/components/RequestPopup.tsx`

**Guiding question:** Look at the Pickup Location card (around line 122–135). It shows the address AND a distance line. Now look at the Drop-off Location card (around line 137–146). What is different about it? What one line would you add to make them consistent?

**What to do:**
1. Find the Drop-off Location card's `<View style={styles.locationInfo}>` block
2. After the `request.dropoffAddress` text, add a distance line that follows the same conditional pattern as the pickup card:
   - If `request.totalTripDistance` exists, show `${request.totalTripDistance} mi total trip`
   - Otherwise show `'Distance Calculating...'`
3. You can reuse the existing `styles.distance` style — no new style needed

**What "done" looks like:**
- The drop-off card shows a distance line below the address
- It uses the same grey styling as the pickup distance line
- When real data flows through, it shows something like "6.2 mi total trip"

---

### Step 6: Verify the Accept button flow (no code changes)

**What you will learn:** How to read and trace an existing event handler chain from UI tap to Firestore write.

**Files to read (do not edit):** `app/(driver)/index.tsx` and `services/firebase/firestore.ts`

**Guiding question:** When the driver taps "Accept Request", what happens step by step? Trace the call chain: `onAccept` prop → `handleAcceptRequest` → `acceptClaimedRequest`. What does `acceptClaimedRequest` write to Firestore? Does it update just the request, or does it also create a trip document?

**What to do:**
1. Read `handleAcceptRequest` in `driver/index.tsx` (around line 190)
2. Open `services/firebase/firestore.ts` and find `acceptClaimedRequest`
3. Trace what it does — what Firestore collections does it touch?
4. Confirm that `<RequestPopup />` is already wired with `onAccept={handleAcceptRequest}`

**What "done" looks like:**
- You can explain in plain English what happens when the Accept button is tapped
- You confirm that no code changes are needed for this step
- You understand why the flow is a Firestore transaction (hint: what problem does a transaction solve?)

---

## How to Test

### Quick mental check (before running the app)
- `calculateEstimatedFare(6.2)` should equal `81` ($50 + $31 = $81, above the $65 minimum)
- `calculateEstimatedFare(1)` should equal `65` ($50 + $5 = $55, below the $65 minimum, so minimum applies)
- `calculateETA(2.5)` should equal `6` (2.5/25*60 = 6.0 minutes, ceil = 6)
- `calculateETA(2.1)` should equal `6` (2.1/25*60 = 5.04 minutes, ceil = 6)

### In the simulator
1. Start the app with `npx expo start`
2. Log in as a driver
3. Go online
4. On a second device (or simulator window), log in as a commuter and create a request
5. Watch the driver's popup appear — all five fields should show real numbers, not `'--'` or `'Distance Calculating...'`

### Null location safety check
1. Start the driver screen before GPS has resolved (or simulate a device with no location)
2. Trigger a request popup
3. Confirm the popup shows fallback text (`'Distance Calculating...'`, `'--'`) instead of crashing

### What values to expect
The spec includes mock request coordinates for a quick sanity check. Mock request 1 has:
- Pickup: `{ latitude: 34.2407, longitude: -118.53 }`
- Dropoff: `{ latitude: 34.2321, longitude: -118.5541 }`

You can call `getDistanceInKm` with these two points and verify the result looks reasonable (roughly 2–3 km, which is roughly 1.5–2 miles).

---

## Notes

- `types/models.ts` requires NO changes — all five computed fields already exist as optional properties
- `services/firebase/firestore.ts` requires NO changes
- `services/geoLocationUtils.ts` requires NO changes
- The Accept button flow is already complete — Step 6 is a learning exercise only
- The Haversine formula gives straight-line distance, not driving distance. Drivers understand roads add roughly 20–30% to straight-line distance. This is accurate enough for the MVP.
- `getDistanceInKm()` returns kilometres. Always multiply by `0.621371` before displaying or using in calculations.
