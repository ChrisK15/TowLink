# Technical Specification: TOW-10

## Story Reference

**ID**: TOW-10
**Title**: US-1.4: Role-Based Navigation Routing
**Epic**: TOW-1 (User Authentication & Account Management)
**Priority**: Medium (marked CRITICAL in description; 5 story points)
**Sprint**: TOW Sprint 1 (Week 1-2)
**Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-10

**User Story**:
As a logged-in user, I want to be automatically directed to the correct dashboard based on my role so that I see features relevant to me.

**Acceptance Criteria**:
- Commuters navigate to commuter home screen (map with "Request Assistance" button)
- Drivers navigate to driver home screen (map with pending requests)
- Role is checked from Firestore user document
- Navigation persists across app restarts
- If role is missing or invalid, show error and log out

---

## Architecture Overview

TOW-10 is the story that transforms the app from a single shared-tab layout into a properly routed dual-mode app. Before this story, login and signup both dump the user into `/(tabs)` which shows all screens regardless of role. After this story, the root layout reads the authenticated user's role and branches to either `/(commuter)` or `/(driver)`. This branching survives app restarts because it is driven by Firebase Auth state restoration plus a Firestore read, not by an in-memory variable set at login time.

### High-Level Flow

```
App launches
  -> RootLayout renders
    -> useEffect subscribes to Firebase Auth via onAuthStateChanged
    -> Case A: No user signed in
         -> render (auth) route group (signup/login screens)
    -> Case B: User IS signed in (cold start restoration or fresh login)
         -> fetch role from Firestore: GET /users/{uid}.role
         -> Case B1: role is 'commuter'
              -> render (commuter) route group
         -> Case B2: role is 'driver'
              -> render (driver) route group
         -> Case B3: role is null, undefined, or unrecognized
              -> show error, sign out, fall back to (auth)
    -> Case C: Still loading (waiting for Auth state or Firestore fetch)
         -> render a loading screen (spinner)
```

### Key Architectural Decisions

1. **AuthContext is the single source of truth.** A React Context provider wraps the entire app. It holds `{ user, role, loading }` and exposes a `signOut` function. Every screen that needs to know who is logged in or what role they have imports from this context instead of calling Firebase directly. This is the standard pattern for auth state in React Native apps.

2. **The role fetch lives in the context, not in login.tsx.** Currently `login.tsx` calls `signInWithEmail()` which returns a role, and login uses that to navigate. That works for the fresh-login path but does NOT work for cold starts (app killed and reopened while signed in). `onAuthStateChanged` fires on cold start and gives you the Firebase `User` object, but not the Firestore role. The context must independently fetch the role from Firestore whenever a user is present. Login's own role-based navigation becomes redundant and is removed.

3. **Root layout uses Expo Router's `Redirect` component, driven by context state.** The root layout does not use `router.replace()` or imperative navigation. Instead, it conditionally renders either `<Redirect href="/(auth)" />`, `<Redirect href="/(commuter)" />`, or `<Redirect href="/(driver)" />` based on what the context reports. This keeps the component declarative and lets Expo Router handle the actual navigation mechanics. A loading state renders a simple spinner view while the context is still resolving.

4. **`(commuter)` and `(driver)` are Expo Router route groups with their own `_layout.tsx` tab navigators.** Each group contains exactly one screen for now (the home screen). Future stories will add more tabs (history, profile, settings) to each group independently.

5. **The existing `(tabs)` route group is retired.** It currently contains `commuter.tsx`, `driver.tsx`, and `index.tsx` (the POC harness). The commuter and driver screens are moved into their new route groups. The POC `index.tsx` is removed -- it was a development test harness and is no longer needed once the app routes correctly.

6. **`login.tsx` and `role-selection.tsx` no longer navigate directly to tabs.** They currently call `router.replace('/(tabs)')`. After TOW-10, the AuthContext will detect the sign-in (via `onAuthStateChanged`) and fetch the role. The root layout's `Redirect` will handle navigation. Login and role-selection just need to know that once Firebase Auth is updated, the context will take over. They do not need to navigate at all after a successful sign-in or role save -- the context re-fires and the redirect happens automatically.

### Navigation Structure After TOW-10

