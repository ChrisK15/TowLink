# Current Story: TOW-78

## Story Details

- **ID**: TOW-78
- **Title**: Price Breakdown & Request Confirmation
- **Epic**: EPIC 2: Commuter Request Flow (TOW-2)
- **Priority**: Medium
- **Sprint**: TOW Sprint 3 (active, Feb 25 - Mar 11, 2026)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-78

## Description

**As a** commuter
**I want to** see the price before confirming my request
**So that** I know what I'll pay

## Acceptance Criteria

- [ ] When dropoff location AND vehicle details are filled, price section appears dynamically below the form
- [ ] Price breakdown card shows:
  - Base Fare: $50.00
  - Distance Charge: (miles × $5/mile)
  - Subtotal
  - **Total Price** (large blue text, minimum $65)
- [ ] Distance calculated using Google Distance Matrix API
- [ ] "Request Service Now" button appears below price breakdown
- [ ] Tapping button:
  - Creates request in Firestore with ALL collected data
  - Closes `RequestServiceSheet` modal
  - Opens `FindingDriverModal` (created in TOW-16)
- [ ] Matches Figma design (`commuter_request_flow_2c.png`)

## Technical Notes (from Jira)

- Price calculation: `Math.max($50 + (miles * $5), $65)`
- Use Google Distance Matrix API for distance
- **REFACTOR**: Remove old request creation from `commuter/index.tsx` button
- **NEW**: Request creation happens in `RequestServiceSheet`'s "Request Service Now" button
- Navigate to `FindingDriverModal` after creating request
- Design Reference: `.claude/design/screens/commuter_request_flow_2c.png`

## Key Notes from TOW-77 Review (for TOW-78 to address)

1. **Form validation**: Enable "Request Service Now" only when all required fields pass:
   - `pickupAddress` not empty
   - `dropoffAddress` not empty
   - `vehicleYear` not empty, 4 digits, numeric (note: Android paste can bypass `keyboardType="numeric"`)
   - `vehicleMake` not empty
   - `vehicleModel` not empty

2. **vehicleYear type conversion**: Parse string → number with `parseInt(vehicleYear, 10)` when building `VehicleInfo`

3. **Coordinates for Firestore**: `Request` interface requires `location: Location` (pickup) and `dropoffLocation: Location` (drop-off). Current state only holds address strings. Either:
   - (Simpler) Store raw lat/lng alongside the address when GPS is used
   - Drop-off can remain address-only for now (no coordinates until map-picker story)

4. **Form state reset on close**: Consider adding a `handleClose` wrapper that resets all state when sheet closes

## Dependencies

- **Blocked by**: TOW-77 (Multi-Step Form - Location/Vehicle) — status is **Done**, blocker is cleared
- **Blocks**: TOW-16 (See Assigned Driver Details) — To Do
- **Note**: TOW-16 (FindingDriverModal) is NOT yet implemented. For TOW-78, the navigation to FindingDriverModal can be stubbed (e.g., log or simple alert) until TOW-16 is done. Confirm this approach with the student.

## Sprint Context

TOW-78 is part of TOW Sprint 3 (Feb 25 - Mar 11, 2026). The story is In Progress. The git branch `TOW-78-price-breakdown-request-confirmation` already exists and is the current working branch. TOW-77 is Done, so this story is fully unblocked.

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation spec at `.claude/specs/TOW-78.md`.
