# Current Story: TOW-75

## Story Details
- **ID**: TOW-75
- **Title**: FE Sprint 3B - Driver Account Setup Screen
- **Epic**: N/A (standalone task)
- **Priority**: Medium
- **Sprint**: TOW Sprint 4
- **Story Points**: 3
- **Status**: To Do
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-75

## Description
Build the driver profile setup screen that appears after signup and role selection, before the driver first lands on their home screen. This is a pure frontend story — the Firestore write patterns and data model already exist.

This screen collects the driver's personal details AND vehicle information needed to start accepting jobs. Currently, new driver accounts land on the home screen with placeholder values like "Unknown" in their vehicleInfo fields. This screen replaces those placeholders with real data.

Flow:
```
Onboarding → Role Selection → Signup → [THIS SCREEN] → Driver Home
```

## Acceptance Criteria
- [ ] Screen layout matches Figma designs
- [ ] Form validation on all fields
- [ ] Save to Firestore (two writes):
  - Write 1: updateDoc() on users/{uid} — saves name and phone
  - Write 2: updateDoc() on drivers/{uid} — saves vehicleInfo object: { make, model, year, licensePlate, towingCapacity }
- [ ] Navigation after save routes to Driver Home
- [ ] Wired into existing flow: role-selection.tsx updated so selecting "driver" navigates to this screen
- [ ] No TypeScript errors
- [ ] No console errors during normal use

## Dependencies
- TOW-74 (Commuter Account Setup Screen) — Done. Use it as the structural reference for this screen.
- Driver document init pattern: app/(driver)/index.tsx — initializeDriverDocument()
- Write pattern: services/firebase/authService.ts — updateUserRole()

## Out of Scope
- Profile photo upload
- Driver license or insurance documents
- Vehicle photo
- Post-setup profile editing (separate settings story)
- serviceRadius or isVerified fields (already set by initializeDriverDocument())

## Key Files
- **Data models**: types/models.ts — User interface and Driver interface (vehicleInfo)
- **Driver document init**: app/(driver)/index.tsx — initializeDriverDocument()
- **Write pattern**: services/firebase/authService.ts — updateUserRole()
- **Screen to modify**: app/(auth)/onboarding/role-selection.tsx
- **Sibling screen to mirror**: app/(auth)/onboarding/commuter-setup.tsx (TOW-74)
- **New file to create**: app/(auth)/onboarding/driver-setup.tsx

## PM Notes
- SignOut Button on driver/index.tsx currently routes to the Commuter Login screen after sign out. Fix this to route to the Driver Login Screen instead.

## Next Steps
Invoke technical-architect to create the implementation spec for TOW-75.

---

## Phase Summary (as of 2026-03-20)

### Phase 1 - Companies & Admin (Complete)
- TOW-84: Company Registration Screen with Geocoding — Done
- TOW-85: Admin Role in AuthContext + Admin Route Group — Done
- TOW-86: Driver Pre-Authorization Signup via Company Email — Done
- TOW-87: Admin Jobs Tab - Real-Time Job Monitoring — Done
- TOW-88: Admin Drivers Tab - Roster, Deactivate, Add Driver — Done
- TOW-89: Firestore Security Rules for Companies Collection — Done

### Phase 2 - Company-Based Dispatch (Complete)
- TOW-90: Nearest-Company Routing via Geohash — Done
- TOW-91: Fair In-Company Driver Assignment Algorithm — Done
- TOW-92: Driver Decline and Re-Assignment Flow — Done

### Phase 3 - Firebase Emulator Infrastructure (Complete)
- TOW-93: Firebase Emulator Infrastructure Setup — Done
- TOW-81: Setup Maestro for E2E Testing — Done (Maestro dropped, emulator infra complete)

### Phase 4 - Driver Flow & Maps (Current)
- TOW-75: Driver Account Setup Screen — To Do (START HERE)
- TOW-75 depends on: TOW-74 (Done)

### Phase 7 - After-Trip Completion Screen (Complete)
- TOW-94: After-Trip Completion Screen — Done
  - Built TripCompletionScreen component (full-screen overlay)
  - Role-based header, animated checkmark, 4-row summary card
  - Driver Done: restores availability, clears trip state
  - Commuter Done: clears activeTripId and activeRequestId
  - Cancelled trips bypass overlay
  - Bug fix: route polyline cleared on completion/cancellation
  - PR #27 on GitHub
  - Comments added to TOW-16 and TOW-40 linking to this work
