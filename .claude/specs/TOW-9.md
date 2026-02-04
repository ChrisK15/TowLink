# Technical Specification: TOW-9

## Story Reference

**ID**: TOW-9
**Title**: US-1.3: User Login with Email/Password
**Epic**: TOW-1 (User Authentication & Account Management)
**Priority**: Critical
**Sprint**: TOW Sprint 1 (Week 1-2)
**Branch**: TOW-9-us-1-3-user-login (already checked out)
**Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-9

**User Story**:
As a returning user, I want to log in with my email and password so that I can access the TowLink app without creating a new account.

**Acceptance Criteria**:
- Login screen is accessible via a link on the signup screen
- User can enter email and password
- Successful login authenticates via Firebase `signInWithEmailAndPassword()`
- On success, the user's role is read from Firestore to decide where to navigate
- If role is set (`'commuter'` or `'driver'`), navigate to `/(tabs)`
- If role is NOT set (edge case), redirect to `/role-selection`
- Invalid credentials show a clear, user-friendly error message
- Empty fields are validated before attempting login
- Loading state is shown while authentication is in progress

---

## Architecture Overview

TOW-9 is the login counterpart to TOW-7 (signup). It introduces one new concept that signup did not have: **post-login role-based routing**. After the user authenticates, we must read their Firestore document to determine where they go next. This is a two-step async operation (authenticate, then fetch role), and the spec below treats those as a single logical unit inside the service layer so the screen component stays simple.

### High-Level Flow

```
User taps "Log In" on signup screen
  -> navigates to login screen
    -> enters email + password
    -> client-side validation (empty check, email format)
    -> calls signInWithEmail(email, password) in authService
      -> Firebase Auth signs in the user
      -> reads /users/{uid} from Firestore
      -> returns { userId, email, role }
    -> login screen receives the role value
    -> if role is 'commuter' or 'driver': router.replace('/(tabs)')
    -> if role is null: router.replace('/role-selection')
```

### Key Architectural Decisions

1. **Role fetch lives in the service function, not the screen.** `signInWithEmail()` returns the role alongside userId and email. This keeps the screen component unaware of Firestore details and mirrors how `signUpWithEmail()` already returns `{ userId, email }`. The login screen simply adds `role` to the destructuring.

2. **Use `router.replace()` everywhere in this flow.** TOW-8 established this convention. After login you must not be able to press back and land on the login form again. Both the signup-to-login link and the post-login navigation use `replace()`.

3. **Login screen mirrors signup's structure, not its style.** `signup.tsx` uses inline styles. `role-selection.tsx` uses `StyleSheet.create()`. The project has moved toward `StyleSheet.create()` as the standard. The login screen should use `StyleSheet.create()` to match the newer convention.

4. **Navigation between signup and login is bidirectional.** Signup needs a "Log In" link at the bottom. Login needs an "Already have an account? Sign Up" link. Both use `router.replace()` so there is no growing navigation stack.

5. **index.tsx stays as a simple redirect to signup.** Signup is the default entry point for new users. Returning users reach login via the link on signup. This keeps the auth entry point unchanged and avoids adding a "choose signup or login" splash screen (that is a future polish story).

---

## Technical Requirements

### Files to Create

- `app/(auth)/login.tsx` -- the login screen (new file)

### Files to Modify

- `services/firebase/authService.ts` -- add `signInWithEmail()` function
- `app/(auth)/signup.tsx` -- add "Already have an account? Log In" link at the bottom

### Files That Do NOT Change

- `app/(auth)/index.tsx` -- keeps its hard redirect to signup; no change needed
- `app/(auth)/_layout.tsx` -- already renders a headerless `<Stack>`; login.tsx is automatically included as a screen in this stack
- `app/_layout.tsx` -- no change; root layout already has `(auth)` and `(tabs)` groups
- `types/models.ts` -- `User` interface already has `role: 'commuter' | 'driver' | 'both' | null`; no change needed

