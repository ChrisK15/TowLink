# Current Story: TOW-11

## Story Details
- **ID**: TOW-11
- **Title**: US-1.7: Persistent Authentication State
- **Epic**: TOW-1 (EPIC 1: User Authentication & Account Management)
- **Priority**: HIGH (Medium in Jira, but marked HIGH in description)
- **Sprint**: TOW Sprint 1 (Week 1-2)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-11

## Description

**As a** user
**I want to** stay logged in when I close and reopen the app
**So that** I don't have to log in every time

## Acceptance Criteria

- [ ] User remains authenticated across app restarts
- [ ] User is automatically navigated to their dashboard on app open
- [ ] Auth state is checked on app launch
- [ ] If token expires, user is logged out gracefully

## Technical Notes (from Jira)

- Firebase Auth handles token persistence automatically
- Create `AuthContext` with `useEffect` to listen to auth state changes

## Dependencies

- **TOW-7** (User Sign Up with Email/Password) -- Completed
- **TOW-8** (Role Selection During Signup) -- Completed
- **TOW-9** (User Login with Email/Password) -- Completed
- **TOW-10** (Role-Based Navigation Routing) -- Completed

## Codebase Context

### What Exists (from TOW-10 completion)
- `services/firebase/authService.ts` -- contains `signUpWithEmail()`, `signInWithEmail()`, `signOut()`, and `updateUserRole()`
- `services/firebase/config.ts` -- exports `auth` and `db` (Firebase Auth and Firestore instances)
- `app/(auth)/` -- auth route group with complete signup, login, and role selection flow
- `app/(commuter)/` -- commuter-specific route group with tab navigation
- `app/(driver)/` -- driver-specific route group with tab navigation
- `app/_layout.tsx` -- root layout that manages auth vs. app navigation
- `types/models.ts` -- has the `User` interface with `role: 'commuter' | 'driver' | 'both' | null`

### What Does NOT Exist Yet
- **AuthContext** or AuthProvider that:
  - Listens to Firebase auth state changes (`onAuthStateChanged`)
  - Fetches user role from Firestore when authenticated
  - Exposes current user state and role app-wide
  - Handles loading states during auth checks
  - Manages token expiration gracefully
- Auth state listener that persists across app restarts
- Automatic navigation based on auth state at app launch
- Loading screen while auth state is being determined

### Key Patterns to Follow
- Service functions live in `services/firebase/authService.ts`, not in components
- Use `router.replace()` for auth-flow navigation to prevent back-navigation
- Use absolute imports with the `@/` prefix (e.g., `@/services/firebase/authService`)
- Use `StyleSheet.create()` for styles
- Firebase errors are caught and translated to user-friendly messages
- Context providers should handle loading states properly

## Current Branch

TOW-11-us-1-7-persistent-authentication-state (clean working directory)

## Next Steps

Invoke the **technical-architect** agent to create a detailed implementation specification at `.claude/specs/TOW-11.md`.

The technical architect should design:
1. **AuthContext/AuthProvider** structure and API
   - User state management (authenticated user + role)
   - Loading state during auth checks
   - Firebase auth state listener setup
2. **Integration with existing code**
   - How AuthProvider wraps the app in `_layout.tsx`
   - How existing auth screens (login/signup) interact with AuthContext
   - How role-based routing uses AuthContext
3. **Auth persistence flow**
   - App launch sequence (loading -> auth check -> navigate)
   - Token expiration handling (graceful logout)
   - Error states (network issues, invalid role, etc.)
4. **Testing approach**
   - How to test auth persistence manually
   - Edge cases to verify (token expiration, role changes, etc.)
