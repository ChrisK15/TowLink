# Phase 7: After-Trip Completion Screen - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

When a trip reaches `completed` status, both driver and commuter see a full-screen trip summary/completion screen with key details before returning to their home/dashboard. No rating system, no payment flow, no new data collection -- just a clear summary of what happened.

</domain>

<decisions>
## Implementation Decisions

### Screen Presentation
- **D-01:** Full-screen overlay that replaces the map view when trip status becomes `completed`. Clean summary card centered on screen. Matches Uber/Lyft completion pattern
- **D-02:** Animated green checkmark that draws in when the screen appears, using React Native Animated API (no extra library)

### Trip Summary Content
- **D-03:** Essential info only: estimated price, pickup address, dropoff address, trip duration, distance
- **D-04:** Show the other party's name -- commuter sees driver name, driver sees commuter name. Data already available from `use-active-trip` and `use-commuter-trip` hooks

### Dismissal & Return Flow
- **D-05:** Single "Done" button at bottom of screen. Tapping returns to idle home/dashboard state. Back gesture also works
- **D-06:** No rating prompt for v1. Rating system deferred as a separate feature/phase

### Driver vs Commuter Differences
- **D-07:** Shared `TripCompletionScreen` component with a `role` prop. Same layout, swaps other party's name based on role. DRY approach
- **D-08:** Role-specific headers: driver sees "Job Complete!", commuter sees "Trip Complete!"

### Claude's Discretion
- Background color/styling of the completion screen (match existing theme)
- Exact animation timing and easing for the checkmark
- How to calculate and display trip duration (from trip timestamps or Directions API data)
- Text formatting for addresses (full address vs abbreviated)
- Whether to show a static mini-map snapshot or just text addresses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` -- Phase 7 requirements are TBD in requirements doc; success criteria defined in ROADMAP.md
- `.planning/ROADMAP.md` SS Phase 7 -- 3 success criteria that must all be true

### Prior Phase Context
- `.planning/phases/04-driver-flow-maps/04-CONTEXT.md` -- Trip status lifecycle, bottom sheet patterns, driver/commuter screen integration points, location tracking patterns

### No external specs
No ADRs or design docs. Requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ActiveTripSheet.tsx` -- Driver trip sheet with status progression; currently clears on `completed`. Integration point for triggering completion screen
- `components/CommuterTripSheet.tsx` -- Commuter trip sheet; currently clears route/ETA on `completed`. Integration point for triggering completion screen
- `hooks/use-active-trip.ts` -- Returns trip data + commuter name/phone for driver. Already fetches all data needed for summary
- `hooks/use-commuter-trip.ts` -- Returns trip data + driver name/phone/vehicle for commuter. Already fetches all data needed for summary
- `services/requestCalculations.ts` -- Pricing logic (base fee + per-km rate) available for price display
- `constants/theme.ts` -- Colors, spacing, typography for consistent styling

### Established Patterns
- Trip status updates via `updateTripStatus(tripId, newStatus)` -- completion screen triggers on status === 'completed'
- Both driver and commuter screens check `trip?.status === 'completed'` and currently reset state -- this is the insertion point
- Bottom sheet pattern with `Animated.View` -- but completion screen will be full-screen, not a sheet
- Role-based routing: `app/(driver)/index.tsx` and `app/(commuter)/index.tsx` are separate entry points

### Integration Points
- `app/(driver)/index.tsx` lines 77-82 -- Currently clears activeTripId on completed. Instead: show TripCompletionScreen, clear on "Done" tap
- `app/(commuter)/index.tsx` lines 58-61 -- Currently clears route on completed. Instead: show TripCompletionScreen, clear on "Done" tap
- Trip data model (`types/models.ts` line 94) -- `status: 'completed'` is the trigger. Trip object has pickupLocation, dropoffLocation, estimatedPrice, timestamps

</code_context>

<specifics>
## Specific Ideas

- "Job Complete!" for driver, "Trip Complete!" for commuter -- role-appropriate language
- Essential info keeps the screen clean and scannable, like a receipt
- Shared component with role prop avoids code duplication while allowing role-specific copy

</specifics>

<deferred>
## Deferred Ideas

- Rating system (star rating for driver/commuter) -- separate feature, adds data model and UI complexity
- Payment receipt with fee breakdown (base + per-mile) -- deferred to v2 payments phase
- Trip history / past trips list -- separate feature

</deferred>

---

*Phase: 07-after-trip-completion-screen*
*Context gathered: 2026-03-24*