```
app/
  _layout.tsx                    <- Root: reads AuthContext, conditionally Redirects
  (auth)/
    _layout.tsx                  <- Stack navigator (unchanged)
    index.tsx                    <- Redirects to signup (unchanged)
    signup.tsx                   <- Modified: remove router.replace('/(tabs)') call after role-selection
    login.tsx                    <- Modified: remove router.replace('/(tabs)') call
    role-selection.tsx           <- Modified: remove router.replace('/(tabs)') call
  (commuter)/
    _layout.tsx                  <- NEW: Tab navigator for commuter screens
    index.tsx                    <- NEW: Commuter home (moved from (tabs)/commuter.tsx)
  (driver)/
    _layout.tsx                  <- NEW: Tab navigator for driver screens
    index.tsx                    <- NEW: Driver home (moved from (tabs)/driver.tsx)
  (tabs)/                        <- DELETED (or emptied; see Step 5)
```

---

## Technical Requirements

### Files to Create

- `context/auth-context.tsx` -- The AuthContext provider and hook. Contains all auth state logic.
- `app/(commuter)/_layout.tsx` -- Tab navigator layout for the commuter route group.
- `app/(commuter)/index.tsx` -- Commuter home screen (content moved from `app/(tabs)/commuter.tsx`).
- `app/(driver)/_layout.tsx` -- Tab navigator layout for the driver route group.
- `app/(driver)/index.tsx` -- Driver home screen (content moved from `app/(tabs)/driver.tsx`).

### Files to Modify

- `app/_layout.tsx` -- Wrap the app in `AuthProvider`. Replace the static `Stack` with conditional `Redirect` logic based on auth state. Register `(commuter)` and `(driver)` as Stack screens. Remove `(tabs)`.
- `app/(auth)/login.tsx` -- Remove the `router.replace('/(tabs)')` and `router.replace('/role-selection')` calls from `handleLogin`. The context handles navigation now.
- `app/(auth)/role-selection.tsx` -- Remove the `router.replace('/(tabs)')` call from `handleContinue`. The context handles navigation now.

### Files to Delete

- `app/(tabs)/_layout.tsx`
- `app/(tabs)/commuter.tsx`
- `app/(tabs)/driver.tsx`
- `app/(tabs)/index.tsx`

### Files That Do NOT Change

- `services/firebase/authService.ts` -- `signInWithEmail` still returns role (used during login for immediate feedback if desired, but the context is the real driver). `signOut` functionality will be added here in a future story or added minimally here -- see Step 3.
- `services/firebase/config.ts` -- Firebase `auth` and `db` exports are unchanged.
- `types/models.ts` -- `User` interface is unchanged; `role: 'commuter' | 'driver' | 'both' | null` already covers all cases.
- `app/(auth)/_layout.tsx` -- Unchanged.
- `app/(auth)/index.tsx` -- Unchanged.
- `app/(auth)/signup.tsx` -- Unchanged. Signup navigates to `/role-selection` which is still correct.

---

## Implementation Steps

### Step 1: Create the AuthContext -- `context/auth-context.tsx`

**File**: `context/auth-context.tsx` (new file)

**Purpose**: This is the heart of TOW-10. It provides the entire app with three pieces of state: whether a user is signed in, what their role is, and whether the auth system is still initializing. It also exposes a `signOut` function.

**What it does internally:**
1. Subscribes to `onAuthStateChanged` from Firebase Auth. This fires immediately on mount (with the current user or null) and again any time sign-in or sign-out occurs. It also fires on cold start if a session was persisted to AsyncStorage.
2. When a user is present, fetches their role from Firestore by reading `/users/{uid}`.
3. When no user is present, sets role to null.
4. The `loading` flag starts as `true` and becomes `false` only after the first auth state resolution AND (if a user was present) the Firestore fetch completes.

**The context shape:**

```typescript
interface AuthContextType {
  user: FirebaseUser | null;   // The Firebase Auth user object (or null)
  role: 'commuter' | 'driver' | null;  // The role from Firestore (or null)
  loading: boolean;            // True until first resolution is complete
  signOut: () => Promise<void>;
}
```

Why `FirebaseUser | null` and not the app's `User` interface from `types/models.ts`? The Firebase `User` object from `onAuthStateChanged` is what you get for free -- it has `uid`, `email`, etc. The full `User` model from models.ts includes fields like `name`, `phone`, `rating` that require a separate Firestore read. For navigation routing, we only need `uid` (to fetch the role) and the Auth user object. We do NOT need to hydrate the full User model at this stage. That is a future story.

**Code structure:**

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';

