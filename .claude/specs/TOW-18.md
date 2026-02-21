# Technical Specification: TOW-18

## Story Reference

**ID**: TOW-18
**Title**: US-3.2: View Request Details
**Epic**: TOW-3 - EPIC 3: Driver Job Management
**Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
**Story Points**: 3

**Goal**: Replace all hardcoded/mock values in the `RequestPopup` with real calculated values derived from the Firestore request document and the driver's current live location.

**Acceptance Criteria**:
- Calculate and display distance from driver to pickup location
- Calculate and display distance from pickup to dropoff (total trip distance)
- Calculate and display ETA to pickup (in minutes)
- Calculate and display estimated fare based on total trip distance
- Display commuter name, pickup address, and time posted from Firestore data
- Accept button wired to `acceptClaimedRequest()` (already done in `driver/index.tsx`)

---

## Architecture Overview

The data pipeline for this story is:

```
Firestore request doc (location, dropoffLocation, addresses, commuterId)
        +
Driver's live device GPS (driverLocation state in driver/index.tsx)
        |
        v
  Calculation layer (geoLocationUtils.ts + new fare/ETA helpers)
        |
        v
  Enriched Request object passed as prop to RequestPopup
        |
        v
  RequestPopup renders all 5 computed fields
```

The key insight is that `RequestPopup` already has placeholder UI for all five fields. The fields `estimatedPickupDistance`, `totalTripDistance`, `estimatedETA`, and `estimatedPrice` are already defined on the `Request` type. They just need to be populated with real values before the `request` prop is passed to the popup.

The calculation happens in `app/(driver)/index.tsx` immediately after the `claimedRequest` arrives from the `useClaimedRequest` hook. The driver's current location (`driverLocation` state) is already available in that component.

No new screens, modals, or navigation changes are required. The existing `RequestPopup` modal is the correct location for the details view.

---

## Technical Requirements

### Frontend Components

**Files to modify:**

- `/Users/chris/projects/towlink/app/(driver)/index.tsx`
  Add a `useMemo` (or `useEffect`) that computes the five calculated fields whenever `claimedRequest` or `driverLocation` changes, and passes an enriched copy of the request to `RequestPopup`.

- `/Users/chris/projects/towlink/components/RequestPopup.tsx`
  Minor: add a "Time Posted" display using `request.createdAt`. The rest of the UI already handles all five fields with conditional fallback text (`'Distance Calculating...'`, `'--'`, etc.).

**Files to create:**

- `/Users/chris/projects/towlink/services/requestCalculations.ts`
  A pure utility module containing the four calculation functions. Keeping them in a dedicated service file follows the project's service-layer pattern and makes them independently testable.

### Calculation Approach: Haversine via `geofire-common`

The project already has `geofire-common` installed and a wrapper in `services/geoLocationUtils.ts` that exposes `getDistanceInKm()`. This function uses the `distanceBetween` implementation from `geofire-common`, which is an optimised Haversine formula. **Use this — do not implement a raw Haversine from scratch and do not call the Google Distance Matrix API.**

Reasoning:
- Zero additional API cost (no quota, no billing)
- No network latency — calculation is instant and works offline
- `geofire-common` is already a dependency
- For the MVP use case (driver deciding whether to accept a job), straight-line distance is accurate enough. Drivers understand roads add ~20–30% to actual driving distance.
- Google Distance Matrix API is better but requires an additional API key permission, adds latency, and costs money per call — not appropriate for this stage.

### State Management

No new global state is needed. The computation is local to the driver screen:

```typescript
// In app/(driver)/index.tsx
const enrichedRequest = useMemo(() => {
  if (!claimedRequest || !driverLocation) return claimedRequest;
  return enrichRequestWithCalculations(claimedRequest, driverLocation);
}, [claimedRequest, driverLocation]);
```

Then pass `enrichedRequest` instead of `claimedRequest` to `<RequestPopup />`.

### Firestore Data

All required fields already exist in the `requests` collection. The `listenForClaimedRequests` listener in `firestore.ts` already maps the full document and returns it as a `Request` object. No query changes are needed.

Fields used from the Firestore document:

| Field | Purpose |
|---|---|
| `location` | Pickup coordinates (`{ latitude, longitude }`) |
| `dropoffLocation` | Dropoff coordinates (`{ latitude, longitude }`) |
| `pickupAddress` | Displayed in pickup card |
| `dropoffAddress` | Displayed in dropoff card |
| `commuterName` | Displayed in commuter info card |
| `createdAt` | Used to derive "Time Posted" |
| `vehicleInfo` | Already displayed in Vehicle Details card |
| `customerNotes` | Already displayed in Customer Notes card |

