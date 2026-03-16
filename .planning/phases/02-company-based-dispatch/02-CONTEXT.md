# Phase 2: Company-Based Dispatch - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace individual driver matching with nearest-company routing and fair in-company job assignment. When a commuter submits a tow request, the system finds the nearest affiliated tow yard, assigns the job to an available driver using a fair distribution algorithm, and re-assigns on decline. This phase modifies existing Cloud Functions and Firestore operations — it does not touch driver UI (Phase 3), push notifications (Phase 4), or security rules (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Company Fallback Behavior
- When the nearest company has no available drivers or all drivers decline, try the **next nearest company** immediately — no waiting
- Try **every company in range** in nearest-first order before giving up
- When all companies in range are exhausted, show commuter a simple "No drivers available" message
- No passive notification ("we'll notify you when available") — commuter must retry manually

### Fair Distribution Algorithm
- **Least-recent assignment** — the driver who hasn't had a job in the longest time gets the next one
- **Proximity as tiebreaker** — if two drivers have similar last-assignment times, pick the one closer to the commuter's pickup location
- **No cooldown** — a driver who just completed a trip is immediately eligible for the next assignment
- **Daily reset** — fairness tracking (last assignment timestamps) resets each day; yesterday's workload doesn't carry over

### Commuter Experience During Dispatch
- **Single "Searching for driver..." state** throughout the entire dispatch process — no visibility into company routing or driver assignment stages
- Search continues **until all companies in range are exhausted** — no fixed time limit
- On driver accept, show **"[Driver Name] from [Company Name] is on the way"**
- During re-assignment (driver decline → next driver or next company), commuter continues to see "Searching..." with no indication of re-assignment

### Claude's Discretion
- Exact geohash query strategy for finding nearest companies (range, precision)
- How to store/track daily assignment counts (field on driver doc vs separate collection)
- Claim timeout duration (currently 30 seconds — may adjust)
- Whether to add `companyId`/`matchedCompanyId` as new fields on request document or use existing fields
- Cloud Function architecture (single function vs split into helper functions)
- Firestore transaction boundaries for race-condition safety

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — DISP-01, DISP-02, DISP-03 define all acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (3 items) that must all be true for phase completion

### Prior Phase Context
- `.planning/phases/01-companies-admin/01-CONTEXT.md` — Phase 1 decisions including company data model, geohash storage, driver-company linkage, and admin role patterns

### No external specs
No ADRs, design docs, or external specs exist. Requirements are fully captured in decisions above and in REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `functions/src/index.ts` — **Two existing Cloud Functions**: `matchDriverOnRequestCreate` (proximity matching on request create) and `handleClaimTimeouts` (scheduled, rescues expired claims). Both need modification from individual-driver to company-based dispatch
- `services/geoLocationUtils.ts` — `getGeohash()`, `getDistanceInKm()`, `getGeohashQueryBounds()` all ready for company proximity queries
- `services/firebase/companies.ts` — `listenToCompanyDrivers()` exists for querying drivers by company
- `services/firebase/firestore.ts` — `claimRequest()`, `declineClaimedRequest()`, `acceptClaimedRequest()` all exist with transaction-based claiming

### Established Patterns
- Cloud Functions use `geofire-common` for geohash queries with configurable radius
- Request claiming uses Firestore transactions for race-condition safety
- `notifiedDriverIds[]` array on request tracks which drivers have already been tried
- 30-second `claimExpiresAt` timeout with scheduled function cleanup
- `isAvailable == true` + `isActivelyDriving == false` = driver can receive requests

### Integration Points
- `functions/src/index.ts` `findClosestDriver()` — currently queries `drivers` collection globally; must be scoped to company's drivers
- `functions/src/index.ts` `matchDriverOnRequestCreate()` — must add company lookup step before driver assignment
- `requests/{requestId}` document — needs new fields: `companyId` (matched company) for tracking which company was assigned
- `trips/{tripId}` document — already has `companyId` field; ensure it's populated from the matched company on trip creation
- `drivers/{userId}` document — has `companyId` via users collection but not directly; may need `companyId` on driver doc or cross-reference via `users` collection
- Company `geohash` + `serviceRadiusKm` fields — already stored at creation time (Phase 1 decision), ready for proximity queries

</code_context>

<specifics>
## Specific Ideas

No specific references — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-company-based-dispatch*
*Context gathered: 2026-03-16*