### State Management (login.tsx)

The login screen needs exactly four pieces of local state, all managed with `useState`:

| State variable | Type | Initial value | Purpose |
|---|---|---|---|
| `email` | `string` | `''` | Controlled input for email field |
| `password` | `string` | `''` | Controlled input for password field |
| `error` | `string` | `''` | Validation or Firebase error message; empty string means no error |
| `loading` | `boolean` | `false` | Disables the button and changes button text while the sign-in call is in flight |

No `confirmPassword` state. Login does not confirm the password.

### Backend (Firebase)

No new Cloud Functions. No Firestore schema changes. The login flow performs two read operations against existing infrastructure:

1. `signInWithEmailAndPassword(auth, email, password)` -- Firebase Auth SDK call
2. `getDoc(doc(db, 'users', uid))` -- reads the existing user document to get the `role` field

Both of these are called inside `signInWithEmail()` in authService.ts. The Firestore document structure is unchanged from TOW-7/TOW-8:

```javascript
/users/{userId}
{
  id: string,                          // Firebase Auth UID
  email: string,                       // User's email
  createdAt: Timestamp,                // When account was created
  role: 'commuter' | 'driver' | null   // Set by TOW-8; null if role selection was never completed
}
```

---

## Implementation Steps

### Step 1: Add `signInWithEmail()` to authService.ts

**File**: `services/firebase/authService.ts`

**What to do**: Add a new exported async function. This is the only function in the file that reads from Firestore (the others only write). You need to add two new imports at the top of the file: `signInWithEmailAndPassword` from `firebase/auth`, and `getDoc` from `firebase/firestore`.

**Current imports in authService.ts (lines 1-3):**
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
```

**Updated imports -- what changes and why:**
- `firebase/auth`: add `signInWithEmailAndPassword` to the existing import
- `firebase/firestore`: add `getDoc` to the existing import. `doc` is already imported (used by `updateUserRole`), so you only add `getDoc`.

**The new function -- signature and logic:**
```typescript
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ userId: string; email: string; role: string | null }> {
```

The return type extends `signUpWithEmail`'s return type by one field: `role`. It is `string | null` rather than the full union type because we are reading it from Firestore at runtime -- Firestore does not enforce TypeScript types. The screen component will check the value at runtime.

**Inside the function -- the two-step flow:**
```typescript
  try {
    // Step A: authenticate
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Step B: read role from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    const role = userData?.role ?? null;

    return {
      userId: user.uid,
      email: user.email ?? email,
      role: role,
    };
  } catch (error: any) {
    // error handling below
  }
```

Why `userData?.role ?? null`? If the document does not exist (should not happen, but defensive), or if the `role` field is missing, we default to `null`. The screen interprets `null` as "send this user to role selection."

**Error handling -- follow the exact pattern from `signUpWithEmail` (lines 27-41):**

The Firebase Auth error codes for login are different from signup. Map these specific codes:

| Firebase error code | User-friendly message |
|---|---|
| `auth/invalid-email` | `'Invalid email format.'` |
| `auth/invalid-credential` | `'Invalid email or password. Please check and try again.'` |
| `auth/user-not-found` | `'No account found with this email. Please sign up first.'` |
| `auth/wrong-password` | `'Incorrect password. Please try again.'` |
| (any other error) | `'Login failed. Please try again.'` |

Note: `auth/invalid-credential` is the code Firebase returns in newer SDK versions when credentials are wrong in general. Include both `user-not-found` and `wrong-password` as well because some SDK versions still return them separately. The fallback at the bottom catches anything unexpected -- this is the same pattern as line 40 in the current file (`throw new Error('Failed to create account...')`).

**The complete function (after error codes):**
```typescript
    console.error('Login error:', error);
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email format.');
    }
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password. Please check and try again.');
    }
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email. Please sign up first.');
    }
    if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    }
    throw new Error('Login failed. Please try again.');