// 1. Create context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// 2. Provider component -- wraps the app
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<'commuter' | 'driver' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in -- fetch their role from Firestore
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = userDoc.data();
          const fetchedRole = data?.role;
          // Only accept 'commuter' or 'driver' as valid roles
          if (fetchedRole === 'commuter' || fetchedRole === 'driver') {
            setRole(fetchedRole);
          } else {
            // Role is missing, null, or invalid -- set to null
            // The root layout will handle the sign-out fallback
            setRole(null);
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
          setRole(null);
        }
      } else {
        // No user signed in
        setUser(null);
        setRole(null);
      }
      // Auth state is resolved -- stop showing the loading screen
      setLoading(false);
    });

    // Cleanup: unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will fire with null, which resets user and role above
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Custom hook -- the only way other components access this context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Why the `if (!context) throw` pattern?** If someone accidentally uses `useAuth()` outside the `AuthProvider` tree, they will get a clear error message instead of a confusing null-pointer crash. This is a standard React context safety pattern.

**Why does the Firestore fetch happen inside the `onAuthStateChanged` callback?** Because that callback is the only reliable signal that a user exists -- on both fresh logins AND cold starts. Putting the fetch anywhere else (like in login.tsx) would miss the cold-start case.

---

### Step 2: Rewrite the root layout -- `app/_layout.tsx`

**File**: `app/_layout.tsx`

**Purpose**: The root layout is the single place that decides what the user sees. Before TOW-10 it was a static list of Stack screens. After TOW-10 it reads the AuthContext and conditionally renders a `Redirect` to the correct route group.

**How it works:**

```typescript
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth-context';

// This inner component does the routing logic.
// It MUST be a child of AuthProvider so that useAuth() works.
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, role, loading, signOut } = useAuth();

  // Case C: Still resolving auth state. Show a loading spinner.
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Case A: No user signed in. Go to auth screens.
  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  // Case B: User IS signed in. Route based on role.
  if (role === 'commuter') {
    return <Redirect href="/(commuter)" />;
  }

  if (role === 'driver') {
    return <Redirect href="/(driver)" />;
  }

  // Case B3: User is signed in but role is null or invalid.
  // Sign out and let the app fall back to auth screens.
  // This handles the acceptance criterion: "If role is missing or invalid, show error and log out"
  // We use a useEffect-style side effect here, but since this is a conditional render branch,
  // we handle it directly. See the note below.
  Alert.alert(
    'Account Error',
    'Your account role is missing or invalid. Please sign in again and complete role selection.',
    [{ text: 'OK', onPress: () => signOut() }]
  );
  // While waiting for the user to tap OK, render nothing (or auth redirect as fallback)
  return <Redirect href="/(auth)" />;
}

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={...}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(commuter)" options={{ headerShown: false }} />
          <Stack.Screen name="(driver)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
```

**IMPORTANT NOTE on the invalid-role Alert:** Calling `Alert.alert()` directly in a render function is an anti-pattern in React because render functions should be pure. The preferred approach is to use a `useEffect` that watches for the invalid-role state and shows the alert as a side effect. However, `RootLayoutNav` is a functional component, so you CAN use hooks in it. The implementation step below shows both approaches. The `useEffect` approach is cleaner:

```typescript
// Inside RootLayoutNav, BEFORE the conditional returns:
useEffect(() => {
  if (!loading && user && role === null) {
    Alert.alert(
      'Account Error',
      'Your account role is missing or invalid. Please sign in again and complete role selection.',
      [{ text: 'OK', onPress: () => signOut() }]
    );
  }
}, [loading, user, role, signOut]);
```

Then the render logic simply does:
```typescript
if (!loading && user && !role) {
  // Alert was shown via useEffect. Redirect to auth as a safe fallback
  // while waiting for user to dismiss the alert.
  return <Redirect href="/(auth)" />;
}
```

**Why `AuthProvider` wraps `ThemeProvider` and `Stack`?** The `AuthProvider` must be the outermost wrapper so that `useAuth()` is available to `RootLayoutNav` and to any screen deeper in the tree. `ThemeProvider` only provides color theme -- it does not need to be above `AuthProvider`.

**Why split into `RootLayout` and `RootLayoutNav`?** Expo Router requires the default export of `_layout.tsx` to be the layout component. But hooks (like `useAuth`) cannot be called in the same component that renders `<Stack>` in certain Expo Router versions without issues. Splitting into an outer component (`RootLayout` that provides context) and an inner component (`RootLayoutNav` that consumes it) is the standard pattern used in Expo Router auth tutorials.

