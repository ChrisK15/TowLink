# Phase 2: Company-Based Dispatch - Research

**Researched:** 2026-03-16
**Domain:** Firebase Cloud Functions v2, Firestore geohash proximity queries, fair-distribution algorithm, server-side dispatch orchestration
**Confidence:** HIGH

## Summary

This phase rewrites the Cloud Function dispatch layer from a "nearest individual driver globally" model to a "nearest company first, then fair driver within company" model. The existing `matchDriverOnRequestCreate` and `handleClaimTimeouts` functions in `functions/src/index.ts` are the exact targets — no new infrastructure is needed, only surgical replacement of two helper functions and additions to the request document schema.

The key architectural insight: `companyId` does NOT currently exist on the `drivers/{uid}` collection documents. Driver-to-company linkage lives only on `users/{uid}.companyId`. The Cloud Function currently queries `drivers` globally. Phase 2 must join the two: query `users` by `companyId` to get driver UIDs, then look up those drivers' availability/location. Alternatively, the simplest fix is to write `companyId` onto the `drivers/{uid}` doc at initialization time (the `initializeDriverDocument()` call in the driver screen already creates this doc — it just omits `companyId`).

The fair distribution algorithm (least-recent assignment, proximity as tiebreaker, daily reset) is straightforward to implement as a field on the `drivers/{uid}` document — `lastAssignedAt: Timestamp | null` and `assignmentDate: string` (YYYY-MM-DD for daily reset detection). Firestore transactions already used for claiming remain the race-condition guard.

**Primary recommendation:** Add `companyId` and `lastAssignedAt`/`assignmentDate` fields to the `drivers/{uid}` document during driver initialization. This avoids cross-collection joins inside Cloud Functions and keeps dispatch logic simple and fast.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Company Fallback Behavior**
- When the nearest company has no available drivers or all drivers decline, try the next nearest company immediately — no waiting
- Try every company in range in nearest-first order before giving up
- When all companies in range are exhausted, show commuter a simple "No drivers available" message
- No passive notification ("we'll notify you when available") — commuter must retry manually

**Fair Distribution Algorithm**
- Least-recent assignment — the driver who hasn't had a job in the longest time gets the next one
- Proximity as tiebreaker — if two drivers have similar last-assignment times, pick the one closer to the commuter's pickup location
- No cooldown — a driver who just completed a trip is immediately eligible for the next assignment
- Daily reset — fairness tracking (last assignment timestamps) resets each day; yesterday's workload doesn't carry over

**Commuter Experience During Dispatch**
- Single "Searching for driver..." state throughout the entire dispatch process — no visibility into company routing or driver assignment stages
- Search continues until all companies in range are exhausted — no fixed time limit
- On driver accept, show "[Driver Name] from [Company Name] is on the way"
- During re-assignment (driver decline → next driver or next company), commuter continues to see "Searching..." with no indication of re-assignment

### Claude's Discretion
- Exact geohash query strategy for finding nearest companies (range, precision)
- How to store/track daily assignment counts (field on driver doc vs separate collection)
- Claim timeout duration (currently 30 seconds — may adjust)
- Whether to add `companyId`/`matchedCompanyId` as new fields on request document or use existing fields
- Cloud Function architecture (single function vs split into helper functions)
- Firestore transaction boundaries for race-condition safety

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISP-01 | Incoming commuter request is auto-routed to the nearest affiliated tow yard | `geohashQueryBounds` from `geofire-common` already used in `findClosestDriver()`; `companies` collection now has `geohash` + `serviceRadiusKm` fields from Phase 1 — same geohash bounds query applies to companies. Rewrite `matchDriverOnRequestCreate` to query `companies` first, then drivers within that company. |
| DISP-02 | Within the matched company, job is assigned to an available driver using a fair distribution algorithm | Add `lastAssignedAt: Timestamp | null` and `assignmentDate: string` to `drivers/{uid}` doc. Cloud Function sorts available company drivers by `lastAssignedAt` ascending (nulls first = never assigned = highest priority), then proximity as tiebreaker. |
| DISP-03 | If the assigned driver declines, job is re-assigned to the next available driver in the same company | `matchedCompanyId` stored on request doc enables re-assignment within same company on decline/timeout. `handleClaimTimeouts` reads `matchedCompanyId`, queries next available driver in that company using same fair algorithm. Falls through to next nearest company when company is exhausted. |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `geofire-common` | 6.0.0 | Geohash encoding + radius bounds queries | Already used for driver proximity in existing Cloud Functions |
| `firebase-admin` | 13.6.1 (installed), 13.7.0 (latest) | Firestore Admin SDK in Cloud Functions | Required for server-side writes with elevated permissions |
| `firebase-functions` | 7.0.0 (installed), 7.1.1 (latest) | v2 Cloud Functions: `onDocumentCreated`, `onSchedule` | Already used — all new functions follow v2 pattern |