```

**Reasoning**: Every error path throws a plain `Error` with a user-friendly message. The screen component catches these and puts `error.message` into its `error` state -- exactly the same contract as `signUpWithEmail`.

---

### Step 2: Create the login screen -- `app/(auth)/login.tsx`

**File**: `app/(auth)/login.tsx` (new file)

**What to do**: Create the screen component. This file has four sections: imports, a validation function, the component itself, and a `StyleSheet`. Each section is described below.

**Imports -- what you need and where each comes from:**
```typescript
import { signInWithEmail } from '@/services/firebase/authService';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
```

These mirror `signup.tsx` line 1-4 almost exactly. The only differences:
- `signInWithEmail` instead of `signUpWithEmail`
- `StyleSheet` is added to the react-native import (signup does not use it; login will)

**Validation function -- simpler than signup's:**

Signup's `validateSignupForm` (signup.tsx lines 6-25) checks three fields and password matching. Login only has two fields and no confirmation. The validation function should be a standalone function outside the component (same placement as signup):

```typescript
function validateLoginForm(email: string, password: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !password) {
    return 'All fields are required.';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address.';
  }
  return null;
}
```

Why no password length check? On login we do not know if the password is correct until Firebase tells us. Checking length >= 8 here would leak information about password requirements to someone trying to brute-force. Just let Firebase validate it. The empty-string check (`!password`) is sufficient to prevent submitting a blank field.

**Component -- state and handler:**

```typescript
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const validationError = validateLoginForm(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { role } = await signInWithEmail(email, password);

      if (role === 'commuter' || role === 'driver') {
        router.replace('/(tabs)');
      } else {
        router.replace('/role-selection');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
```

The routing decision (`if/else` on role) is the key new logic in this story. If the role is any recognized value, go to tabs. If it is `null`, `undefined`, or anything else (the `else` branch), send the user to role selection. This handles the edge case from the acceptance criteria: "account created but role selection was skipped or failed."

Note `setError('')` before the try block. This clears any previous error message when the user tries again -- the same pattern used in `role-selection.tsx` line 48 (`setError('')` inside `onPress`).

**Component -- JSX (the rendered UI):**

The structure follows signup.tsx's layout (title, email input, password input, error text, submit button) but uses `StyleSheet` references instead of inline style objects. Add a "Already have an account? Sign Up" link at the very bottom, after the login button:

```tsx
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        secureTextEntry={true}
        style={styles.input}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging In...' : 'Log In'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/signup')} style={styles.linkContainer}>
        <Text style={styles.linkText}>
          Don't have an account? Sign Up
        </Text>
      </Pressable>
    </View>
  );
}
```

Props on the TextInputs are copied directly from signup.tsx. `secureTextEntry={true}` on the password field hides the input. `keyboardType="email-address"` on the email field brings up the email keyboard on mobile. `autoCapitalize="none"` prevents the first letter from being capitalized (would break email matching).

The error display (`{error ? ... : null}`) is the exact same conditional pattern used in signup.tsx line 116-120 and role-selection.tsx line 68.

The "Sign Up" link at the bottom uses `router.replace('/signup')`. This keeps the navigation stack flat -- pressing back from login does not accumulate screens.

**StyleSheet -- at the bottom of the file:**

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#0a7ea4',
    fontSize: 16,
  },
});
```

The button color `#0a7ea4` matches the color used in `signup.tsx` line 125. The input styling is slightly more refined than signup's inline styles (added `borderColor`, `fontSize`, `borderRadius: 8` instead of 5) but the values are close enough to feel consistent. If you want pixel-perfect consistency with signup, you can copy signup's exact inline style values into the `input` StyleSheet entry -- but `StyleSheet.create` is the better practice regardless.

---

### Step 3: Add the "Log In" link to signup.tsx

