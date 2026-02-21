# Current Story: TOW-18

## Story Details
- **ID**: TOW-18
- **Title**: US-3.2: View Request Details
- **Epic**: TOW-3 - EPIC 3: Driver Job Management
- **Priority**: High
- **Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-18

## Description
**As a** driver
**I want to** view detailed information about a request
**So that** I can decide if I want to accept it

## Acceptance Criteria
- [ ] Calculate real values for (currently using mock data):
  1. Pickup location X miles away
  2. Drop-off location X miles away
  3. ETA to pickup
  4. Total distance
  5. Estimated fare
- [ ] Display: commuter name, pickup location address, distance from driver, time posted
- [ ] Directions preview (optional)

## Dependencies
- Builds on the driver dashboard and request pop-up UI (TOW-51)
- Requires real-time request listener to surface a request to the driver (TOW-53 - completed)
- Distance/ETA calculations will use either the Haversine formula or the Google Distance Matrix API
- Accept button should link to the existing `acceptRequest()` function in `firestore.ts`

## Technical Notes
- Calculate distance between driver and request using Haversine formula or Google Distance Matrix API
- Display details from the Firestore request document
- Link the Accept button to the existing `acceptRequest()` function

## Next Steps
Invoke the `technical-architect` agent to create a detailed implementation specification for this story. Key areas to cover:

1. Where to render the request details view (modal, screen, or expanded pop-up)
2. How to calculate distance from driver to pickup using Haversine or Google Distance Matrix API
3. How to calculate ETA to pickup
4. How to calculate total job distance (pickup to drop-off)
5. How to estimate the fare based on distance
6. Displaying commuter name, pickup address, distance, and time posted from the Firestore request document
7. Wiring the Accept button to the existing `acceptRequest()` function

**Command**: Use `technical-architect` to analyze TOW-18 and create implementation specs
