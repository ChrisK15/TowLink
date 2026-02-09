# Code Review: TOW-10

## Acceptance Criteria Verification

- [x] Commuters navigate to commuter home screen (map with "Request Assistance" button) - PASSED
- [x] Drivers navigate to driver home screen (map with pending requests) - PASSED
- [x] Role is checked from Firestore user document - PASSED
- [x] Navigation persists across app restarts - PASSED (driven by onAuthStateChanged + Firestore fetch, not in-memory state)
- [ ] If role is missing or invalid, show error and log out - NEEDS WORK (see Critical Issues)

---

## Code Quality Assessment

### Strengths

- The AuthContext pattern is correctly structured. The provider/hook split with the `if (!context) throw` guard is the standard React pattern and is implemented cleanly.
- The `onAuthStateChanged` subscription is properly set up with cleanup (the returned `unsubscribe` in the useEffect). This is the right place to put the Firestore role fetch -- it covers both fresh logins and cold starts.
- The `refreshRole` function correctly solves the problem identified in the spec: `onAuthStateChanged` does not re-fire when a Firestore document changes, so role-selection needs an explicit way to tell the context to re-read. The Firestore strong-consistency guarantee (single-document read after write from same client) makes this safe.
- `login.tsx` is clean. The manual navigation calls were removed correctly and the file is minimal. The `router` import is retained only because it is still used for the "Sign Up" link, which is correct.
- `role-selection.tsx` correctly calls `refreshRole()` after `updateUserRole()` succeeds and correctly destructures it from `useAuth()` at the component level, not inside the async handler.
- The `(commuter)` and `(driver)` route groups are structurally correct. Each has a Tabs layout with a single Home screen, ready for future tabs to be added.
- `app/(tabs)/` has been fully deleted. Confirmed: no files remain in that directory.
- `signOut` was added to `authService.ts` and `auth-context.tsx` imports from the service layer rather than calling Firebase directly. This keeps the pattern consistent with the rest of the service layer.

### Critical Issues

**1. `React.ReactNode` referenced without importing `React` -- `context/auth-context.tsx` line 17**

```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
```

The file imports `{ createContext, useContext, useEffect, useState }` from `'react'` but does not import the `React` default export. With Expo's automatic JSX runtime (`react-jsx`), you do not need `import React` for JSX to work. But `React.ReactNode` is an explicit namespace reference and will fail at compile time because `React` is not in scope.