**File**: `app/(auth)/signup.tsx`

**What to do**: Add a single `Pressable` + `Text` element after the Sign Up button (after the closing `</Pressable>` on line 134, before the closing `</View>` on line 135). This is the only change to signup.tsx.

```tsx
      <Pressable onPress={() => router.replace('/login')} style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={{ color: '#0a7ea4', fontSize: 16 }}>
          Already have an account? Log In
        </Text>
      </Pressable>
```

This uses inline styles to stay consistent with the rest of signup.tsx (which does not use `StyleSheet.create`). The color `#0a7ea4` matches the existing button color on line 125 of the same file, so the link feels visually connected to the brand.

`router` is already imported and available in signup.tsx (line 2: `import { router } from 'expo-router'`). No new imports are needed.

`router.replace('/login')` navigates to `app/(auth)/login.tsx`. Expo Router resolves `/login` within the current route group `(auth)` because signup.tsx is already inside `(auth)`. This is the same resolution pattern used in signup.tsx line 51: `router.replace('/role-selection')`.

---

### Step 4: Verify the routing works end-to-end

This is not a code step. It is a mental walkthrough to verify the wiring before you start a device:

1. App launches. Root layout anchor is `(auth)`. `app/(auth)/index.tsx` renders. It does `<Redirect href="/(auth)/signup" />`. User sees signup screen.

2. User taps "Already have an account? Log In". `router.replace('/login')` fires. Expo Router renders `app/(auth)/login.tsx`. The signup screen is gone from the stack (replace, not push).

3. User enters email and password, taps "Log In". `handleLogin` runs validation, then calls `signInWithEmail(email, password)`.

4. `signInWithEmail` calls Firebase Auth, then reads Firestore. Returns `{ userId, email, role }`.

5. Back in `handleLogin`: if `role` is `'commuter'` or `'driver'`, `router.replace('/(tabs)')` fires. The user lands in the main app. If `role` is `null`, `router.replace('/role-selection')` fires. The user is sent to complete role selection (the same screen from TOW-8).

6. From the login screen, user can also tap "Don't have an account? Sign Up" to go back to signup via `router.replace('/signup')`.

Every navigation in this flow uses `replace()`. At no point can the user press back and land on a screen they have already left.

---

### Step 5: Test manually

Start the app with `npx expo start`. Run through these scenarios:

**Happy path -- returning user with role set:**
1. Go to signup screen
2. Tap "Already have an account? Log In"
3. Enter the email and password of an account that already exists in Firebase (created during TOW-7/TOW-8 testing) and that has a role set
4. Tap "Log In"
5. Verify: you land on the tabs screen (`/(tabs)`)
6. Open Firebase Console and confirm no new documents were created (login is read-only)

**Happy path -- returning user without role (edge case):**
1. In Firebase Console, find a user document and manually set `role` to `null` (or create one via signup and skip role selection by closing the app)
2. Log in with that account
3. Verify: you land on the role selection screen

**Validation -- empty fields:**
1. Tap "Log In" with both fields empty
2. Verify: error message "All fields are required." appears, no Firebase call is made

**Validation -- bad email format:**
1. Type `notanemail` in the email field, anything in password
2. Tap "Log In"
3. Verify: error message "Please enter a valid email address." appears

**Firebase error -- wrong password:**
1. Enter a valid email (existing account) but the wrong password
2. Tap "Log In"
3. Verify: error message about incorrect password or invalid credentials appears

**Firebase error -- nonexistent email:**
1. Enter an email that has never been registered
2. Tap "Log In"
3. Verify: error message about no account found appears

**Navigation -- back to signup:**
1. On the login screen, tap "Don't have an account? Sign Up"
2. Verify: you are on the signup screen
3. Verify: tapping the device back button does NOT take you back to login (because replace was used)

**Loading state:**
1. Slow down your network (e.g., on a real device, switch to a weak signal)
2. Tap "Log In" with valid credentials
3. Verify: button text changes to "Logging In..." and button appears disabled while the request is in flight

