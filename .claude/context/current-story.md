# Current Story: TOW-53

## Story Details
- **ID**: TOW-53
- **Title**: Integrate Real-Time Request Listening
- **Epic**: TOW-3 - EPIC 3: Driver Job Management
- **Priority**: Medium
- **Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-53

## Description
**As a** driver
**I want to** automatically see requests pop up when I'm online
**So that** I don't have to manually refresh

## Acceptance Criteria
- When driver toggles online, start listening to `requests/` collection
- Filter for requests where `claimedByDriverId == currentDriverId`
- Pop-up appears automatically when new request is assigned
- Pop-up dismisses when request is accepted, declined, or times out
- Stop listening when driver goes offline

## Technical Notes
- Use existing `listenForRequests()` from `firestore.ts`
- Add filter: `where('claimedByDriverId', '==', currentDriverId)`
- Hook up pop-up component to the listener
- Handle listener cleanup on component unmount

## Dependencies
This story builds directly on:
- **TOW-52**: Request Assignment & Claiming Logic - the backend logic that sets `claimedByDriverId` on requests (completed and merged to main)
- **TOW-51**: Basic Request Pop-up UI - the pop-up component that this story will wire up to the real-time listener

The claiming logic from TOW-52 is what produces the `claimedByDriverId` field that this listener filters on. Both prerequisite stories are complete.

## Next Steps
Invoke the `technical-architect` agent to create a detailed implementation specification for this story. Key areas to cover:

1. Updating or extending `listenForRequests()` in `firestore.ts` to accept a `driverId` filter
2. Wiring the listener into the driver screen or a custom hook (e.g., `useClaimedRequest`)
3. Connecting the listener result to the existing pop-up component from TOW-51
4. Handling listener lifecycle: start on "go online", stop on "go offline" or unmount
5. Managing state transitions: showing the pop-up on new claim, dismissing on resolution

**Command**: Use `technical-architect` to analyze TOW-53 and create implementation specs
