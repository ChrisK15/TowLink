# Current Story: TOW-75

## Story Details
- **ID**: TOW-75
- **Title**: FE Sprint 3B – Driver Account Setup Screen
- **Epic**: Driver Onboarding / Account Setup
- **Priority**: Medium
- **Sprint**: TOW Sprint 4 (Mar 12 – Mar 26, 2026)
- **Story Points**: 3
- **Status**: To Do
- **Assignee**: ltahmasian24 (Lawrence)
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-75

## Description

Build the driver profile setup screen that appears **after** the signup + role selection flow, before the driver first lands on their home screen. This is a **pure frontend story** — the Firestore write patterns and data model already exist in the codebase; the goal is to match the Figma design exactly.

This screen collects the driver's personal details AND vehicle information needed to start accepting jobs. Currently, new driver accounts land on the home screen with placeholder values like `"Unknown"` in their `vehicleInfo` fields — this screen replaces those with real data.

**Where it fits in the flow:**

```
Onboarding -> Role Selection -> Signup -> [THIS SCREEN] -> Driver Home
```

## Acceptance Criteria

- [ ] Screen layout matches Figma design
- [ ] Form validation is implemented
- [ ] Save to Firestore (two writes):
  - Write 1: `updateDoc()` on `users/{uid}` — saves `name` and `phone`
  - Write 2: `updateDoc()` on `drivers/{uid}` — saves `vehicleInfo` object: `{ make, model, year, licensePlate, towingCapacity }`
- [ ] Navigation wired correctly after save
- [ ] Wired into the existing onboarding flow:
  - `app/(auth)/onboarding/role-selection.tsx` is updated so that selecting "driver" and tapping Continue navigates to this new screen instead of directly to `app/(auth)/signup.tsx`
- [ ] No TypeScript errors
- [ ] No console errors during normal use
- [ ] PM Note: Fix the SignOut button on `driver/index.tsx` — it currently routes to the Commuter Login screen; it should route to the Driver Login screen

## Out of Scope

- Profile photo upload
- Driver license or insurance document upload
- Vehicle photo
- Editing the profile after setup (separate settings story)
- The `serviceRadius` or `isVerified` fields (already set by `initializeDriverDocument()`)

## Dependencies

- **Blocked by**: TOW-74 (FE Sprint 3A – Commuter Account Setup Screen) — STATUS: Done
  - TOW-74 is complete, so this story is unblocked and ready to begin
- The driver document initialization logic already exists in `app/(driver)/index.tsx` via `initializeDriverDocument()`
- The `updateDoc()` write pattern already exists in `services/firebase/authService.ts`

## Key Files to Reference

- `types/models.ts` — `User` interface and `Driver` interface (`vehicleInfo`)
- `app/(driver)/index.tsx` — `initializeDriverDocument()` shows the full `Driver` document structure and default values
- `services/firebase/authService.ts` — `updateUserRole()` using `updateDoc()` — the write pattern to follow
- `app/(auth)/onboarding/role-selection.tsx` — add navigation to the new driver-setup screen for the driver path
- `app/(auth)/onboarding/commuter-setup.tsx` — the sibling screen from TOW-74; mirror this structure and add vehicle fields

## Suggested File to Create

```
app/
  (auth)/
    onboarding/
      driver-setup.tsx     <- CREATE THIS FILE
```

## Sprint 4 Context

TOW-75 is one of 11 stories in TOW Sprint 4. All other sprint stories are also To Do, so this is a clean slate sprint. The other active sprint stories are:

| Key     | Summary                                          | Points |
|---------|--------------------------------------------------|--------|
| TOW-75  | FE Sprint 3B – Driver Account Setup Screen       | 3      |
| TOW-83  | Fix Route Flickering on App Startup              | 3      |
| TOW-81  | Setup Maestro for E2E Testing                    | 2      |
| TOW-80  | Real-Time Driver Location Tracking               | 8      |
| TOW-63  | FE Sprint 4 – UI Delivery (Payments + Notifs)    | 8      |
| TOW-58  | Update Firebase Security Rules                   | 1      |
| TOW-29  | US-6.4: Push Notification Setup                  | 5      |
| TOW-28  | US-5.3: Create Payment Intent (Cloud Function)   | 8      |
| TOW-27  | US-5.2: Add Payment Method (Credit Card)         | 5      |
| TOW-25  | US-5.1: Stripe SDK Integration                   | 5      |
| TOW-24  | US-4.5: Location Permission Handling             | 2      |

## Next Steps

Invoke the `technical-architect` agent to create the implementation spec at `.claude/specs/TOW-75.md`.

Before coding begins, take Figma screenshots of the driver account setup screen and place them in `.claude/design/screens/driver_account_setup/` — reference these side-by-side with the simulator during implementation, exactly as was done for the onboarding screens.