**Version verification:**
- `geofire-common`: 6.0.0 installed = 6.0.0 latest (no update needed)
- `firebase-admin`: 13.6.1 installed, 13.7.0 available (minor update, not required for this phase)
- `firebase-functions`: 7.0.0 installed, 7.1.1 available (minor update, not required)

**Installation:** No new packages required. All dispatch logic runs inside existing `functions/` package.

### Key APIs in Use

| API | Source | Purpose |
|-----|--------|---------|
| `geohashQueryBounds(center, radiusInM)` | `geofire-common` | Generate bounding box for Firestore range query on `geohash` field |
| `distanceBetween([lat,lng], [lat,lng])` | `geofire-common` | Calculate precise distance after geohash pre-filter |
| `onDocumentCreated('requests/{requestId}', handler)` | `firebase-functions/v2/firestore` | Trigger dispatch on new request |
| `onSchedule({ schedule: 'every 1 minutes' }, handler)` | `firebase-functions/v2/scheduler` | Poll for expired claims (existing, needs enhancement) |
| `db.runTransaction(async (tx) => {...})` | `firebase-admin` | Atomic claim operations |

---

## Architecture Patterns

### Recommended File Structure (functions layer only)

```
functions/src/
├── index.ts              # Exported Cloud Functions + helper functions
│   ├── findNearestCompanies()    # NEW: geohash query on companies
│   ├── findFairDriver()          # NEW: least-recent + proximity sort within company
│   ├── matchDriverOnRequestCreate()  # MODIFIED: company-first dispatch
│   └── handleClaimTimeouts()    # MODIFIED: re-dispatch within company, then next company
```

Single-file approach is fine for this scale. Helper functions are not exported — they are module-level functions only called by the two exported Cloud Functions.

### Data Model Changes

#### drivers/{uid} — add two fields

```typescript
// Added during driver initialization in app/(driver)/index.tsx initializeDriverDocument()
// and when a Cloud Function claims a request for this driver
lastAssignedAt: admin.firestore.Timestamp | null  // null = never assigned today
assignmentDate: string                             // 'YYYY-MM-DD' — when lastAssignedAt was set
companyId: string                                  // mirrors users/{uid}.companyId — enables direct query
```

**Why `companyId` on drivers doc:** The Cloud Function currently queries `drivers` collection. To scope dispatch to a company's drivers, the function either needs `companyId` on the drivers doc (simple indexed equality filter) or must first fetch all user UIDs with `companyId == X` then query each driver doc (multiple reads, no geohash filter possible). Adding `companyId` to drivers is the standard pattern and keeps queries simple.

**Why `lastAssignedAt` + `assignmentDate` vs a separate collection:** A separate `dailyStats` collection requires an extra read per dispatch cycle. A field on the driver doc is read in the same batch as availability/location. The daily reset is cheap: compare `assignmentDate` with today's date string in the query sort — if different, treat `lastAssignedAt` as null.

#### requests/{requestId} — add one field