### Backend (Firebase)

No Cloud Function changes required. No new Firestore writes. No new security rule changes.

The only Firestore interaction is the existing `acceptClaimedRequest()` transaction, which is already wired to the Accept button in `driver/index.tsx`.

---

## Implementation Steps

### Step 1: Create `services/requestCalculations.ts`

**File**: `/Users/chris/projects/towlink/services/requestCalculations.ts`
**Action**: Create a new service file with four pure calculation functions.

This file encapsulates all distance, ETA, and fare logic so that `driver/index.tsx` stays focused on UI concerns. Each function should have a clear input/output type and should import from `geoLocationUtils.ts`.

**Functions to implement:**

```typescript
import { Location } from '@/types/models';
import { getDistanceInKm } from '@/services/geoLocationUtils';

// 1. Distance from driver to pickup (in miles)
export function calculatePickupDistance(
  driverLocation: Location,
  pickupLocation: Location
): number

// 2. Total trip distance: pickup to dropoff (in miles)
export function calculateTripDistance(
  pickupLocation: Location,
  dropoffLocation: Location
): number

// 3. ETA to pickup in minutes
// Uses average towing truck speed of 25 mph (urban driving)
export function calculateETA(distanceToPickupMiles: number): number

// 4. Estimated fare
// Formula: base fare + (per-mile rate * total trip miles)
export function calculateEstimatedFare(totalTripMiles: number): number
```

**Fare formula to use:**
- Base fare: $50 (hook-up fee)
- Per-mile rate: $5 per mile of total trip distance
- Minimum fare: $65
- Example: 6.2 miles → $50 + (6.2 × $5) = $81, rounds to $81

```typescript
export function calculateEstimatedFare(totalTripMiles: number): number {
  const BASE_FARE = 50;
  const PER_MILE_RATE = 5;
  const MINIMUM_FARE = 65;
  const calculated = BASE_FARE + totalTripMiles * PER_MILE_RATE;
  return Math.max(Math.round(calculated), MINIMUM_FARE);
}
```

**ETA formula to use:**
- Average speed assumption: 25 mph (conservative urban tow truck speed)
- `etaMinutes = (distanceMiles / 25) * 60`
- Round up with `Math.ceil()` so the driver never promises less time than reality

**Unit conversion note**: `getDistanceInKm()` returns kilometres. Multiply by `0.621371` to convert to miles before using in fare/ETA calculations and before displaying.

```typescript
const KM_TO_MILES = 0.621371;

export function calculatePickupDistance(
  driverLocation: Location,
  pickupLocation: Location
): number {
  const km = getDistanceInKm(driverLocation, pickupLocation);
  return Math.round(km * KM_TO_MILES * 10) / 10; // 1 decimal place
}
```

---

### Step 2: Create an `enrichRequestWithCalculations` helper

**File**: `/Users/chris/projects/towlink/services/requestCalculations.ts` (same file as Step 1)
**Action**: Add one more exported function that takes a `Request` and a driver `Location`, calls all four calculation functions, and returns a new `Request` object with the computed fields filled in.

```typescript
import { Request, Location } from '@/types/models';

export function enrichRequestWithCalculations(
  request: Request,
  driverLocation: Location
): Request {
  const pickupDistanceMiles = calculatePickupDistance(
    driverLocation,
    request.location
  );
  const tripDistanceMiles = calculateTripDistance(
    request.location,
    request.dropoffLocation
  );
  const etaMinutes = calculateETA(pickupDistanceMiles);
  const estimatedFare = calculateEstimatedFare(tripDistanceMiles);

  return {
    ...request,
    estimatedPickupDistance: pickupDistanceMiles,
    totalTripDistance: tripDistanceMiles,
    estimatedETA: etaMinutes,
    estimatedPrice: estimatedFare,
  };
}
```

This function intentionally does not mutate the original request object — it returns a new object using the spread operator. This is the correct React pattern.

---

### Step 3: Wire the enrichment into `driver/index.tsx`

**File**: `/Users/chris/projects/towlink/app/(driver)/index.tsx`
**Action**: Import `enrichRequestWithCalculations` and compute an `enrichedRequest` using `useMemo`.

Add the import at the top:

```typescript
import { enrichRequestWithCalculations } from '@/services/requestCalculations';
```

Add the `useMemo` after the existing state declarations (around line 38, after the `useClaimedRequest` call):

```typescript
const enrichedRequest = useMemo(() => {
  if (!claimedRequest || !driverLocation) return claimedRequest;
  return enrichRequestWithCalculations(claimedRequest, driverLocation);
}, [claimedRequest, driverLocation]);
```

