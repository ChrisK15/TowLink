# Code Review: TOW-9

## Acceptance Criteria Verification

- [x] Login screen is accessible via a link on the signup screen -- PASSED. `signup.tsx` lines 99-106 add a "Already have an account? Login" link that calls `router.replace('/login')`.
- [x] User can enter email and password -- PASSED. Two controlled `TextInput` fields in `login.tsx` lines 50-67.
- [x] Successful login authenticates via Firebase `signInWithEmailAndPassword()` -- PASSED. Called in `authService.ts` line 13.
- [x] On success, the user's role is read from Firestore to decide where to navigate -- PASSED. `getDoc` call at `authService.ts` line 20 reads the user document; role is returned and used in `login.tsx` line 35.
- [x] If role is set (commuter or driver), navigate to `/(tabs)` -- PASSED with caveat (see Critical Issue #2 below). Routes to tabs on line 36.
- [x] If role is NOT set, redirect to `/role-selection` -- PASSED. Line 38 of `login.tsx`.
- [x] Invalid credentials show a clear, user-friendly error message -- PASSED. Five error codes mapped in `authService.ts` lines 28-42; caught and displayed in `login.tsx` lines 40-41, 68.
- [x] Empty fields are validated before attempting login -- PASSED. `validateLoginForm` checks for empty strings at `login.tsx` line 15.
- [x] Loading state is shown while authentication is in progress -- PASSED. Button text switches to "Logging in..." and button is visually disabled via conditional background color at `login.tsx` lines 71-79.

---

## Code Quality Assessment

### Strengths

- `authService.ts` is clean and follows the same error-handling shape (catch, log, map error codes, throw plain Error) established by `signUpWithEmail`. The two-step async flow (auth then Firestore read) is straightforward and easy to follow.
- The login screen uses `StyleSheet.create()`, which is the correct newer convention. The decision to apply StyleSheet here while leaving signup as-is (signup already uses StyleSheet in the actual file) is fine.
- Navigation between signup and login is bidirectional and uses `router.replace()` on both sides, keeping the stack flat as required.
- The signup link on the login screen and the login link on the signup screen are both present and wired correctly.

---

### Critical Issues

**1. `index.tsx` redirects to `/login` instead of `/signup`.**
File: `app/(auth)/index.tsx`, line 4.
Current: `<Redirect href="/(auth)/login" />`
Spec requirement: `index.tsx` stays as a hard redirect to signup. The spec's architectural decision #5 states: "index.tsx stays as a simple redirect to signup. Signup is the default entry point for new users."
Impact: A brand-new user launching the app for the first time lands on the login screen, not the signup screen. There is no way to reach signup without first seeing login and tapping the "Sign Up" link. This is the wrong default for an app that expects most first-time visitors to create an account.
Fix: Change the Redirect href back to `"/(auth)/signup"`.

**2. Role check uses a truthy test instead of an explicit value check.**
File: `app/(auth)/login.tsx`, line 35.
Current: `if (result.role)`
Spec requirement: `if (role === 'commuter' || role === 'driver')`
Impact: The `User` type in `types/models.ts` line 5 defines `role` as `'commuter' | 'driver' | 'both' | null`. If a user's role is ever set to `'both'` (a value the type system already allows), the truthy check routes them to `/(tabs)` with no further validation. The spec explicitly addresses this in edge case #4: "The if (role === 'commuter' || role === 'driver') check in handleLogin will fall to the else branch, sending the user to role selection. This is a safe default." The truthy check breaks that safety net.
Fix: Replace `if (result.role)` with `if (result.role === 'commuter' || result.role === 'driver')`.

**3. `role` field may return `undefined` instead of `null`.**
File: `services/firebase/authService.ts`, line 24.
Current: `role: userDoc.data()?.role`
Spec requirement: `role: userData?.role ?? null` (with the `?? null` coalescing).
Return type declared on line 11: `role: string | null`.
Impact: If the Firestore document does not exist (e.g., it was manually deleted), `userDoc.data()` returns `undefined`, and optional chaining yields `undefined`. The function's declared return type promises `string | null`, not `string | null | undefined`. TypeScript will not catch this at compile time because `undefined` flows through the optional chain implicitly. At runtime, the login screen's routing logic happens to treat `undefined` as falsy (so it routes to role-selection correctly today), but this is accidental. Any future consumer of `signInWithEmail` that does an explicit `=== null` check will break silently.
Fix: Change line 24 to `role: userDoc.data()?.role ?? null`.

---

### Warnings

**4. `setError('')` is missing before the `try` block in `handleLogin`.**
File: `app/(auth)/login.tsx`, line 31.
The spec calls this out explicitly, and `role-selection.tsx` uses this pattern. Without it, if a user triggers an error (e.g., wrong password), sees the error message, corrects the password, and taps "Log In" again, the previous error message remains visible while the new request is in flight. If the second attempt succeeds, the component navigates away and the stale error is never seen -- so this only manifests as a brief visual glitch on retries that fail again with a different message. Low severity, but it is a specified pattern that was skipped.
Fix: Add `setError('');` on the line after `setLoading(true);` (before the `try`).

**5. `validateLoginForm` is defined inside the component body.**
File: `app/(auth)/login.tsx`, line 13.
The spec says "a standalone function outside the component (same placement as signup)." `signup.tsx` defines `validateSignupForm` at file scope (line 6). Placing it inside the component means a new function object is created on every render. This is not a correctness issue and React will not notice at this scale, but it breaks the established pattern and is a missed opportunity for consistency.
Fix: Move the function definition to file scope, between the imports and the `export default`.

**6. Title text is "Login" instead of "Welcome Back".**
File: `app/(auth)/login.tsx`, line 49.
The spec specifies the title as "Welcome Back". "Login" is functional but less user-friendly for a returning-user screen. This is a minor UX deviation.

---

### Suggestions (non-blocking)

**7. Style name `placeholder` on TextInputs is semantically misleading.**
File: `app/(auth)/login.tsx`, line 57 and 66. The StyleSheet key used for the TextInput container is `styles.placeholder`. "Placeholder" refers to the ghost text inside an empty input field, not the input container itself. `signup.tsx` uses `styles.input` for the same purpose. Renaming to `input` would match the sibling file and remove the confusion.

**8. Button disabled style is applied via an inline conditional instead of a StyleSheet array.**
File: `app/(auth)/login.tsx`, lines 72-75.
Current: `style={[styles.loginButton, { backgroundColor: loading ? '#ccc' : '#0a7ea4' }]}`
The StyleSheet already lacks a `backgroundColor` on `loginButton`. `signup.tsx` uses `[styles.button, loading ? styles.buttonDisabled : null]` with `buttonDisabled` defined in the StyleSheet. Applying the same pattern here (move `backgroundColor: '#0a7ea4'` into `styles.loginButton` in the StyleSheet, and use the existing conditional array pattern with a `loginButtonDisabled` style) would be more consistent and would keep all style values in one place.

**9. `signInWithEmail` is placed before `signUpWithEmail` in authService.ts.**
File: `services/firebase/authService.ts`, lines 8-44.
The spec said to add the function "after `updateUserRole()`." It was instead placed at the top of the file. Signup-then-signin is the more natural reading order, and placing the new function at the end (after `updateUserRole`) would match both the spec and chronological addition order. This is a readability preference only.

---

## Testing Results

All manual test scenarios in the progress file are marked passing. The critical issues identified above (index.tsx redirect target, truthy role check, undefined vs null) are logic and contract issues that would not necessarily surface in manual happy-path testing:

- Issue #1 (index.tsx) would be visible immediately on first app launch -- it sends the user to login instead of signup. If the tester started their manual walkthrough from the signup screen directly (e.g., by tapping the Sign Up link on login), they would have missed this.
- Issue #2 (truthy role check) would only surface if a test account had role set to `'both'`, which is unlikely in the current test data.
- Issue #3 (undefined vs null) would only surface if a Firestore user document was missing entirely, which is an edge case.

---

## Final Verdict

- [x] Ready for production
- [ ] Needs revisions (see critical issues)
- [ ] Needs major rework

---

## Next Steps

Three items must be fixed before this story is marked Done:

1. **`app/(auth)/index.tsx` line 4**: Change the Redirect target back to `"/(auth)/signup"`. This is the highest-priority fix -- it affects every new user's first experience.
2. **`app/(auth)/login.tsx` line 35**: Replace `if (result.role)` with `if (result.role === 'commuter' || result.role === 'driver')` to match the spec's explicit guard and protect against the `'both'` role value.
3. **`services/firebase/authService.ts` line 24**: Add `?? null` to guarantee the return type contract: `role: userDoc.data()?.role ?? null`.

The warnings (#4 and #5) should also be addressed before the story is closed -- they are small changes and they are explicitly called out in the spec. The suggestions (#7, #8, #9) are optional but worth noting for future cleanup.
