# Current Story: TOW-9

## Story Details
- **ID**: TOW-9
- **Title**: US-1.3: User Login with Email/Password
- **Epic**: TOW-1 (User Authentication & Account Management)
- **Priority**: Critical
- **Sprint**: TOW Sprint 1 (Week 1-2)
- **Story Points**: TBD (confirm in Jira)
- **Status**: To Do
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-9
- **Branch**: TOW-9-us-1-3-user-login (already checked out)

## Description

**As a** returning user
**I want to** log in with my email and password
**So that** I can access the TowLink app without creating a new account

This is the login counterpart to TOW-7 (signup). Returning users who already have an account need a way to authenticate and be directed to the correct interface based on their stored role (commuter or driver).

## Acceptance Criteria

- [ ] Login screen is accessible (a "Log In" link/button on the signup screen, or the auth index routes appropriately)
- [ ] User can enter email and password
- [ ] Successful login authenticates with Firebase Auth using `signInWithEmailAndPassword()`
- [ ] On successful login, the user's role is read from Firestore to determine where to navigate
- [ ] If role is set (commuter or driver), navigate directly to the main app tabs
- [ ] If role is NOT set (edge case -- account created but role selection was skipped or failed), redirect to the role selection screen
- [ ] Invalid credentials show a clear, user-friendly error message
- [ ] Empty fields are validated before attempting login
- [ ] Loading state is shown while authentication is in progress

## Dependencies

- **TOW-7** (User Sign Up with Email/Password) - COMPLETED
  - The login screen reuses the same service layer pattern established in TOW-7
  - The Firestore user document structure (with `role` field) was defined here
- **TOW-8** (Role Selection During Signup) - COMPLETED
  - The `role` field in Firestore is now reliably set after signup
  - Login must read this field to route the user correctly

## Codebase Context (as of TOW-8 completion)

### What Exists
- `services/firebase/authService.ts` -- has `signUpWithEmail()` and `updateUserRole()`. Needs a new `signInWithEmail()` function.
- `services/firebase/config.ts` -- exports `auth` (Firebase Auth instance) and `db` (Firestore instance). Gitignored due to API keys.
- `app/(auth)/index.tsx` -- currently a hard redirect to `/signup`. Will need to be updated to offer login as an option.
- `app/(auth)/signup.tsx` -- the signup screen. May need a "Already have an account? Log in" link added.
- `app/(auth)/role-selection.tsx` -- role selection, navigates to `/(tabs)` on success.
- `app/_layout.tsx` -- root layout with `(auth)` and `(tabs)` route groups. The anchor is set to `(auth)`.
- `types/models.ts` -- has the `User` interface with `role: 'commuter' | 'driver' | 'both' | null`.

### What Does NOT Exist Yet
- A login screen (`app/(auth)/login.tsx` or similar)
- A `signInWithEmail()` function in authService.ts
- Any logic to read the user's role from Firestore after login
- Any navigation between signup and login screens

### Key Patterns to Follow
- Service functions live in `services/firebase/authService.ts`, not in components
- Firebase errors are caught and translated to user-friendly messages (see `signUpWithEmail` for the pattern)
- Use `auth.currentUser` to get the authenticated user after sign-in
- Use `router.replace()` (not `push()`) for auth-flow navigation to prevent back-navigation to login/signup
- Use absolute imports with the `@/` prefix (e.g., `@/services/firebase/authService`)
- Use `StyleSheet.create()` for styles (see role-selection.tsx for a clean example)
- Validate inputs client-side before calling Firebase

### Firebase Functions Needed
- `signInWithEmailAndPassword(auth, email, password)` -- from `firebase/auth`
- `getDoc(doc(db, 'users', userId))` -- from `firebase/firestore`, to read the user's role after login

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation specification for TOW-9. The architect should design:
1. The new `signInWithEmail()` service function
2. The login screen component and its UI
3. The post-login role-check and routing logic
4. How to wire up navigation between signup and login screens