Also add `useMemo` to the import from `'react'` (it is not currently imported).

Then update the `RequestPopup` usage at the bottom of the JSX (around line 333) to use `enrichedRequest`:

```tsx
<RequestPopup
  request={enrichedRequest ?? undefined}   // was: claimedRequest ?? undefined
  visible={showPopup}
  onAccept={handleAcceptRequest}
  onDecline={handleDeclineRequest}
  isLoading={isActioning}
/>
```

No other changes are needed in `driver/index.tsx`.

---

### Step 4: Add "Time Posted" to `RequestPopup.tsx`

**File**: `/Users/chris/projects/towlink/components/RequestPopup.tsx`
**Action**: Add a formatted time-posted line inside the commuter info card.

The design mockup (`driver-request-popup.png`) shows the commuter name but not an explicit "time posted". However, the acceptance criteria calls for it. Add it as a secondary line in the existing commuter info card, below the name.

Add a helper function inside the component:

```typescript
const formatTimePosted = (date: Date): string => {
  const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutesAgo < 1) return 'Just now';
  if (minutesAgo === 1) return '1 minute ago';
  return `${minutesAgo} minutes ago`;
};
```

Then in the commuter info card JSX (around line 114), add below the `commuterName` text:

```tsx
<Text style={styles.timePosted}>
  Posted {formatTimePosted(request.createdAt)}
</Text>
```

Add a corresponding style:

```typescript
timePosted: {
  fontSize: 12,
  color: '#8E8E93',
  marginTop: 2,
},
```

---

### Step 5: Add "Pickup distance" line to the Drop-off card in `RequestPopup.tsx`

**File**: `/Users/chris/projects/towlink/components/RequestPopup.tsx`
**Action**: The drop-off location card currently shows the address but no distance. Add a distance line mirroring the pickup card pattern.

The pickup card (around line 129) already shows:
```tsx
<Text style={styles.distance}>
  {request.estimatedPickupDistance
    ? `${request.estimatedPickupDistance} miles away`
    : 'Distance Calculating...'}
</Text>
```

Add a similar line to the drop-off card after `request.dropoffAddress`:

```tsx
<Text style={styles.distance}>
  {request.totalTripDistance
    ? `${request.totalTripDistance} mi total trip`
    : 'Distance Calculating...'}
</Text>
```

This matches the design mock which shows "6.2 miles total trip" beneath the drop-off address.

---

### Step 6: Verify Accept button flow (no code changes needed)

**File**: `/Users/chris/projects/towlink/app/(driver)/index.tsx`
**Action**: Confirm the existing wiring is correct — no changes needed.

The Accept button flow is already complete:
1. User taps "Accept Request" in `RequestPopup`
2. `onAccept` prop fires → `handleAcceptRequest()` in `driver/index.tsx`
3. `handleAcceptRequest` calls `acceptClaimedRequest(claimedRequest.id, user.uid)`
4. `acceptClaimedRequest` runs a Firestore transaction that:
   - Updates `requests/{id}.status` to `'accepted'`
   - Sets `matchedDriverId`
   - Creates a new `trips/` document with `status: 'en_route'`
   - Sets `isActivelyDriving: true` on the driver document

The student should trace through this flow to understand it, but no code changes are needed here.

---

## TypeScript Type Changes

### `types/models.ts` — No changes required

All five computed fields already exist on the `Request` interface as optional properties:

```typescript
estimatedPickupDistance?: number;  // distance from driver to pickup, in miles
totalTripDistance?: number;        // pickup-to-dropoff distance, in miles
estimatedETA?: number;             // minutes to reach pickup
estimatedPrice?: number;           // calculated fare in USD
```

The `commuterName` and `createdAt` fields are also already present. No type changes are needed.

### New file type signatures

The student will be writing a new service file. The complete type contract for `requestCalculations.ts` is:

```typescript
// All inputs/outputs
calculatePickupDistance(driverLocation: Location, pickupLocation: Location): number
calculateTripDistance(pickupLocation: Location, dropoffLocation: Location): number
calculateETA(distanceToPickupMiles: number): number
calculateEstimatedFare(totalTripMiles: number): number
enrichRequestWithCalculations(request: Request, driverLocation: Location): Request
```

---

## Edge Cases

1. **Driver location is null when popup appears** — The `useMemo` returns the unmodified `claimedRequest` when `driverLocation` is null. The popup already handles missing values gracefully with `'Distance Calculating...'` and `'--'` fallbacks. No crash risk.

2. **Driver location updates after popup opens** — Because `enrichedRequest` is a `useMemo` with `[claimedRequest, driverLocation]` as dependencies, it will recompute if the driver's location changes while the popup is open. This is correct behavior — the distances will auto-update in the background.

