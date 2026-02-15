# Current Story: TOW-50

## Story Details
- **ID**: TOW-50
- **Title**: Driver Home Screen Online/Offline Toggle
- **Epic**: Phase 2 - Driver Experience
- **Priority**: Medium
- **Sprint**: Current Sprint (Active)
- **Story Points**: Not specified
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-50

## Description

**As a** driver
**I want to** toggle myself online/offline and see my location on a map
**So that** I can control when I'm available for requests

## Acceptance Criteria

- [ ] Driver home screen (`/app/(driver)/home.tsx`) created
- [ ] Map displays driver's current location
- [ ] Online/Offline toggle updates driver status in Firestore (`drivers/{id}.isAvailable`)
- [ ] Toggle persists across app restarts
- [ ] Map updates location in real-time when online

## Technical Notes

- Use `expo-location` for GPS
- Use `react-native-maps` for map display
- Update `drivers/{driverId}` document: `isAvailable: true/false`
- Simple UI - no request handling yet

## Dependencies

**Follows:**
- Commuter screen is complete (TOW-14 done)
- Firebase Firestore integration is working
- Map integration patterns established

**Blocks:**
- TOW-51: Basic Request Pop-Up UI (needs online/offline state)
- TOW-52: Request Assignment & Claiming Logic (needs driver availability)
- TOW-53: Integrate Real-Time Request Listening (needs online/offline state)

## Context

This is the first story in the driver experience flow. It establishes the foundation for the driver side of the app by:

1. Creating the driver home screen structure
2. Implementing GPS location tracking
3. Setting up online/offline availability toggle
4. Updating driver status in Firestore

This screen will later be enhanced with request pop-ups (TOW-51) and real-time request listening (TOW-53), but for now the focus is on the basic map view and availability toggle.

The implementation should mirror the patterns used in the commuter screen (`app/(tabs)/commuter.tsx`) which already has working map integration and location handling.

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation specification for this story.