```typescript
matchedCompanyId: string | null   // set when a company is matched; enables re-assignment within same company
```

This field persists through claim/decline cycles. When the Cloud Function re-assigns on decline, it reads `matchedCompanyId` to stay within the same company. It only advances to the next company when all drivers in `matchedCompanyId` have been tried (tracked via the existing `notifiedDriverIds[]` array).

### Pattern 1: Nearest-Company Lookup (DISP-01)

**What:** Query `companies` collection using `geohashQueryBounds`, calculate exact distances, sort by distance, return ordered list.

**When to use:** At request creation (inside `matchDriverOnRequestCreate`) and when advancing to next company (inside `handleClaimTimeouts` when current company is exhausted).

```typescript
// Source: geofire-common pattern (same as existing findClosestDriver in index.ts)
async function findNearestCompanies(
  location: { latitude: number; longitude: number },
  searchRadiusKm: number,
): Promise<Array<{ companyId: string; name: string; distance: number }>> {
  const center = [location.latitude, location.longitude] as [number, number];
  const radiusInM = searchRadiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);

  const promises = bounds.map((bound) =>
    db.collection('companies')
      .where('geohash', '>=', bound[0])
      .where('geohash', '<=', bound[1])
      .get()
  );
  const snapshots = await Promise.all(promises);

  const companies: Array<{ companyId: string; name: string; distance: number }> = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const data = doc.data();
      const companyCenter = [data.location.latitude, data.location.longitude] as [number, number];
      const distance = distanceBetween(center, companyCenter);
      // Only include companies whose own serviceRadiusKm covers the commuter location
      if (distance <= data.serviceRadiusKm) {
        companies.push({ companyId: doc.id, name: data.name, distance });
      }
    }
  }

  return companies.sort((a, b) => a.distance - b.distance);
}
```

**Geohash precision note:** `geohashQueryBounds` with the company's `serviceRadiusKm` as search radius is the right default. A 25km radius generates ~8 geohash bound pairs — well within Firestore's 30-query limit for a single request. The secondary distance check (`distance <= data.serviceRadiusKm`) eliminates false positives from the geohash pre-filter.

### Pattern 2: Fair Driver Selection Within Company (DISP-02)

**What:** Query available drivers in a specific company, apply least-recent-assignment sort, use proximity as tiebreaker.

```typescript
// Source: pattern derived from existing findClosestDriver() — scoped to companyId
async function findFairDriver(
  location: { latitude: number; longitude: number },
  companyId: string,
  excludeDriverIds: string[],
  todayStr: string, // 'YYYY-MM-DD'
): Promise<{ driverId: string; distance: number } | null> {
  const snap = await db.collection('drivers')
    .where('companyId', '==', companyId)
    .where('isAvailable', '==', true)
    .where('isActivelyDriving', '==', false)
    .get();

  const center = [location.latitude, location.longitude] as [number, number];
  const candidates: Array<{
    driverId: string;
    distance: number;
    lastAssignedAt: admin.firestore.Timestamp | null;
    isNewDay: boolean;
  }> = [];

  for (const doc of snap.docs) {
    if (excludeDriverIds.includes(doc.id)) continue;
    const data = doc.data();
    if (!data.currentLocation) continue;
    // Check if user is active (not deactivated)
    if (data.isActive === false) continue;

    const distance = distanceBetween(center, [
      data.currentLocation.latitude,
      data.currentLocation.longitude,
    ]);

    const assignmentDate = data.assignmentDate ?? '';
    const isNewDay = assignmentDate !== todayStr;
    const lastAssignedAt = isNewDay ? null : (data.lastAssignedAt ?? null);

    candidates.push({ driverId: doc.id, distance, lastAssignedAt, isNewDay });
  }

  if (candidates.length === 0) return null;

  // Sort: null lastAssignedAt (never assigned today) first,
  // then oldest assignment first, then closest distance as tiebreaker
  candidates.sort((a, b) => {
    const aTime = a.lastAssignedAt?.toMillis() ?? 0;
    const bTime = b.lastAssignedAt?.toMillis() ?? 0;
    if (aTime !== bTime) return aTime - bTime; // oldest first (0 = never assigned today)
    return a.distance - b.distance; // proximity tiebreaker
  });

  return { driverId: candidates[0].driverId, distance: candidates[0].distance };
}
```

