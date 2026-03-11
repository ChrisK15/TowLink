# TOW-74 Implementation Progress

## Story Summary

We are building `commuter-setup.tsx` — a profile setup screen that intercepts the auth flow right after the commuter selects their role. Instead of landing on Commuter Home with an empty profile, the new commuter first fills in their name and phone number, sees a success confirmation, and is then redirected to Commuter Home with a complete Firestore document.

## Learning Objectives

- Practice adding a new exported function to an existing service file (`authService.ts`) by closely reading and replicating an existing pattern
- Understand WHY the order of `refreshRole()` matters in a context-driven navigation system
- Apply the `useState` / validation / async handler / `loading` / `error` pattern you have used in `signup.tsx` and `role-selection.tsx` — this time on your own
- Build a two-state screen (form state vs. success state) using a single boolean flag
- Use `useEffect` with a `setTimeout` for a timed auto-redirect, including the cleanup function
- Understand the difference between `router.replace` and `router.push` and when each is appropriate

---

## Lesson Plan

---

### Step 1: Understand the flow BEFORE writing any code

**Goal**: Know exactly where this screen sits in the app and why the current flow skips profile setup entirely.

**Teaches**: Reading existing code to understand a system before modifying it — a critical professional habit.

**Files to read (don't modify yet)**:

- `/Users/loris/TowLink/app/(auth)/role-selection.tsx` — the screen that will navigate to our new screen
- `/Users/loris/TowLink/context/auth-context.tsx` — specifically the `refreshRole()` function and what it does to the `role` state
- `/Users/loris/TowLink/app/_layout.tsx` — find where it checks `role === 'commuter'` and does a `<Redirect>`

**Before you code — answer these questions in your head (or out loud):**

1. In `role-selection.tsx`, what happens on line 32 when `refreshRole()` is called? Trace what that triggers in `auth-context.tsx`.
2. In `_layout.tsx`, what is the condition that causes a redirect to `/(commuter)`? When does that condition become true?
3. If `refreshRole()` is called immediately after `updateUserRole()` in role-selection, in what order do these things happen? Does the user ever see a "setup" screen?
4. What would need to change so that the commuter sees a setup screen FIRST, before `refreshRole()` is ever called?

**Task**: Do not write any code yet. Just read the three files above and form a mental model of the current flow and the gap we need to fill.

**Verify**: You should be able to explain in one sentence why the current code skips profile setup and what the fix will be.

**Coaching tip**: The key insight is in `_layout.tsx`. The moment `role` becomes `'commuter'` in context state, the `<Redirect>` fires. So as long as we delay calling `refreshRole()`, the user stays in the auth flow. That delay is the entire purpose of this story.

---

### Step 2: Add `updateUserProfile` to `authService.ts`

**Goal**: Add a new exported async function that writes `name` and `phone` to the user's Firestore document.

**Teaches**: Extending a service layer by following existing patterns — and understanding why `updateDoc` is the right choice over `setDoc`.

**Files**: `/Users/loris/TowLink/services/firebase/authService.ts`

**Before you code**: Read the existing `updateUserRole()` function carefully (lines 86-97). Notice:

- How it builds the document reference with `doc(db, 'users', userId)`
- How it calls `updateDoc` with just the fields it wants to change
- How it wraps things in try/catch and throws a user-friendly error

Now ask yourself: why does this use `updateDoc` and not `setDoc`? What would happen to the user's existing `email`, `role`, and `createdAt` fields if you used `setDoc` here?

**Task**: After the closing `}` of `updateUserRole`, write a new exported async function called `updateUserProfile`. It should:

- Accept `userId: string` and `profile: { name: string; phone: string }` as parameters
- Return `Promise<void>`
- Build the document reference the same way `updateUserRole` does
- Call `updateDoc` with `name` and `phone` from the profile object
- Catch errors, log them, and throw a user-friendly error message

Do NOT copy-paste `updateUserRole` blindly — type it yourself so you learn the structure.

**Verify**: Check that VS Code shows no TypeScript errors on the file. The function signature and the `updateDoc` call should look structurally identical to `updateUserRole` — just with different fields.

**Coaching tip**: The `updateDoc` import is already at the top of the file (`import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore'`). You do not need to add any imports.

---

### Step 3: Create `commuter-setup.tsx` as a placeholder skeleton

**Goal**: Create the file and verify the screen is reachable via routing before spending any time on UI.

**Teaches**: The habit of wiring up navigation and verifying routing BEFORE building UI — prevents wasted work on a screen that can't be reached.

**Files**: `/Users/loris/TowLink/app/(auth)/commuter-setup.tsx` (CREATE this file)

**Before you code**: Look at the file structure of `app/(auth)/`. Expo Router uses file-based routing — any `.tsx` file inside `(auth)/` becomes a route at `/(auth)/[filename]`. So creating `commuter-setup.tsx` here automatically creates the route `/(auth)/commuter-setup`. No manual route registration needed.

**Task**: Create the file with the minimal possible working component — just enough to confirm the screen exists:

```typescript
import { View, Text } from 'react-native';

export default function CommuterSetupScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Commuter Setup - placeholder</Text>
    </View>
  );
}
```

Do not add state, handlers, or styling yet. The goal of this step is ONLY to create a reachable screen.

**Verify**: Save the file. The Expo dev server should hot-reload without errors. You should not see any new red errors in the terminal.

**Coaching tip**: If Expo throws an error about the route, double-check the file is named exactly `commuter-setup.tsx` and lives directly inside `app/(auth)/` — not inside `app/(auth)/onboarding/`.

---

### Step 4: Wire up the navigation change in `role-selection.tsx`

**Goal**: Change the commuter path in `handleContinue` so it navigates to `commuter-setup` instead of calling `refreshRole()` immediately.

**Teaches**: How to make a targeted, minimal change to existing working code — modifying one behavior without breaking another (the driver path stays unchanged).

**Files**: `/Users/loris/TowLink/app/(auth)/role-selection.tsx`

**Before you code**: Read `handleContinue` in `role-selection.tsx` again. Notice that `refreshRole` is imported from `useAuth()` but there is no `router` in this file. You will need to add it.

Also think about this: why do we use `router.replace` here instead of `router.push`? What would happen if a commuter could press the back button from the setup screen and return to role-selection?

**Task**: Make these three targeted changes to `role-selection.tsx`:

1. `useRouter` is already imported at the top — confirm it is there. If not, add `import { useRouter } from 'expo-router'`.
2. Inside the component, add `const router = useRouter();` alongside the existing `const { refreshRole } = useAuth();`
3. In `handleContinue`, replace the single `await refreshRole();` call with an if/else:
   - If `selectedRole === 'commuter'`: call `router.replace('/(auth)/commuter-setup' as any)` — do NOT call `refreshRole()` here
   - Else (driver path): keep `await refreshRole()` as-is

**Verify**: Run the app. Go through: Onboarding → "Continue as Customer" → Signup (or login with a fresh account) → Role Selection → select "Commuter" → tap "Continue". You should land on the placeholder screen that says "Commuter Setup - placeholder". If you see that text, routing is working correctly.

Also test that the driver path is NOT broken: select "Driver" → tap "Continue" → should still proceed to driver home as before.

**Coaching tip**: The `as any` type cast on the route string is intentional — Expo Router's TypeScript types are strict about route strings, and `/(auth)/commuter-setup` may not be in its generated types yet since we just created the file. Using `as any` is the pragmatic workaround the spec calls for.

---

### Step 5: Build the Form state UI and save logic

**Goal**: Replace the placeholder with a real form that collects name and phone, validates input, writes to Firestore, and transitions to `isSaved = true` on success.

**Teaches**: Applying the full form pattern (state, validation function, async handler, loading state, error display) to a new screen independently.

**Files**: `/Users/loris/TowLink/app/(auth)/commuter-setup.tsx`

**Before you code**: Open `signup.tsx` as your reference. Notice the structure:

- `validateSignupForm` is defined OUTSIDE the component (above `export default`)
- State variables are all declared at the top of the component with `useState`
- The async handler checks validation first, returns early if there's an error, then sets `loading(true)` before the async call
- The button shows different text when `loading` is true and is `disabled={loading}`
- The error is displayed conditionally: `{error ? <Text>{error}</Text> : null}`

You have built this exact pattern before. Now apply it here.

**Task**: Build the form state in three sub-steps:

**5a — State and validation (logic only, no JSX yet):**

- Add these imports: `useState` from react; `ScrollView`, `TextInput`, `Pressable`, `StyleSheet` from react-native; `SafeAreaView` from `react-native-safe-area-context`; `useAuth` from `@/context/auth-context`; `updateUserProfile` from `@/services/firebase/authService`
- Add state: `name`, `phone`, `error`, `loading`, `isSaved` (all with appropriate TypeScript types)
- Pull `user` and `refreshRole` from `useAuth()`
- Define `validateProfileForm(name, phone)` OUTSIDE the component — it should return an error string or `null`. Rules: both fields required, name must be at least 2 characters, phone must match the regex `/^[\+]?[\d\s\-\(\)]{7,15}$/`
- Define `handleSave` as an async function inside the component — validate first, guard for `!user`, then call `updateUserProfile`, then `setIsSaved(true)` on success

**5b — Form JSX:**
Replace the placeholder `View` with:

- `SafeAreaView` as outer container
- `ScrollView` with `keyboardShouldPersistTaps="handled"` and padding
- An icon circle at the top (car emoji in a light blue circle — use a `View` with `borderRadius: 40` and `backgroundColor: '#EBF4FD'`)
- Heading text: "Complete Your Profile"
- Subtitle text: "Tell us a bit about yourself"
- A white card `View` containing two input groups (label + `TextInput`): one for Full Name, one for Phone Number (use `keyboardType="phone-pad"` on the phone input)
- Error text below the card, conditionally rendered
- A `Pressable` button "Save & Continue" that calls `handleSave` and is disabled while `loading`

**5c — StyleSheet:**
Add styles for all elements. Reference the color tokens from the spec:

- Primary blue `#2B7AFF` for the button
- Label color `#1A1A2E`
- Input border `#E5E7EB`
- Error red `#EF4444`
- Card background `#FFFFFF` with a subtle shadow

**Verify**: Test all validation cases:

- Submit with both fields empty — should show "Please fill in all fields."
- Submit with name "A" — should show the full name error
- Submit with phone "abc" — should show the phone error
- Submit with valid name and valid phone — the button should disable, Firestore should be called, and `isSaved` should become `true` (you'll see a crash or blank screen since success state isn't built yet — that's fine, it means the write worked)

Open Firebase Console > Firestore > users collection to confirm the `name` and `phone` fields appeared on your test user document.

**Coaching tip**: If you get a TypeScript error on `user.uid`, remember that `user` from `useAuth()` is typed as `FirebaseUser | null`. You already guard for `!user` in `handleSave`, but TypeScript may still complain. Use optional chaining `user?.uid` or add a non-null assertion after the guard.

---

### Step 6: Build the Success state UI and auto-redirect

**Goal**: Add the `isSaved === true` render path — the "Welcome to TowLink!" confirmation screen — and wire up the 3-second auto-redirect via `useEffect`.

**Teaches**: Conditional rendering with two return paths in one component, and the `useEffect` + `setTimeout` + cleanup pattern.

**Files**: `/Users/loris/TowLink/app/(auth)/commuter-setup.tsx`

**Before you code**: Think about the `useEffect` cleanup function. Why do we return `() => clearTimeout(timer)` from the effect? What problem does it prevent if the user taps "Continue to App" manually before the 3 seconds are up?

Also think about the two-return-path pattern:

```typescript
if (isSaved) {
  return ( /* success screen */ );
}
return ( /* form screen */ );
```

This is cleaner than a deeply nested ternary. The form render you already built becomes the second `return`. The success screen is a new first `return` guarded by `if (isSaved)`.

**Task**: Add to `commuter-setup.tsx`:

**6a — `handleContinue` function (inside the component):**

```typescript
const handleContinue = async () => {
	await refreshRole();
};
```

This is the function that completes the flow. Calling `refreshRole()` re-reads Firestore, sets `role = 'commuter'` in context, which causes `_layout.tsx` to fire its `<Redirect href="/(commuter)" />`.

**6b — `useEffect` for auto-redirect:**
Add a `useEffect` that:

- Does nothing (returns early) if `isSaved` is `false`
- When `isSaved` is `true`, starts a 3000ms `setTimeout` that calls `handleContinue()`
- Returns a cleanup function that calls `clearTimeout(timer)` to cancel the timer if the component unmounts before 3 seconds

Don't forget `isSaved` in the dependency array.

**6c — Success state JSX (add ABOVE the form return):**

```
if (isSaved) {
  return (
    <SafeAreaView ...>
      [Green checkmark circle at top]
        - Use Ionicons name="checkmark-circle" size={80} color="#22C55E"
        - Wrap it in a View with borderRadius and backgroundColor: '#DCFCE7'
      [Bold heading: "Welcome to TowLink!"]
      [Subtitle: "Your account has been created successfully"]
      [White card with 3 feature bullet rows]
        - Each row: horizontal flex, icon on left, bold title + gray description on right
        - Row 1: checkmark icon, "Account Verified", "Your email has been verified and your account is ready"
        - Row 2: car icon (or emoji), "Request Assistance Anytime", "Get help whenever and wherever you need it"
        - Row 3: flash icon, "Fast Response Times", "Get connected to nearby drivers in seconds"
      [Blue "Continue to App" Pressable button — calls handleContinue]
      [Small gray text: "Automatically redirecting in 3 seconds..."]
    </SafeAreaView>
  );
}
```

Add `Ionicons` from `@expo/vector-icons` and `useEffect` from `react` to your imports.

**Verify**: Complete the full end-to-end flow:

1. Fill in valid name + phone
2. Tap "Save & Continue"
3. Success screen appears with the green checkmark and "Welcome to TowLink!" heading
4. Wait 3 seconds — should auto-redirect to Commuter Home
5. Alternatively, tap "Continue to App" immediately — should redirect right away
6. In Firebase Console, confirm the user document has `name` and `phone` fields set correctly

Also verify the full manual testing checklist from the spec:

- Back button from commuter-setup does NOT go back to role-selection (because `router.replace` was used)
- Driver path through role-selection is unaffected
- Loading state disables the button during the Firestore write

**Coaching tip**: If `Ionicons` gives a TypeScript error on the icon name, check the `@expo/vector-icons` docs for the correct name string. Common names for this screen: `"checkmark-circle"`, `"car"`, `"flash"`. If an icon doesn't exist by that name, you can always substitute a text emoji for now.

---

## Progress Tracker

- [x] Step 1: Understand the flow — read role-selection, auth-context, and \_layout before writing any code
- [x] Step 2: Add `updateUserProfile` to `authService.ts`
- [x] Step 3: Create `commuter-setup.tsx` — full implementation (form + success state, validation, save logic, auto-redirect)
- [x] Step 5: Build the Form state UI and save logic (completed as part of Step 3)
- [x] Step 6: Build the Success state UI and auto-redirect (completed as part of Step 3)
- [x] Step 4: Wire navigation in `role-selection.tsx` — route commuter path to commuter-setup

---

## Notes / Blockers

**Important routing note**: There are TWO `role-selection.tsx` files in this codebase:

- `app/(auth)/onboarding/role-selection.tsx` — used during onboarding (before signup)
- `app/(auth)/role-selection.tsx` — used AFTER signup to assign a role to an authenticated user

Steps 4 and the spec target `app/(auth)/role-selection.tsx` (the post-signup one). Do not modify the onboarding version.

**File location note**: The spec says to create `commuter-setup.tsx` at `app/(auth)/commuter-setup.tsx` — NOT inside `app/(auth)/onboarding/`. The current-story.md suggests `onboarding/commuter-setup.tsx` but the spec is more authoritative and the navigation call in `role-selection.tsx` uses `/(auth)/commuter-setup`.

<!-- Filled in during implementation -->