3. **Pickup and dropoff locations are identical** — `calculateTripDistance` would return 0. The fare would be $65 (minimum). This is a valid edge case (e.g. a jump-start at the same lot). The UI handles it correctly.

4. **Very large distances (e.g. 100+ miles)** — The Haversine calculation is accurate at these distances. The fare formula will just be higher. No special handling needed.

5. **`createdAt` is a Firestore `Timestamp` vs `Date`** — The `listenForClaimedRequests` function in `firestore.ts` already calls `.toDate()` on `createdAt` before returning the object, so by the time the component receives it, it is a standard JS `Date`. No conversion needed in the component.

6. **Request expires while popup is open** — The existing `claimExpiresAt` timer already handles this: when `timeLeft <= 0`, `onDecline()` is called automatically. The enrichment calculations do not affect this flow.

7. **`dropoffLocation` is missing from a request** — The `Request` type and `createRequest()` both require `dropoffLocation`, so this should not occur for valid requests. If it does, `getDistanceInKm` would receive undefined coordinates and could throw. A defensive check can be added: `if (!request.dropoffLocation) return request;` inside `enrichRequestWithCalculations`.

---

## Testing Strategy

### Manual Testing (Phase 2 approach)

1. **Two-device test**: Use one device as commuter (create a request) and another as driver (go online, wait for popup, verify all five fields show real numbers)

2. **Single-device test with mock data**: The existing `MOCK_REQUESTS` in `services/mockData/request.ts` have hardcoded distances. Temporarily trigger the popup using mock data and verify the calculation replaces the hardcoded values. Mock request 1 has `location: { latitude: 34.2407, longitude: -118.53 }` and `dropoffLocation: { latitude: 34.2321, longitude: -118.5541 }`. The student should calculate what values to expect and verify the popup shows them.

3. **Null driver location test**: Start the driver screen before GPS has resolved, confirm the popup still shows graceful fallback strings, not crashes.

4. **Unit test the calculation functions** (encouraged but not required for this sprint):

```typescript
// In a new file __tests__/requestCalculations.test.ts
import { calculatePickupDistance, calculateTripDistance, calculateETA, calculateEstimatedFare } from '../services/requestCalculations';

test('calculateEstimatedFare returns minimum fare for short trips', () => {
  expect(calculateEstimatedFare(1)).toBe(65); // $50 + $5 = $55, min is $65
});

test('calculateEstimatedFare scales with distance', () => {
  expect(calculateEstimatedFare(6.2)).toBe(81); // $50 + $31 = $81
});

test('calculateETA returns whole minutes rounded up', () => {
  expect(calculateETA(2.5)).toBe(6); // 2.5/25*60 = 6.0 min
  expect(calculateETA(2.1)).toBe(6); // 2.1/25*60 = 5.04, ceil = 6
});
```

---

## Dependencies

- `geofire-common` — already installed, used in `geoLocationUtils.ts`
- No new packages required
- TOW-53 (real-time request listener) — already complete; the `useClaimedRequest` hook and `listenForClaimedRequests` are functional
- TOW-51 (driver popup UI) — already complete; `RequestPopup.tsx` exists with all placeholder UI

---

## File Summary

| File | Action | Notes |
|---|---|---|
| `/Users/chris/projects/towlink/services/requestCalculations.ts` | CREATE | New service file with 5 exported functions |
| `/Users/chris/projects/towlink/app/(driver)/index.tsx` | MODIFY | Add `useMemo` for enrichment; update `RequestPopup` prop |
| `/Users/chris/projects/towlink/components/RequestPopup.tsx` | MODIFY | Add time-posted line; add trip distance line to dropoff card |
| `/Users/chris/projects/towlink/types/models.ts` | NO CHANGE | All required fields already exist |
| `/Users/chris/projects/towlink/services/firebase/firestore.ts` | NO CHANGE | Query and listener already correct |
| `/Users/chris/projects/towlink/services/geoLocationUtils.ts` | NO CHANGE | `getDistanceInKm` already available |

---

## Design Reference

Two design mockups exist in `.claude/design/screens/`:

- `driver-request-popup.png` — full popup showing: commuter name with initials, pickup address + "2.5 miles away", dropoff address + "6.2 miles total trip", service type + "$95 fare"
- `driver-request-popup-2.png` — scrolled down, showing: vehicle details, customer notes, "ETA to Pickup: 8 min", "Total Distance: 8.7 mi"

The current `RequestPopup.tsx` implementation already matches both screens. The only gap is that the numeric values currently show as `'--'` or `'Distance Calculating...'` because they are not being computed yet. This story fills that gap.