**The `unstable_settings` anchor stays as `(auth)`.** This tells Expo Router which route group to render by default when no redirect has fired yet. Since the app always starts by checking auth state, `(auth)` is the correct default -- it is where unauthenticated users land.

---

### Step 3: Add `signOut` to authService.ts (minimal addition)

**File**: `services/firebase/authService.ts`

**Purpose**: The `signOut` function in the AuthContext calls `firebaseSignOut(auth)` directly from the Firebase SDK. This is fine for now. However, to keep the pattern consistent with the rest of authService.ts (where all Firebase Auth calls live in the service layer), you may optionally add a `signOut` wrapper here and have the context call it instead. For TOW-10, the context calling the Firebase SDK directly is acceptable -- the service wrapper can be added as a follow-up refactor.

**What to add (optional but recommended for consistency):**

```typescript
import { signOut as firebaseSignOut } from 'firebase/auth';

export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}
```

Add `signOut as firebaseSignOut` to the existing `firebase/auth` import line. The context would then import and call this instead of importing `signOut` from Firebase directly.

---

### Step 4: Modify login.tsx and role-selection.tsx -- remove manual navigation

**File**: `app/(auth)/login.tsx`

**What changes and why:** The `handleLogin` function currently reads the role from `signInWithEmail`'s return value and calls `router.replace('/(tabs)')` or `router.replace('/role-selection')`. After TOW-10, the AuthContext's `onAuthStateChanged` listener will fire as soon as Firebase Auth sign-in completes. It will fetch the role and the root layout will Redirect automatically. Login does not need to navigate at all.

**Current code to remove (lines 35-39 of login.tsx):**
```typescript
      if (result.role === 'commuter' || result.role === 'driver') {
        router.replace('/(tabs)');
      } else {
        router.replace('/role-selection');
      }
```

**Replace with:** nothing. The `try` block's success path becomes empty (or just the `await` call). The `signInWithEmail` call itself is still useful because it throws on bad credentials -- that error handling stays. But we no longer need to act on the return value for navigation purposes.

```typescript
    try {
      await signInWithEmail(email, password);
      // Navigation is handled automatically by AuthContext + root layout Redirect.
      // onAuthStateChanged fires after sign-in and routes the user.
    } catch (error: any) {
      setError(error.message);
    }
```

You can also remove the `result` variable entirely since nothing uses it now. The `router` import can be removed if nothing else in the file uses it. Check: the "Sign Up" link at the bottom still uses `router.replace('/signup')`, so `router` stays.

**File**: `app/(auth)/role-selection.tsx`

**What changes:** Same pattern. The `handleContinue` function calls `updateUserRole()` to write the role to Firestore, then calls `router.replace('/(tabs)')`. Remove the navigation call. Once `updateUserRole` completes, Firestore has the role. But `onAuthStateChanged` does NOT re-fire just because a Firestore document changed -- it only fires on Auth state changes (sign in / sign out). So the context will NOT automatically pick up the new role.

**This is a critical detail.** After role selection writes the role, something must trigger the context to re-read it. The cleanest approach: the AuthContext exposes a `refreshRole` function that manually re-fetches the role from Firestore. Role-selection calls `refreshRole()` after `updateUserRole()` succeeds. The root layout will then see the new role and Redirect.

**Add to AuthContext:**
```typescript
const refreshRole = async () => {
  if (!user) return;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const data = userDoc.data();
    const fetchedRole = data?.role;
    if (fetchedRole === 'commuter' || fetchedRole === 'driver') {
      setRole(fetchedRole);
    } else {
      setRole(null);
    }
  } catch (error) {
    console.error('Failed to refresh role:', error);
  }
};
```

Add `refreshRole` to the context type and the provider value.

**Updated role-selection.tsx handleContinue:**
```typescript
  const { refreshRole } = useAuth();

  const handleContinue = async () => {
    // ... validation unchanged ...

    setLoading(true);
    try {
      await updateUserRole(currentUser.uid, selectedRole);
      console.log('Role saved successfully!', selectedRole);
      // Tell the AuthContext to re-read the role from Firestore.
      // This will trigger a re-render of the root layout, which will Redirect.
      await refreshRole();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
```

The `router` import can be removed from role-selection.tsx since it is no longer used.

---

### Step 5: Create the (commuter) route group

**File**: `app/(commuter)/_layout.tsx` (new file)

**Purpose**: Tab navigator for the commuter experience. For now it has only one tab (Home). Future stories will add more tabs (e.g., History, Profile).