**Note on `isActive` check:** `users/{uid}.isActive` controls deactivation. The `drivers/{uid}` doc doesn't have `isActive`. Two options: (a) add `isActive` to drivers doc and keep it in sync, or (b) cross-reference `users` collection. Recommended: add `isActive: boolean` to `drivers/{uid}` during `initializeDriverDocument()` and update it when admin deactivates. Avoids extra reads per candidate.

### Pattern 3: Modified matchDriverOnRequestCreate (DISP-01 + DISP-02)

**What:** Replace global driver search with: find nearest companies → pick first with available drivers → claim for fairest driver.

```typescript
// Modified function structure (not full implementation — shows the new orchestration flow)
export const matchDriverOnRequestCreate = onDocumentCreated(
  'requests/{requestId}',
  async (event) => {
    const requestData = event.data?.data();
    if (!requestData || requestData.status !== 'searching') return;

    const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const companies = await findNearestCompanies(requestData.location, 100); // 100km outer search radius

    for (const company of companies) {
      const driver = await findFairDriver(
        requestData.location,
        company.companyId,
        requestData.notifiedDriverIds ?? [],
        todayStr,
      );
      if (!driver) continue; // no available driver in this company, try next

      // Claim the request for this driver (existing transaction pattern)
      await db.runTransaction(async (transaction) => {
        const requestRef = db.collection('requests').doc(requestId);
        const requestDoc = await transaction.get(requestRef);
        if (requestDoc.data()?.status !== 'searching') throw new Error('Already claimed');

        transaction.update(requestRef, {
          status: 'claimed',
          claimedByDriverId: driver.driverId,
          matchedCompanyId: company.companyId,   // NEW field
          claimExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30_000)),
          notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(driver.driverId),
        });
      });
      return; // success — stop iterating companies
    }

    // All companies exhausted — update request to signal no drivers available
    await db.collection('requests').doc(requestId).update({ status: 'no_drivers' });
  },
);
```

### Pattern 4: Modified handleClaimTimeouts (DISP-03)

**What:** On timeout/decline, try next available driver in `matchedCompanyId`. If company exhausted, advance to next nearest company.

The key logic change: after resetting claim to `searching`, query `findFairDriver` with `matchedCompanyId` and current `notifiedDriverIds`. If it returns null (company exhausted), call `findNearestCompanies` and skip companies already attempted (track via `triedCompanyIds[]` array on request, or infer from `notifiedDriverIds` by checking which company each notified driver belongs to — the simpler approach is a `triedCompanyIds[]` field on the request).

```typescript
// New field on requests/{requestId}:
triedCompanyIds: string[]   // companies fully exhausted; never re-attempt
```

### Anti-Patterns to Avoid

- **Querying `users` collection inside Cloud Function hot path to find company drivers:** Users collection is for auth/profile data; drivers collection has the location/availability data needed for dispatch. Join at initialization time (write `companyId` to drivers doc) not at dispatch time.
- **Using Cloud Functions Firestore triggers for decline/re-assignment:** Driver decline calls `declineClaimedRequest()` client-side, which resets status to `searching`. This re-triggers `matchDriverOnRequestCreate` only if there's an `onCreate` trigger — there isn't one for updates. The scheduled `handleClaimTimeouts` function (every 1 minute) is the existing re-assignment mechanism. This 1-minute latency is acceptable for decline re-assignment at this scale.
- **Single large transaction spanning company lookup + driver lookup + claim:** The company lookup and driver lookup can fail non-transactionally (read-only queries). Only the final claim write needs a transaction. Keep the transaction boundary tight: only the `transaction.update(requestRef, ...)` call.
- **Not handling deactivated drivers in the Cloud Function query:** `deactivateDriver()` sets `isActive: false` on `users/{uid}` but not on `drivers/{uid}`. Without syncing this to drivers doc or cross-referencing, a deactivated driver could still receive dispatch. Fix at driver doc initialization layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geohash radius query | Custom lat/lng bounding box math | `geohashQueryBounds` from `geofire-common` | Geohash range queries handle 180th meridian edge cases, false positives, and precision correctly |
| Race condition on claim | Optimistic locking or application-level mutex | Firestore `runTransaction()` | Server-enforced atomic read-modify-write; already used in codebase |
| Distance calculation | Haversine formula from scratch | `distanceBetween` from `geofire-common` | Already imported and tested in existing code |

