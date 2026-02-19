# Current Story: TOW-52

## Story Details
- **ID**: TOW-52
- **Title**: Request Assignment & Claiming Logic
- **Epic**: TOW-3 - EPIC 3: Driver Job Management
- **Priority**: Medium
- **Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
- **Story Points**: 8
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-52

## Description
**As a** driver
**I want to** be the only driver who sees a specific request
**So that** multiple drivers don't try to accept the same job

## Acceptance Criteria
- When request is created, assign to closest **online** driver
- Update request status: `searching` → `claimed` (with `claimedByDriverId` and `claimExpiresAt`)
- Only the assigned driver sees the pop-up
- If driver doesn't respond in 30 seconds, request returns to `searching` and goes to next driver
- If driver declines, request goes to next closest driver
- Use Firestore transactions to prevent race conditions
- Cloud Function or client-side logic handles driver prioritization

## Technical Notes
- **Critical**: Use Firestore transactions for atomic claim operation
- Calculate closest driver using geohash queries (geofire-common)
- Set `claimExpiresAt` timestamp (30 seconds from now)
- Cloud Function to monitor expired claims and reassign
- Complex state machine: `searching` → `claimed` → `accepted` or timeout → `searching`

## Dependencies
This story builds on the commuter request screen (TOW-51) and requires:
- Driver online status tracking
- Geolocation data for drivers
- Real-time Firestore listeners for request state changes
- Firebase Cloud Functions for timeout handling and reassignment logic

## Related Stories
- TOW-51: Basic Request Pop-up UI (Completed - merged to main)
- Part of EPIC 3: Driver Job Management

## Next Steps
Invoke the `technical-architect` agent to create a detailed implementation specification for this story. This is a complex feature involving:
1. Firestore schema updates for driver online status and geolocation
2. Geohash-based proximity queries using geofire-common
3. Transaction-based claiming logic to prevent race conditions
4. Cloud Function for monitoring claim expiration and reassignment
5. Client-side state management for the request lifecycle

**Command**: Use `technical-architect` to analyze TOW-52 and create implementation specs