```typescript
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CommuterLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="car.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

This mirrors the structure of the existing `app/(tabs)/_layout.tsx` but with only one screen. The imports (`HapticTab`, `IconSymbol`, `Colors`, `useColorScheme`) are all already used in the codebase -- no new dependencies.

**File**: `app/(commuter)/index.tsx` (new file)

**Purpose**: The commuter home screen. The content is taken directly from `app/(tabs)/commuter.tsx`. The file is moved, not rewritten. The only change is cosmetic: the hardcoded `"test-commuter-001"` in the `createRequest` call should ideally be replaced with the actual user ID from AuthContext. However, that is a refinement for a future story (the request creation flow). For TOW-10, copy the file as-is. The acceptance criterion is "map with Request Assistance button" -- that is already what commuter.tsx renders.

---

### Step 6: Create the (driver) route group

**File**: `app/(driver)/_layout.tsx` (new file)

Same structure as the commuter layout, but for drivers:

```typescript
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DriverLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="car.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**File**: `app/(driver)/index.tsx` (new file)

Content moved from `app/(tabs)/driver.tsx`. Same reasoning as the commuter screen -- copy as-is for now.

---

### Step 7: Delete the old (tabs) route group

**Files to delete:**
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/commuter.tsx`
- `app/(tabs)/driver.tsx`
- `app/(tabs)/index.tsx`

These files are replaced by the new route groups. The POC test harness (`index.tsx`) is no longer needed -- it was used to manually test Firestore operations during Phase 1 and those operations are now exercised through the proper commuter and driver screens.

If you want to keep the POC screen for debugging during development, you could place it at `app/(commuter)/poc.tsx` or similar. But per the acceptance criteria, it is not required and adds clutter to the tab bar. Remove it.

---

### Step 8: Verify the routing end-to-end (mental walkthrough)

**Cold start -- returning commuter:**
1. App was previously used, user signed in as a commuter, then app was killed.
2. App relaunches. `RootLayout` renders. `AuthProvider` mounts.
3. `onAuthStateChanged` fires with the persisted Firebase User (restored from AsyncStorage).
4. Context fetches `/users/{uid}` from Firestore. Role is `'commuter'`.
5. `loading` becomes `false`, `role` is `'commuter'`.
6. `RootLayoutNav` renders `<Redirect href="/(commuter)" />`.
7. User sees the commuter home screen with the map.

**Cold start -- returning driver:**
Same as above, but role is `'driver'` and the redirect goes to `/(driver)`.

**Fresh login -- commuter:**
1. User is on login screen. Enters credentials. Taps Log In.
2. `signInWithEmail` authenticates with Firebase Auth.
3. `onAuthStateChanged` fires in the AuthContext (because Auth state changed).
4. Context fetches role. Role is `'commuter'`.
5. Root layout Redirects to `/(commuter)`.
6. Login screen is replaced by the commuter home screen.

**Fresh signup -- new user:**
1. User signs up. Signup screen navigates to `/role-selection` (unchanged behavior).
2. User selects "Commuter". Taps Continue.
3. `updateUserRole` writes `role: 'commuter'` to Firestore.
4. `refreshRole()` re-reads Firestore. Context now has `role: 'commuter'`.
5. Root layout Redirects to `/(commuter)`.

**Invalid role -- signed in but no role:**
1. User's Firestore document has `role: null` (e.g., role selection was never completed).
2. `onAuthStateChanged` fires. Context fetches role. Gets `null`.
3. Root layout's `useEffect` sees `user !== null && role === null && !loading`. Shows Alert.
4. User taps OK. `signOut()` is called. Auth state changes to null.
5. `onAuthStateChanged` fires again with null user. Context resets.
6. Root layout Redirects to `/(auth)`. User sees signup/login screens.

---

## Edge Cases

1. **Firestore read fails on cold start (network error).** `onAuthStateChanged` fires with a valid user, but `getDoc` throws. The catch block sets `role` to `null` and `loading` to `false`. The root layout will show the invalid-role alert and sign the user out. On their next attempt (after re-signing in), if the network is back, the role will be fetched successfully. This is a safe degradation -- the user is not locked out, they just need to re-authenticate when connectivity returns.

2. **`onAuthStateChanged` fires multiple times rapidly.** This can happen during sign-in (Auth fires once for the sign-in event, then possibly again for token refresh). The `async` callback in the `useEffect` is not cancellable -- if two invocations overlap, the second one's `setRole` will overwrite the first's. This is acceptable because both invocations read the same Firestore document. The final state will be correct. If you want to be defensive, you can add a `mounted` flag (see PATTERNS.md "Handle Async State Updates") inside the useEffect callback.

3. **User has role `'both'`.** The `User` interface in `types/models.ts` includes `'both'` as a valid role value. The AuthContext explicitly checks for `'commuter'` or `'driver'` only. If the role is `'both'`, it falls into the `null` case and the user is signed out with the error alert. Role `'both'` is a future feature (role switching) that is not implemented yet. Signing out and prompting the user to re-select is a safe behavior for now.

4. **`refreshRole` is called before `updateUserRole` has finished propagating in Firestore.** Firestore writes are strongly consistent for single-document reads after writes from the same client. So `getDoc` immediately after `updateDoc` on the same document WILL see the updated value. There is no propagation delay to worry about here.

5. **User taps the back button on the commuter or driver home screen.** Expo Router's `Redirect` component manages the navigation stack. Once the Redirect fires, the auth screens are not in the forward stack. The back button on the home screen does nothing (there is nowhere to go back to). This is correct behavior.

6. **`auth.currentUser` is null inside `role-selection.tsx`.** This already happens today (the existing code checks for it on line 20-23 and shows an error). After TOW-10, role-selection can also use `useAuth()` to get the user, but since it already handles this case with `auth.currentUser`, leave that logic unchanged. The important change is only the removal of `router.replace('/(tabs)')` and the addition of `refreshRole()`.

---

## Testing Strategy

- **Cold start routing:** Close the app completely. Reopen. Verify you land on the correct role-specific screen without seeing the login screen.
- **Fresh login routing:** Sign out (if a sign-out button is available; otherwise clear app data). Sign in. Verify you land on the correct screen.
- **Fresh signup routing:** Create a new account. Select a role. Verify you land on the correct screen.
- **Invalid role fallback:** In Firebase Console, manually set a user's `role` field to `null`. Restart the app while that user is signed in. Verify the error alert appears and the user is signed out.
- **Both screens render correctly:** Sign in as a commuter -- verify the map and "Request Roadside Assistance" button. Sign in as a driver -- verify the map renders. (Full driver functionality is a future story.)
- **Loading state:** On a slow network, verify the app shows a spinner while auth state is resolving rather than flashing a login screen briefly.

---

## Dependencies

- **TOW-7** (signup) -- COMPLETED. Provides the Firestore user document with the `role` field.
- **TOW-8** (role selection) -- COMPLETED. Provides `updateUserRole()` and the role-selection screen.
- **TOW-9** (login) -- COMPLETED. Provides `signInWithEmail()` and the login screen.
- **No new npm packages required.** `onAuthStateChanged` is part of `firebase/auth`. `createContext`, `useContext`, `useEffect`, `useState` are part of React. `ActivityIndicator` is part of React Native. Everything is already installed.

---

## Quick Reference: What Goes Where

| Piece of TOW-10 | File | Action |
|---|---|---|
| AuthContext provider + useAuth hook | `context/auth-context.tsx` | Create new file |
| Auth state subscription + role fetch | `context/auth-context.tsx` (inside AuthProvider) | `onAuthStateChanged` + `getDoc` |
| `refreshRole` function | `context/auth-context.tsx` (inside AuthProvider) | Manual Firestore re-read |
| `signOut` function | `context/auth-context.tsx` (calls Firebase signOut) | Calls `firebaseSignOut(auth)` |
| Root layout routing logic | `app/_layout.tsx` | Rewrite to use AuthProvider + Redirect |
| Commuter tab navigator | `app/(commuter)/_layout.tsx` | Create new file |
| Commuter home screen | `app/(commuter)/index.tsx` | Move content from `app/(tabs)/commuter.tsx` |
| Driver tab navigator | `app/(driver)/_layout.tsx` | Create new file |
| Driver home screen | `app/(driver)/index.tsx` | Move content from `app/(tabs)/driver.tsx` |
| Remove manual nav from login | `app/(auth)/login.tsx` | Remove `router.replace` calls in handleLogin |
| Remove manual nav from role-selection | `app/(auth)/role-selection.tsx` | Remove `router.replace`, add `refreshRole()` call |
| Delete old tab group | `app/(tabs)/` (all files) | Delete directory |

---

_This specification was created by the `technical-architect` agent._
_Ready for `code-coach` agent to guide implementation._
_Created: 2026-02-03_