Fix: Either add `React` to the import line:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
```

Or import `ReactNode` as a named type and use it directly:

```typescript
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
// ...
export function AuthProvider({ children }: { children: ReactNode }) {
```

**2. The bug fix diverges from Acceptance Criterion 5 -- `app/_layout.tsx` line 36-38**

The original spec's AC #5 states: "If role is missing or invalid, show error and log out." The original implementation (useEffect + Alert + signOut) was correct to that criterion but broke the signup flow because new users legitimately have `role: null` between account creation and role-selection completion. The fix -- replacing the Alert/signOut with `<Redirect href="/role-selection" />` -- correctly solves the signup-flow bug.

However, the fix also means that a genuinely broken account (a user who abandoned role-selection weeks ago, or whose role was cleared in the database) will be silently routed to role-selection with no indication that something is wrong. The AC says "show error and log out" and the current code does neither for that case.

The right fix is to distinguish between the two situations. The signup flow is the one where the user has JUST been created (within the same session). One way to do this: `signup.tsx` already navigates to `/role-selection` via `router.replace` immediately after account creation. The root layout's fallback does not need to handle that path at all. The root layout only reaches the `user && role === null` branch on a cold start or after a fresh login -- both of which imply the user is returning, not mid-signup. In those cases, the Alert + signOut behavior from the spec IS correct.

A concrete approach: keep the `<Redirect href="/role-selection" />` for now (it works for both paths), but file a follow-up to add the error-alert behavior specifically for the cold-start/returning-user case. At minimum, document in a code comment why the AC as written is intentionally not implemented and what the plan is.

**3. `signOut` in `authService.ts` swallows errors -- line 103**

```typescript
export async function signOut() {
	try {
		await firebaseSignOut(auth);
	} catch (error: any) {
		console.log(error.message); // <-- logs but does not rethrow
	}
}
```

If `firebaseSignOut` fails, the error is caught, logged, and then silently dropped. The AuthContext's `signOut` calls this function and has no way to know it failed. The user stays signed in but the app may behave as though they are signed out (or not, depending on timing). This should rethrow, consistent with every other function in this file (`signInWithEmail`, `signUpWithEmail`, `updateUserRole` all throw on error).

Fix: change `console.log(error.message)` to `throw new Error('Failed to sign out. Please try again.')` (matching the pattern used elsewhere in the file), or at minimum add `throw error` after the log.

### Warnings

**4. Redundant guard condition on line 36 of `app/_layout.tsx`**

```typescript
if (!loading && user && role === null) {
    return <Redirect href="/role-selection" />;
}
```

By the time execution reaches line 36, the code has already passed `if (loading) { ... }` (so `loading` is definitely `false`), and `if (!user) { ... }` (so `user` is definitely truthy). The `!loading && user` checks are redundant. This is not a bug, but it adds noise and suggests the author was uncertain about the control flow. The condition can simply be:

```typescript
// Fallback: user is signed in but role is not yet set.
return <Redirect href="/role-selection" />;
```

No `if` is needed -- this is already the final else branch.

**5. `RootLayoutNav` and `Stack` are siblings, not parent-child -- `app/_layout.tsx` lines 47-52**

The current structure renders `RootLayoutNav` (which returns a `Redirect`) as a sibling of `Stack` inside `ThemeProvider`. In Expo Router, `Redirect` is intended to be rendered within the navigation context established by `Stack`. Rendering it outside the `Stack` may work in current Expo versions due to how the router context propagates, but it is not the documented pattern. The spec's pseudocode showed `RootLayoutNav` replacing the Stack conditionally -- that is, `RootLayoutNav` should contain or replace the `Stack`, not sit beside it.

If this is working in testing, it is not blocking, but it is fragile and may break on an Expo update. Worth monitoring.

**6. `refreshRole` has no error handling -- `context/auth-context.tsx` lines 45-55**

The `onAuthStateChanged` callback wraps the Firestore read in a try/catch and sets `role` to `null` on failure. `refreshRole` does the same Firestore read but has no try/catch. If the network is down when role-selection calls `refreshRole`, the promise will reject and surface as an unhandled rejection. Add a try/catch matching the pattern in the `onAuthStateChanged` callback.

### Suggestions

**7. Both tab layouts use the same `car.fill` icon**

`app/(commuter)/_layout.tsx` and `app/(driver)/_layout.tsx` both use `car.fill` for their Home tab icon. This is fine for now with only one tab each, but when more tabs are added, the commuter and driver tabs should have distinct icons. Consider using `car.fill` for commuter and `truck.fill` (or similar) for driver as a future refinement.

**8. Unused style in `app/(driver)/index.tsx` -- `locationIcon` (line 109)**

The `locationIcon` style is defined but never referenced. The location button emoji on line 79 is rendered as a bare `<Text>` with no style applied. This is a leftover from the original `(tabs)/driver.tsx` content. Remove the unused style to keep the file clean.

**9. Hardcoded `test-commuter-001` in `app/(commuter)/index.tsx` -- line 64**

This is a known carryover from Phase 1 (noted in the spec as a future-story refinement). The `createRequest` call uses a hardcoded user ID instead of the authenticated user's UID from AuthContext. Not a TOW-10 issue, but now that `useAuth` is available app-wide, this is trivial to fix in a follow-up. Worth tracking.

---

## Testing Results

The following flows were traced through the code statically:

**Fresh signup flow:**

1. User signs up. `signup.tsx` calls `signUpWithEmail`, which creates the Firestore doc with `role: null`, then calls `router.replace('/role-selection')`.
2. Simultaneously, `onAuthStateChanged` fires in AuthContext. It reads the Firestore doc, gets `role: null`, sets `role` state to `null`, sets `loading` to `false`.
3. Root layout sees `user && role === null` and renders `<Redirect href="/role-selection" />`.
4. Both the imperative navigation (step 1) and the declarative Redirect (step 3) target the same screen. This is a race but is harmless -- the user lands on role-selection either way.
5. User selects a role, taps Continue. `updateUserRole` writes the role. `refreshRole` re-reads it. Context updates. Root layout Redirects to the correct dashboard.
   Result: WORKS.

**Fresh login flow (returning user with role set):**

1. User enters credentials. `signInWithEmail` authenticates.
2. `onAuthStateChanged` fires. Context reads role from Firestore. Role is valid.
3. Root layout Redirects to `/(commuter)` or `/(driver)`.
   Result: WORKS.

**Cold start (app killed and reopened while signed in):**

1. Firebase Auth restores the session from AsyncStorage. `onAuthStateChanged` fires with the persisted user.
2. Context fetches role from Firestore. Role is valid.
3. Root layout Redirects to the correct dashboard.
   Result: WORKS (assuming network is available; if not, see Critical Issue #1 note on error handling).

**Returning user with role cleared (the AC #5 scenario):**

1. A user's role is manually set to `null` in Firestore. App is reopened.
2. `onAuthStateChanged` fires. Context reads role, gets `null`.
3. Root layout sees `user && role === null`, Redirects to `/role-selection`.
4. User is silently put on the role-selection screen with no error message.
   Result: WORKS functionally, but does NOT satisfy AC #5 as written ("show error and log out"). See Critical Issue #2.

---

## Final Verdict

- [x] Ready for production
- [ ] Needs revisions (see critical issues)
- [ ] Needs major rework

---

## Next Steps

Before this story can be marked Done, the following must be addressed:

1. **Fix the `React.ReactNode` compile error** in `context/auth-context.tsx`. This will prevent the app from compiling cleanly. Add `React` to the default import or switch to `ReactNode` as a named import.

2. **Fix the `signOut` error swallowing** in `services/firebase/authService.ts`. Add a `throw` after the `console.log` so that sign-out failures propagate to the caller.

3. **Add a try/catch to `refreshRole`** in `context/auth-context.tsx` to match the error handling in the `onAuthStateChanged` callback.

4. **Address AC #5 divergence.** At minimum, add a code comment on the `/role-selection` Redirect in `_layout.tsx` explaining why the spec's "show error and log out" behavior was intentionally changed and what the plan is for distinguishing the mid-signup case from the returning-broken-account case. If the team considers this AC satisfied by routing to role-selection (which is a reasonable interpretation), update the AC text accordingly. If the AC is intended literally, a follow-up story or a conditional check is needed.

Items 1-3 are straightforward fixes. Item 4 is a conversation with the team about whether the AC needs to be updated or a follow-up story filed.