---

## Edge Cases

1. **User document exists in Auth but not in Firestore.** This should not happen in normal flow (signup creates both atomically), but if someone deletes the Firestore doc manually, `getDoc` returns a snapshot where `exists()` is false and `data()` returns `undefined`. The expression `userData?.role ?? null` evaluates to `null`, so the user is routed to role selection. Role selection will then attempt `updateDoc` on a nonexistent document, which will fail -- but that is role-selection's problem, not login's. Login handles this gracefully by not crashing.

2. **User taps "Log In" repeatedly before the first call resolves.** The `loading` state disables the button after the first tap. Subsequent taps are ignored. The `finally` block re-enables the button only after the call completes (success or failure).

3. **Network drops between Auth sign-in and Firestore read.** Firebase Auth succeeds (user is now signed in locally), but `getDoc` throws. The catch block catches the error, shows it to the user, and sets `loading` to false. The user is signed in at the Firebase level but has not navigated anywhere. On their next attempt, `signInWithEmailAndPassword` will succeed immediately (user is already signed in) and `getDoc` will be retried. This is acceptable behavior.

4. **The `role` field in Firestore contains an unexpected value** (not `'commuter'`, `'driver'`, or `null`). The `if (role === 'commuter' || role === 'driver')` check in `handleLogin` will fall to the `else` branch, sending the user to role selection. This is a safe default: the user gets to pick a valid role.

5. **Email field has leading/trailing whitespace.** Firebase Auth trims email addresses internally, so `" user@example.com "` will match `"user@example.com"`. The email regex in `validateLoginForm` will also pass for strings with internal content regardless of surrounding whitespace. No explicit trim is needed, but if you want to be explicit, you can call `.trim()` on the email value before passing it to `signInWithEmail`.

---

## Testing Strategy

- **Unit-level**: The `validateLoginForm` function is a pure function. You can mentally verify it handles empty strings, invalid formats, and valid emails without running anything.
- **Integration-level**: The manual test scenarios in Step 5 cover every acceptance criterion. Each one maps to a specific AC item.
- **Error path coverage**: Test at least two Firebase error codes (wrong password and nonexistent email) to verify the error translation in `signInWithEmail` works. The others (invalid-email, invalid-credential) are harder to trigger manually but follow the same code pattern.
- **Navigation integrity**: After every navigation in the flow, verify that the back button does not take you to a screen you have already left. This is the purpose of `replace()` and it is worth confirming on a real device because Expo Router's behavior can differ between web preview and native.

---

## Dependencies

- **TOW-7** (signup) -- COMPLETED. Provides `signUpWithEmail()` pattern, the Firestore user document, and the signup screen that needs the "Log In" link.
- **TOW-8** (role selection) -- COMPLETED. Provides the `role` field in Firestore and the `/role-selection` screen that login falls back to when role is null.
- **No new packages required.** `signInWithEmailAndPassword` and `getDoc` are both part of the Firebase SDK already installed. `doc` is already imported in authService.ts.

---

## Quick Reference: What Goes Where

| Piece of TOW-9 | File | Action |
|---|---|---|
| `signInWithEmail()` function | `services/firebase/authService.ts` | Add function + update imports |
| Login screen | `app/(auth)/login.tsx` | Create new file |
| "Log In" link on signup | `app/(auth)/signup.tsx` | Add Pressable after the Sign Up button |
| Post-login routing | `app/(auth)/login.tsx` (inside `handleLogin`) | `if/else` on the `role` value returned by `signInWithEmail` |
| "Sign Up" link on login | `app/(auth)/login.tsx` (inside JSX) | Pressable at the bottom of the screen |

---

_This specification was created by the `technical-architect` agent._
_Ready for `code-coach` agent to guide implementation._
_Created: 2026-02-03_
