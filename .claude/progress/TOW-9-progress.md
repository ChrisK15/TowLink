# Implementation Progress: TOW-9

**Story**: US-1.3: User Login with Email/Password
**Started**: February 3, 2026
**Status**: In Progress

---

## Lesson Plan Reasoning

TOW-9 has four distinct pieces of work. The order below is chosen so that each step can be verified independently before moving on, and so that nothing depends on code that has not been written yet.

1. **Service function first.** `signInWithEmail()` in `authService.ts` is the only backend-facing code in this story. The login screen imports it, so it must exist before the screen can even compile. This step also introduces the one new Firestore operation in the story -- `getDoc` -- which is worth understanding on its own before it gets buried inside a larger component.

2. **Login screen -- structure and inputs.** Once the service function exists, build the screen: the validation function, the four `useState` declarations, the two `TextInput` fields, and the submit button. This is the largest block of new code. Stop here before wiring up the routing -- the student should be able to see the screen render and type into it before adding the branching logic.

3. **Post-login routing inside `handleLogin`.** This is the conceptually new idea in TOW-9: after login, read the role that `signInWithEmail` returned and decide where to go. It is a small `if/else`, but it is the piece that makes login different from signup. Isolating it as its own step lets the student focus on the decision logic without also worrying about JSX layout.

4. **Navigation links between screens.** The "Log In" link on signup and the "Sign Up" link on login. These are the smallest changes in the story (a single `Pressable` each). They come last because they are pure wiring -- nothing about the login logic depends on them. The student can test the login screen directly by URL before these links exist.

5. **End-to-end walkthrough and manual testing.** No code. A structured checklist that maps one scenario to one acceptance criterion. Run the app and verify.

---

## Learning Objectives

By the end of this story, you will understand:

1. How to read a Firestore document with `getDoc()` (vs. writing with `setDoc()`/`updateDoc()` in TOW-7/TOW-8)
2. How to chain two async operations (Firebase Auth sign-in, then Firestore read) inside a single service function
3. How to use a return value from a service function to make a navigation decision in the screen component
4. Why `router.replace()` is used instead of `router.push()` throughout auth flows
5. How `StyleSheet.create()` compares to inline styles -- and why role-selection.tsx switched to it

---

## Implementation Steps

### Step 1: Add `signInWithEmail()` to authService.ts

**File**: `services/firebase/authService.ts`
**Status**: [x] Done
**Learning Focus**: Reading from Firestore, two-step async flow, error code mapping

**What to do:**

- Add `signInWithEmailAndPassword` to the existing `firebase/auth` import on line 1
- Add `getDoc` to the existing `firebase/firestore` import on line 2
- Write the new exported async function after `updateUserRole()` (after line 55)

**Key concepts to understand before you write:**

- `signUpWithEmail` (lines 5-42) only writes to Firebase. `signInWithEmail` does the opposite for auth (signs in, does not create), but also reads from Firestore. Look at how `signUpWithEmail` uses `userCredential.user` -- you will do the same thing, then take one more step.
- The return type adds `role: string | null` to what `signUpWithEmail` returns. Why `string | null` and not the full TypeScript union? Because Firestore does not enforce TypeScript types at runtime. The screen checks the actual value.
- The error codes for login are different from signup. The spec lists five. Map each one to a user-friendly message using the same `if (error.code === ...)` pattern you see on lines 29-40.

**Checkpoint:** Open `authService.ts`. Confirm it has three exports: `signUpWithEmail`, `updateUserRole`, and `signInWithEmail`. Confirm the imports at the top include `signInWithEmailAndPassword` and `getDoc`. The file should have no TypeScript errors.

---

### Step 2: Create the login screen -- structure and inputs

**File**: `app/(auth)/login.tsx` (new file)
**Status**: [x] Done
**Learning Focus**: Component structure, validation function, controlled inputs, StyleSheet

**What to do:**

- Create the file with four sections: imports, validation function, component with state and handler stub, StyleSheet
- The validation function (`validateLoginForm`) is simpler than signup's -- only two fields, no password length check. The spec explains why: on login you do not know the password until Firebase checks it, so length validation here would leak information.
- Set up the four `useState` variables: `email`, `password`, `error`, `loading`
- Write the JSX: title, two TextInputs, error display, Pressable button. Use `StyleSheet` references (not inline objects) -- this matches `role-selection.tsx` lines 87-147, which is the current style standard in the project.
- Wire the button's `onPress` to `handleLogin`, but leave `handleLogin` as a stub for now (just call validation and set error if it fails; the routing logic comes in Step 3)
- Add the "Don't have an account? Sign Up" link at the bottom using `router.replace('/signup')`

**Where to look for reference:**

- `signup.tsx` lines 6-25: the validation function pattern (yours is shorter)
- `signup.tsx` lines 27-57: the component state and handler pattern
- `role-selection.tsx` lines 87-147: how to write a `StyleSheet.create()` block
- `role-selection.tsx` line 68: the conditional error display pattern (`{error ? <Text>...</Text> : null}`)