**Key insight:** The entire dispatch algorithm complexity is coordination, not computation. The hard parts (geospatial indexing, atomic writes) are already solved by `geofire-common` and Firestore transactions. The fair-distribution algorithm is a sort function — not a complex scheduler.

---

## Common Pitfalls

### Pitfall 1: `companyId` missing from `drivers/{uid}` document

**What goes wrong:** The Cloud Function queries `drivers` collection where `companyId == X`. But `drivers/{uid}` docs are created by `initializeDriverDocument()` in the driver screen without a `companyId` field. The query returns zero drivers for every company.

**Why it happens:** Phase 1 put `companyId` on `users/{uid}` but not on `drivers/{uid}`. The driver screen's `initializeDriverDocument()` doesn't have access to `companyId` — it only reads `user.uid`.

**How to avoid:** Modify `initializeDriverDocument()` in `app/(driver)/index.tsx` to also write `companyId` to the drivers doc. `user.companyId` is available from `AuthContext`. If the driver doc already exists (existing drivers), a one-time migration or update-on-login approach is needed.

**Warning signs:** `findFairDriver()` always returns null; no drivers are ever dispatched after Phase 2 deploy.

### Pitfall 2: Decline does not re-trigger `matchDriverOnRequestCreate`

**What goes wrong:** Driver declines via `declineClaimedRequest()` which calls `transaction.update(requestRef, { status: 'searching', ... })`. The developer assumes this triggers `matchDriverOnRequestCreate` (an `onDocumentCreated` trigger). It does NOT — Firestore `onDocumentCreated` fires only on document creation, not updates.

**Why it happens:** Common misconception between `onDocumentCreated` (create trigger) and `onDocumentUpdated` (update trigger).

**How to avoid:** Re-assignment on decline is handled by `handleClaimTimeouts` (the existing scheduler running every minute). The declined driver is in `notifiedDriverIds[]` so they are excluded on next assignment cycle. This 1-minute latency is the established pattern — do not add a new `onDocumentUpdated` trigger without careful thought about infinite loops.

**Warning signs:** After a decline, commuter sees "Searching..." for up to 60 seconds before next driver is assigned.

### Pitfall 3: `triedCompanyIds` not tracked — exhausted company is re-attempted

**What goes wrong:** On claim timeout, the Cloud Function finds nearest companies and starts from the beginning again, re-trying companies that already had all drivers decline. This creates an infinite loop of re-assigning the same exhausted company.

**Why it happens:** `notifiedDriverIds[]` tracks individual drivers, not companies. The function can tell which drivers were tried but not which companies were fully exhausted.

**How to avoid:** Add a `triedCompanyIds: string[]` field to the request document (parallel to `notifiedDriverIds[]`). When a company has no remaining available drivers, add its ID to `triedCompanyIds`. On subsequent dispatch cycles, skip companies in `triedCompanyIds`.

### Pitfall 4: Daily reset check is timezone-sensitive

**What goes wrong:** `assignmentDate` is stored as `YYYY-MM-DD`. Comparing to `new Date().toISOString().split('T')[0]` uses UTC. A driver assigned at 11pm local time (7am UTC next day) will have their counter reset in the middle of their shift.

