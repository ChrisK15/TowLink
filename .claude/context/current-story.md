# Current Story: TOW-14

## Story Details
- **ID**: TOW-14
- **Title**: US-2.2: Create Towing Request (FIX LOCATION BUG)
- **Epic**: TOW-2 (EPIC 2: Commuter Request Flow)
- **Priority**: Medium (marked CRITICAL in description)
- **Sprint**: TOW Sprint 2 (ends 2026-02-24)
- **Story Points**: 5
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-14

## Description

**As a** commuter
**I want to** create a towing request with my current location
**So that** nearby drivers can see and accept my request

## CRITICAL BUG TO FIX

Currently in `services/firebase/firestore.ts` line 11-12:

```typescript
location: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
dropoffLocation: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
```

The request creation is working BUT it's using hardcoded coordinates (0,0) instead of real GPS location data. This needs to be fixed so that:
1. Real pickup location coordinates are passed to `createRequest()`
2. Real dropoff location coordinates are passed to `createRequest()`
3. Address strings are also included for both locations

## Acceptance Criteria

- [x] "Request Roadside Assistance" button is visible
- [x] Clicking button creates request in Firestore
- [ ] **FIX: Request must use REAL location coordinates (currently hardcoded to 0,0)**
- [ ] Request includes: commuterId, pickup location, dropoff location, timestamp, status: 'searching'
- [ ] User sees confirmation message: "Searching for drivers..."
- [ ] Button is disabled while creating request
- [ ] Error handling if request creation fails

## Technical Fix Required

**Update `createRequest()` function signature in `services/firebase/firestore.ts`:**

```typescript
export async function createRequest(
  commuterId: string,
  pickupLocation: { latitude: number; longitude: number },
  dropoffLocation: { latitude: number; longitude: number },
  pickupAddress: string,
  dropoffAddress: string
)
```

**Update `app/(tabs)/commuter.tsx`:**
- Pass real location from state (the component already has GPS location tracking)
- Pass both pickup and dropoff locations with their addresses
- The component uses `expo-location` and already has access to real coordinates

## Current Implementation Status

The commuter screen (TOW-39) was recently completed with:
- GPS location tracking working
- Google Maps displaying user's current location
- Location state management in place

This story builds on that work by connecting the real location data to the request creation function.

## Dependencies

- TOW-39 (Commuter Request Screen) - ✅ COMPLETE
- GPS location tracking is already implemented
- Firebase Firestore integration is already working
- Just need to wire up the real data instead of hardcoded values

## Next Steps

Invoke the **technical-architect** agent to create a detailed implementation specification at `.claude/specs/TOW-14.md`.

The technical architect should design:
1. **Updated `createRequest()` function signature**
   - Accept pickup/dropoff locations as parameters
   - Accept pickup/dropoff address strings
   - Maintain backward compatibility if needed
2. **Changes to `commuter.tsx` component**
   - How to extract location from current state
   - How to handle dropoff location (destination selection UI may not exist yet)
   - Error handling if location is not available
3. **Validation logic**
   - Ensure coordinates are valid (not 0,0)
   - Ensure location permission is granted
   - Handle edge cases (no GPS signal, etc.)
4. **Testing strategy**
   - Verify real coordinates are saved to Firestore
   - Test on physical device (emulator GPS may be simulated)
   - Verify request appears correctly to drivers