**Checkpoint:** Run the app and navigate directly to the login screen (Expo will let you type `/login` in the URL bar, or temporarily change `index.tsx`'s redirect). Confirm you see: a "Welcome Back" title, two input fields, a "Log In" button, and a "Sign Up" link at the bottom. Typing into the fields should update them. Tapping "Log In" with empty fields should show the "All fields are required." error.

---

### Step 3: Wire up post-login routing in `handleLogin`

**File**: `app/(auth)/login.tsx` (inside the `handleLogin` function)
**Status**: [x] Done
**Learning Focus**: Conditional navigation based on async data, try/catch/finally flow

**What to do:**

- Fill in the `try` block of `handleLogin`: call `signInWithEmail(email, password)`, destructure `role` from the result
- Write the routing decision: if `role` is `'commuter'` or `'driver'`, replace to `/(tabs)`; otherwise replace to `/role-selection`
- Make sure `setError('')` runs before the `try` (clears any previous error when the user retries)
- Make sure the `catch` block sets `error` to `error.message`
- Make sure `finally` sets `loading` back to `false`

**Why this is its own step:** This is the new idea in TOW-9. Signup always goes to the same place (role selection). Login goes to one of two places depending on data it fetched. That `if/else` is small, but understanding why it is there -- and what happens when `role` is null -- is the learning goal.

**Checkpoint:** Using an account that already has a role set (from TOW-7/TOW-8 testing), log in. Confirm you land on the tabs screen. Then (if you have one) try an account without a role -- confirm you land on role selection. Try a wrong password -- confirm a clear error message appears.

---

### Step 4: Add navigation links between signup and login

**File**: `app/(auth)/signup.tsx`
**Status**: [x] Done
**Learning Focus**: Bidirectional screen linking, inline styles matching existing file conventions

**What to do:**

- In `signup.tsx`, add a `Pressable` + `Text` after the Sign Up button (after line 134, before the closing `</View>` on line 135)
- Use `router.replace('/login')` -- `router` is already imported on line 2, no new imports needed
- Use inline styles to stay consistent with the rest of signup.tsx (which does not use `StyleSheet.create`)
- The "Sign Up" link on the login screen was already added in Step 2

**Why inline styles here but StyleSheet on login?** signup.tsx was written in TOW-7 before the project settled on `StyleSheet.create()`. The convention going forward is StyleSheet, but it does not make sense to rewrite signup's styles just to add one link. Match what is already there. The login screen is new, so it uses the newer convention.

**Checkpoint:** Start on the signup screen. Confirm the "Already have an account? Log In" link appears at the bottom. Tap it -- confirm you land on the login screen. From login, tap "Don't have an account? Sign Up" -- confirm you land back on signup. Confirm that at no point does the back button take you to a screen you already left (this is the effect of `replace()`).

---

### Step 5: End-to-end testing

**Status**: [x] Done
**Learning Focus**: Manual test coverage, mapping scenarios to acceptance criteria

**Test scenarios to run (each maps to one acceptance criterion):**

- [x] **Happy path -- user with role set**: Log in with an account that has a role. Verify you land on tabs.
- [x] **Edge case -- user without role**: Log in with an account where role is null. Verify you land on role selection.
- [x] **Validation -- empty fields**: Tap "Log In" with nothing entered. Verify "All fields are required." appears. No network request should fire.
- [x] **Validation -- bad email format**: Type something that is not an email. Verify "Please enter a valid email address." appears.
- [x] **Firebase error -- wrong password**: Enter a real email with the wrong password. Verify a clear error message appears.
- [x] **Firebase error -- unknown email**: Enter an email that was never registered. Verify a clear error message appears.
- [x] **Loading state**: Tap "Log In" with valid credentials. Verify the button text changes to "Logging In..." and the button is visually disabled while the request is in flight.
- [x] **Navigation integrity**: Confirm the back button never takes you back to a screen you have already left in the auth flow.

---

## Completed Steps Summary

- [x] Step 1: Add `signInWithEmail()` to authService.ts
- [x] Step 2: Create login screen (structure, inputs, validation, StyleSheet)
- [x] Step 3: Wire post-login routing in `handleLogin`
- [x] Step 4: Add "Log In" link to signup.tsx
- [x] Step 5: End-to-end manual testing

---

## Acceptance Criteria Tracking

Reference from Jira story TOW-9:

- [ ] Login screen is accessible via a link on the signup screen
- [ ] User can enter email and password
- [ ] Successful login authenticates via Firebase `signInWithEmailAndPassword()`
- [ ] On success, the user's role is read from Firestore to decide where to navigate
- [ ] If role is set (commuter or driver), navigate to `/(tabs)`
- [ ] If role is NOT set, redirect to `/role-selection`
- [ ] Invalid credentials show a clear, user-friendly error message
- [ ] Empty fields are validated before attempting login
- [ ] Loading state is shown while authentication is in progress

---

## Notes

- `PATTERNS.md` and `FAQ.md` do not exist yet in `.claude/docs/`. Pattern guidance in this file is drawn directly from the existing source files: `authService.ts`, `signup.tsx`, and `role-selection.tsx`.
- The spec notes that `signup.tsx` uses inline styles while `role-selection.tsx` uses `StyleSheet.create()`. The login screen should follow the newer `StyleSheet.create()` convention. The link added to `signup.tsx` should use inline styles to match its surrounding code.
- `index.tsx` does NOT change. It keeps its hard redirect to signup. Login is reached only via the link on signup.

---

_Progress tracked by: code-coach agent_
_Created: February 3, 2026_