**Why it happens:** `new Date().toISOString()` always returns UTC.

**How to avoid:** Either (a) use UTC consistently for the daily reset boundary (simplest, slight mismatch with driver's calendar day), or (b) use a fixed timezone offset. For a capstone project, UTC is acceptable and consistent. Document the choice.

### Pitfall 5: Geohash query returns companies outside their own service radius

**What goes wrong:** A company 30km away with `serviceRadiusKm: 20` appears in results for a commuter 25km away. The geohash pre-filter uses the search radius, not the individual company's service radius.

**Why it happens:** `geohashQueryBounds` is a rectangular approximation. The secondary filter (`distance <= data.serviceRadiusKm`) catches this but only if the commuter's distance from the company is checked against the company's own radius, not the global search radius.

**How to avoid:** The `findNearestCompanies` pattern above already applies this filter correctly: `if (distance <= data.serviceRadiusKm)`. This is confirmed correct.

### Pitfall 6: acceptClaimedRequest creates Trip without `companyId`

**What goes wrong:** Driver accepts the request via `acceptClaimedRequest()` in `firestore.ts`. This creates a `trips` document. The current implementation does NOT copy `companyId` from the request to the trip. The Admin Jobs tab (Phase 1) queries trips by `companyId` and shows nothing.

**Why it happens:** `acceptClaimedRequest()` in `firestore.ts` was written before Phase 2 added `matchedCompanyId` to requests.

**How to avoid:** Modify `acceptClaimedRequest()` to read `matchedCompanyId` from the request doc and write it as `companyId` on the new trip document. This is the integration point that makes the Admin Jobs tab functional.

---

## Code Examples

### How `geofire-common` geohash bounds work (existing pattern, extended to companies)

```typescript
// Source: existing functions/src/index.ts findClosestDriver() — same pattern applies to companies
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

const center = [latitude, longitude] as [number, number];
const radiusInM = radiusKm * 1000;
const bounds = geohashQueryBounds(center, radiusInM);
// bounds is an array of [lower, upper] geohash string pairs
// Each pair is one Firestore query: .where('geohash', '>=', bound[0]).where('geohash', '<=', bound[1])
// For 25km radius: ~8 pairs. For 100km: ~8-16 pairs. All within Firestore limits.
```

### Firestore transaction pattern (existing, confirmed working)

```typescript
// Source: functions/src/index.ts matchDriverOnRequestCreate — already battle-tested
await db.runTransaction(async (transaction) => {
  const requestRef = db.collection('requests').doc(requestId);
  const requestDoc = await transaction.get(requestRef);
  const data = requestDoc.data();

  if (!data || data.status !== 'searching') {
    throw new Error(`Request already ${data?.status}`); // transaction auto-rolls-back on throw
  }

  transaction.update(requestRef, {
    status: 'claimed',
    claimedByDriverId: driverId,
    matchedCompanyId: companyId,  // new field
    claimExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30_000)),
    notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(driverId),
    triedCompanyIds: admin.firestore.FieldValue.arrayUnion(/* not here — set when company exhausted */),
  });
});
```

### lastAssignedAt update — when to write

```typescript
// When Cloud Function claims a request for a driver, also update their lastAssignedAt
const todayStr = new Date().toISOString().split('T')[0]; // UTC date string
await db.collection('drivers').doc(driverId).update({
  lastAssignedAt: admin.firestore.Timestamp.now(),
  assignmentDate: todayStr,
});
// This write happens AFTER the transaction succeeds (non-transactional is fine —
// if it fails, the driver just gets slightly advantaged on next assignment, not catastrophic)
```

### Request `no_drivers` status — commuter "No drivers available" signal

```typescript
// Add to Request type in types/models.ts:
status: 'searching' | 'claimed' | 'matched' | 'accepted' | 'cancelled' | 'no_drivers'

// Cloud Function sets this when all companies are exhausted:
await db.collection('requests').doc(requestId).update({ status: 'no_drivers' });

// useWatchRequest hook already listens to request status changes.
// FindingDriverModal reacts to status changes — add handler for 'no_drivers':
if (request.status === 'no_drivers') {
  Alert.alert('No Drivers Available', 'All nearby tow yards are busy. Please try again shortly.');
  onCancel();
}
```

### companyId write in initializeDriverDocument (fix for Pitfall 1)

```typescript
// In app/(driver)/index.tsx initializeDriverDocument():
// user?.companyId is available from AuthContext (set in Phase 1)
await setDoc(doc(db, 'drivers', user.uid), {
  userId: user.uid,
  companyId: user.companyId ?? null,  // ADD THIS
  isAvailable: false,
  isVerified: false,
  isActivelyDriving: false,
  isActive: true,                     // ADD THIS (mirrors users/{uid}.isActive)
  lastAssignedAt: null,               // ADD THIS
  assignmentDate: '',                 // ADD THIS
  vehicleInfo: { /* ... */ },
  currentLocation: { latitude: 0, longitude: 0 },
  serviceRadius: 10,
  totalTrips: 0,
  createdAt: Timestamp.now(),
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual driver global query | Company-scoped driver query | Phase 2 (now) | Dispatch is company-aware; nearest company wins, not nearest driver globally |
| No assignment tracking | `lastAssignedAt` + `assignmentDate` on driver doc | Phase 2 (now) | Fair distribution — no single driver always gets first pick |
| `status: 'no match'` (implicit — just no update) | `status: 'no_drivers'` (explicit) | Phase 2 (now) | Commuter UI can distinguish "still searching" from "gave up" |

**No deprecated patterns to remove.** The existing geohash query pattern, transaction-based claiming, and `handleClaimTimeouts` scheduler are all retained and extended.

---

## Open Questions

1. **Should `handleClaimTimeouts` also trigger the company-advance logic, or only the within-company retry?**
   - What we know: Current scheduler handles timeouts (driver ignores claim). Phase 2 also needs to handle explicit declines.
   - What's unclear: Explicit decline resets status to `searching` synchronously (client-side). The scheduler catches it on the next 1-minute cycle. The commuter sees "Searching..." for up to 60 seconds after a decline. This may be acceptable at capstone scale.
   - Recommendation: Keep the scheduler-based approach. Do not add `onDocumentUpdated` triggers — the risk of infinite-loop triggering outweighs the 60-second latency benefit.

2. **What is the outer search radius for `findNearestCompanies`?**
   - What we know: Individual companies have `serviceRadiusKm` (e.g., 25). The global search must be large enough to find at least one company.
   - What's unclear: What if the commuter is in a rural area with no companies within 25km but one at 40km?
   - Recommendation: Use 100km as the outer search radius in `findNearestCompanies`. Companies are then filtered by their own `serviceRadiusKm` as the secondary check. This means a commuter 60km from a company with `serviceRadiusKm: 50` will still be matched. The locked decision (try every company in range) supports a generous outer radius.

3. **How does `triedCompanyIds` reset between requests?**
   - What we know: `notifiedDriverIds` accumulates across the life of a request. `triedCompanyIds` should do the same.
   - What's unclear: Nothing — `triedCompanyIds` is request-scoped and doesn't need to reset. When request reaches `no_drivers` or `accepted`, the document is terminal.
   - Recommendation: Treat `triedCompanyIds` as accumulating like `notifiedDriverIds`. No reset needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None configured — no Jest or Vitest in project |
| Config file | None — Wave 0 gap |
| Quick run command | `npm run lint` (code quality only) |
| Full suite command | `npm run lint` (only available check) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | Nearest company is selected for a new request | manual | Firestore console: create request, observe `matchedCompanyId` populated | N/A |
| DISP-02 | Fair driver selected (least-recent first) | manual | Set two drivers with different `lastAssignedAt`, create request, observe which driver gets claim | N/A |
| DISP-03 | Decline re-assigns to next driver in same company | manual | Driver declines on device, wait up to 60s, observe next driver claimed | N/A |

All Phase 2 behaviors are server-side Cloud Function logic. No automated test infrastructure exists in this project (TEST-01 Maestro is Phase 5). Human verification via Firestore console observation is the phase gate.

### Sampling Rate

- **Per task commit:** `npm run lint -- --quiet` (TypeScript type-check via ESLint, ~3s)
- **Per wave merge:** `npm run lint -- --quiet` + manual Firestore console spot-check
- **Phase gate:** All 3 manual dispatch flows pass before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework configured — acceptable for this phase; TEST-01 addresses in Phase 5
- [ ] No Cloud Functions emulator test harness — manual Firestore console verification is the substitute

*(No new test files needed for Phase 2. Manual verification flows are the gate.)*

---

## Discretion Decisions (Claude's Recommendations)

These areas were explicitly left to Claude's discretion. Recommendations made here are what the planner should execute — no further discussion needed.

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| Geohash query strategy | 100km outer radius in `findNearestCompanies`; secondary filter by each company's own `serviceRadiusKm` | Generous outer radius ensures rural coverage; company's own radius enforces its advertised service area |
| Daily assignment tracking storage | `lastAssignedAt: Timestamp` + `assignmentDate: string` fields on `drivers/{uid}` | Single-collection reads; no extra Firestore operations per dispatch cycle |
| Claim timeout duration | Keep at 30 seconds | Already established and working; sufficient time for driver to notice and respond |
| `companyId` / `matchedCompanyId` fields | Add `matchedCompanyId` to request doc; add `companyId` to drivers doc | Request needs company reference for re-assignment routing; drivers doc needs it for indexed query scoping |
| Cloud Function architecture | Single file (`functions/src/index.ts`), module-level helpers, no splitting | Codebase is small; premature splitting adds navigation overhead with no benefit |
| Firestore transaction boundaries | Tight: only the final `transaction.update(requestRef, ...)` is transactional; company/driver lookups are outside | Avoids read contention on high-traffic documents; transaction only guards the write that changes document state |
| `triedCompanyIds` tracking | Add `triedCompanyIds: string[]` to request doc, parallel to `notifiedDriverIds[]` | Prevents infinite re-dispatch loop against exhausted companies |

---

## Sources

### Primary (HIGH confidence)

- Existing `functions/src/index.ts` — `geohashQueryBounds`, `distanceBetween`, `onDocumentCreated`, `onSchedule`, `runTransaction` patterns verified directly in codebase
- `geofire-common` v6.0.0 — verified installed via `functions/package.json`; `geohashQueryBounds` and `distanceBetween` APIs confirmed from existing function code
- `services/firebase/companies.ts` — company data model (`geohash`, `serviceRadiusKm`, `location`) verified exists from Phase 1
- `types/models.ts` — Request, Driver, Trip, Company interfaces verified from codebase read
- `services/firebase/firestore.ts` — `acceptClaimedRequest()`, `declineClaimedRequest()` transaction patterns verified
- `app/(driver)/index.tsx` — `initializeDriverDocument()` implementation verified; confirms `companyId` is missing from drivers doc

### Secondary (MEDIUM confidence)

- Firebase Admin SDK v13 docs pattern for `FieldValue.arrayUnion` in transactions — consistent with existing usage in codebase
- `geofire-common` README geohash precision behavior — consistent with observed bounds count in existing logger output

### Tertiary (LOW confidence)

- Claim timeout of 30 seconds — established in Phase 1 code, no formal benchmark; assumed adequate for driver response time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new dependencies
- Architecture: HIGH — patterns directly derived from existing working code in the same repository
- Pitfalls: HIGH — identified from reading actual code; not speculative
- Fair distribution algorithm: HIGH — straightforward sort; no external library needed

**Research date:** 2026-03-16
**Valid until:** 2026-04-30 (stable domain — Firebase Admin SDK + geofire-common APIs are mature)
