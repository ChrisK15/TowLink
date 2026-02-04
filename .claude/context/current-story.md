# Current Story: TOW-10

## Story Details
- **ID**: TOW-10
- **Title**: US-1.4: Role-Based Navigation Routing
- **Epic**: TOW-1 (EPIC 1: User Authentication & Account Management)
- **Priority**: Medium (marked CRITICAL in description; 5 story points)
- **Sprint**: TOW Sprint 1 (Week 1-2)
- **Story Points**: 5
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-10

## Description

**As a** logged-in user
**I want to** be automatically directed to the correct dashboard based on my role
**So that** I see features relevant to me

After a user authenticates (via signup or login), the app must read their stored role from Firestore and route them to the appropriate experience. Commuters should land on a commuter-specific home screen; drivers on a driver-specific home screen. This routing must survive app restarts (i.e., it is not a one-time post-login redirect -- it is the persistent navigation structure).

## Acceptance Criteria

- [ ] Commuters navigate to commuter home screen (map with "Request Assistance" button)
- [ ] Drivers navigate to driver home screen (map with pending requests)
- [ ] Role is checked from Firestore user document
- [ ] Navigation persists across app restarts
- [ ] If role is missing or invalid, show error and log out

## Technical Notes (from Jira)

- Update app navigation structure to use role-based routing
- Create `/app/(commuter)/_layout.tsx` and `/app/(driver)/_layout.tsx`
- Use AuthContext to provide user role throughout app

## Dependencies

- **TOW-7** (User Sign Up with Email/Password) -- Done. Established the Firestore user document structure with the `role` field and the `authService.ts` service layer.
- **TOW-8** (Role Selection During Signup) -- Done. The `role` field is reliably written to Firestore after signup.
- **TOW-9** (User Login with Email/Password) -- Done. Login reads the role from Firestore post-authentication. The `signInWithEmail()` function and role-check logic already exist in `authService.ts`.

## Codebase Context (as of TOW-9 completion)

### What Exists
- `services/firebase/authService.ts` -- contains `signUpWithEmail()`, `signInWithEmail()`, and `updateUserRole()`. The login flow already reads the user's role from Firestore after sign-in.
- `services/firebase/config.ts` -- exports `auth` and `db` (Firebase Auth and Firestore instances).
- `app/(auth)/` -- auth route group with index, signup, login, and role-selection screens. Auth flow is complete.
- `app/(tabs)/` -- current tab layout (generic, not yet role-split). Contains `index.tsx`, `commuter.tsx`, `driver.tsx`, and `_layout.tsx`.
- `types/models.ts` -- has the `User` interface with `role: 'commuter' | 'driver' | 'both' | null`.
- `app/_layout.tsx` -- root layout that orchestrates auth vs. app navigation.

### What Does NOT Exist Yet
- `/app/(commuter)/` route group and its `_layout.tsx` (commuter-specific tab navigation)
- `/app/(driver)/` route group and its `_layout.tsx` (driver-specific tab navigation)
- An `AuthContext` (or equivalent) that exposes the current user's role to the entire app tree
- Root-level routing logic that branches between `(commuter)` and `(driver)` based on the authenticated role
- Handling for the "role missing or invalid" edge case at the navigation level (currently handled only at login time)

### Key Patterns to Follow
- Service functions live in `services/firebase/authService.ts`, not in components
- Use `router.replace()` for auth-flow navigation to prevent back-navigation
- Use absolute imports with the `@/` prefix (e.g., `@/services/firebase/authService`)
- Use `StyleSheet.create()` for styles
- Firebase errors are caught and translated to user-friendly messages

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation specification for TOW-10. The architect should design:
1. The AuthContext provider -- how user state (including role) is made available app-wide
2. The root layout routing logic -- how `_layout.tsx` branches to `(commuter)` vs `(driver)` based on role
3. The `(commuter)` and `(driver)` route groups and their layout files
4. The placeholder commuter and driver home screens that satisfy the acceptance criteria
5. The fallback path: what happens when role is missing or invalid (error screen + logout)
