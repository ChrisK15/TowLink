# Technical Specification: TOW-74

## Story Reference

**Title**: FE Sprint 3A - Commuter Account Setup Screen
**Branch**: `TOW-4-FE-Sprint-3A-–-Commuter-Account-Setup-Screen`
**Status**: In Progress
**Jira**: https://chriskelamyan115.atlassian.net/browse/TOW-74
**Story Points**: 3
**Sprint**: TOW Sprint 3 (ends 2026-03-11)

### What We Are Building

A profile setup screen that appears immediately after the commuter selects their role (in `app/(auth)/role-selection.tsx`). Today, after role selection the `refreshRole()` call triggers a redirect to `/(commuter)` — but the user's Firestore document has no `name` or `phone` field. This screen fills that gap before the user lands on Commuter Home.

**The flow this screen fits into:**

```
Onboarding → Signup → Role Selection → [commuter-setup.tsx THIS SCREEN] → Commuter Home
```

**What the screen collects:**
- Full Name (maps to `User.name`)
- Phone Number (maps to `User.phone`)

**What the screen writes:**
- Calls `updateDoc` on `users/{userId}` with `{ name, phone }`, following the exact same pattern as `updateUserRole()` in `authService.ts`

---

## Architecture Overview

This is a pure frontend screen. There is no new backend work, no new Cloud Functions, and no schema changes. The `User` interface in `types/models.ts` already has `name?: string` and `phone?: string` as optional fields. The Firestore write pattern already exists in `authService.ts`.

The key integration point is `app/(auth)/role-selection.tsx`. Currently when a commuter selects their role, the code calls `refreshRole()` which causes `auth-context.tsx` to re-read Firestore, which sets `role = 'commuter'`, which causes `_layout.tsx` to redirect the user to `/(commuter)`. We need to intercept this flow for the commuter path: instead of immediately calling `refreshRole()`, first navigate to `commuter-setup.tsx`. The profile setup screen will then call `refreshRole()` after saving name and phone, completing the redirect.

### Why Not Call `refreshRole()` Until After Profile Setup?

`auth-context.tsx` exposes `role` as state. The moment `role` becomes `'commuter'`, `RootLayoutNav` in `_layout.tsx` fires a `<Redirect href="/(commuter)" />`. If we call `refreshRole()` right after `updateUserRole()` (as currently coded in `role-selection.tsx`), the commuter lands on the home screen before ever seeing the setup screen. The fix: only call `refreshRole()` from within `commuter-setup.tsx` after the profile write succeeds.

---

## Design Reference

Design images are located at `/Users/loris/TowLink/.claude/design/screens/commuter_account_setup/`.

| File | What it shows |
|------|---------------|
| `Create Account.png` | The registration form with Full Name, Email, Phone, Password fields |
| `Registration Success.png` | The "Welcome to TowLink!" success/confirmation screen |
| `Commuter Login.png` | The login screen (for visual language reference only) |
| `General Flow (1).png` | All three screens in context side-by-side |

### Key Visual Observations from Figma

**Create Account screen** (style reference for form layout):
- White background with a light blue circle icon at the top (car emoji in circle)
- Bold heading "Join TowLink" with subtitle below it
- Fields are in a white rounded card with subtle shadow
- Each field has a label above it (e.g. "Full Name") in dark text
- Input borders: rounded corners (`borderRadius: 10`), light gray border
- Blue CTA button at bottom, full-width, rounded pill shape

**Registration Success screen** (the confirmation state after saving):
- Large green checkmark inside a light green circle at the top (no header needed)
- Bold "Welcome to TowLink!" heading
- Subtitle: "Your account has been created successfully"
- White rounded card with 3 feature bullets:
  - Checkmark icon + "Account Verified" + body text
  - Car icon + "Request Assistance Anytime" + body text
  - Lightning bolt icon + "Fast Response Times" + body text
- Blue "Continue to App" button at the bottom
- Small gray text: "Automatically redirecting in 3 seconds..."

**Color tokens observed across the designs:**
```
Primary blue:   #2B7AFF  (buttons, links)
Icon bg:        #EBF4FD  (light blue circle around car icon)
Success green:  #22C55E  (checkmark circle background tinted)
Success bg:     #DCFCE7  (light green circle)
Card bg:        #FFFFFF  with subtle shadow
Page bg:        #FFFFFF
Label text:     #1A1A2E  (near black, bold)
Sublabel text:  #555555  (gray)
Input border:   #E5E7EB  (light gray)
Error red:      #EF4444
```

---

## Technical Requirements

### Files to Create

```
app/
  (auth)/
    commuter-setup.tsx     <- NEW SCREEN
```

### Files to Modify

```
app/(auth)/role-selection.tsx     <- Change commuter path to navigate here instead of calling refreshRole()
services/firebase/authService.ts  <- Add updateUserProfile() function
```

---

## Component Structure

### `app/(auth)/commuter-setup.tsx`

This is a single-file screen. No new sub-components are needed.

**The screen has two visual states controlled by a boolean `isSaved` flag:**

1. **Form state** (`isSaved === false`): The input form (name + phone)
2. **Success state** (`isSaved === true`): The "Welcome to TowLink!" confirmation screen

This two-state approach avoids a route navigation (no extra screen file) and gives a clean in-place transition that matches the Figma design.

**State:**

```typescript
const [name, setName] = useState<string>('');
const [phone, setPhone] = useState<string>('');
const [error, setError] = useState<string>('');
const [loading, setLoading] = useState<boolean>(false);
const [isSaved, setIsSaved] = useState<boolean>(false);
```

**Props from context:**

```typescript
const { user, refreshRole } = useAuth();
// user.uid is needed for the Firestore write
```

**Validation function (pure function, defined outside the component):**

```typescript
function validateProfileForm(name: string, phone: string): string | null {
  if (!name.trim() || !phone.trim()) {
    return 'Please fill in all fields.';
  }
  if (name.trim().length < 2) {
    return 'Please enter your full name.';
  }
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  if (!phoneRegex.test(phone.trim())) {
    return 'Please enter a valid phone number.';
  }
  return null;
}
```

**Save handler:**

```typescript
const handleSave = async () => {
  const validationError = validateProfileForm(name, phone);
  if (validationError) {
    setError(validationError);
    return;
  }

  if (!user) {
    setError('Session expired. Please sign in again.');
    return;
  }

  setLoading(true);
  setError('');
  try {
    await updateUserProfile(user.uid, { name: name.trim(), phone: phone.trim() });
    setIsSaved(true);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**Continue to App handler (called from the success screen):**

```typescript
const handleContinue = async () => {
  await refreshRole(); // This triggers the redirect to /(commuter) via _layout.tsx
};
```

**Auto-redirect from success screen:**

```typescript
useEffect(() => {
  if (!isSaved) return;

  const timer = setTimeout(() => {
    handleContinue();
  }, 3000); // 3-second auto-redirect matching Figma

  return () => clearTimeout(timer);
}, [isSaved]);
```

---

### Form State Layout (isSaved === false)

```
<SafeAreaView>
  <ScrollView>
    [Icon circle with car emoji - matches design header]
    [Heading: "Complete Your Profile"]
    [Subtitle: "Tell us a bit about yourself"]

    [White card / form container]
      [Label: "Full Name"]
      [TextInput: name field]

      [Label: "Phone Number"]
      [TextInput: phone field, keyboardType="phone-pad"]

    [Error text - only visible when error !== '']

    [CTA Button: "Save & Continue"]
  </ScrollView>
</SafeAreaView>
```

### Success State Layout (isSaved === true)

```
<SafeAreaView>
  <View centered>
    [Large green checkmark circle]
    [Heading: "Welcome to TowLink!"]
    [Subtitle: "Your account has been created successfully"]

    [White card with 3 feature bullets]
      - Checkmark icon + "Account Verified" + description
      - Car icon + "Request Assistance Anytime" + description
      - Lightning icon + "Fast Response Times" + description

    [CTA Button: "Continue to App"]
    [Small text: "Automatically redirecting in 3 seconds..."]
  </View>
</SafeAreaView>
```

---

## Firestore Write Pattern

### New function to add to `services/firebase/authService.ts`

The write follows the exact same `updateDoc` pattern as the existing `updateUserRole()` function. Study that function carefully — this is nearly identical.

```typescript
export async function updateUserProfile(
  userId: string,
  profile: { name: string; phone: string },
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  try {
    await updateDoc(docRef, {
      name: profile.name,
      phone: profile.phone,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    throw new Error('Failed to save profile. Please try again.');
  }
}
```

**Why `updateDoc` and not `setDoc`?**
`setDoc` would overwrite the entire document. We want to only add/update `name` and `phone` while keeping the existing `id`, `email`, `role`, and `createdAt` fields intact. `updateDoc` is a partial merge — it only touches the fields you specify.

**Firestore document result after this write:**

```javascript
// users/{userId} after commuter-setup completes:
{
  id: "abc123",
  email: "chris@example.com",
  role: "commuter",         // written by role-selection.tsx
  name: "Chris Kelamyan",   // NEW - written by commuter-setup.tsx
  phone: "+1 (555) 123-4567", // NEW - written by commuter-setup.tsx
  createdAt: Timestamp(...)
}
```

---

## Navigation Flow Change

### Current flow (broken - skips setup):

```
role-selection.tsx
  → updateUserRole(uid, 'commuter')
  → refreshRole()               ← this immediately sets role='commuter'
  → _layout.tsx detects role    ← triggers Redirect to /(commuter)
  → Commuter home               ← name and phone are never collected
```

### New flow (correct):

```
role-selection.tsx
  → updateUserRole(uid, 'commuter')
  → router.replace('/(auth)/commuter-setup')  ← NEW: navigate first, don't call refreshRole yet

commuter-setup.tsx
  → user fills name + phone → taps "Save & Continue"
  → updateUserProfile(uid, { name, phone })   ← writes to Firestore
  → setIsSaved(true)                          ← shows success screen
  → after 3s (or user taps "Continue to App")
  → refreshRole()                             ← NOW we trigger the redirect
  → _layout.tsx detects role='commuter'
  → Redirect to /(commuter)                  ← Commuter home, profile is complete
```

### Modification to `app/(auth)/role-selection.tsx`

The current `handleContinue` function calls `refreshRole()` after `updateUserRole`. Change the commuter path to navigate to `commuter-setup` instead:

**Current code (lines 29-37 in role-selection.tsx):**

```typescript
setLoading(true);
try {
  await updateUserRole(currentUser.uid, selectedRole);
  console.log('Role saved successfully!', selectedRole);
  await refreshRole();   // <-- removes this for commuter path
} catch (error: any) {
  setError(error.message);
} finally {
  setLoading(false);
}
```

**New code:**

```typescript
setLoading(true);
try {
  await updateUserRole(currentUser.uid, selectedRole);
  console.log('Role saved successfully!', selectedRole);

  if (selectedRole === 'commuter') {
    router.replace('/(auth)/commuter-setup' as any);
  } else {
    // Driver path: for now, still call refreshRole directly
    // TOW-75 will add a driver setup screen here later
    await refreshRole();
  }
} catch (error: any) {
  setError(error.message);
} finally {
  setLoading(false);
}
```

Note: You will need to add `import { useRouter } from 'expo-router';` and `const router = useRouter();` to `role-selection.tsx` since it does not currently use the router.

---

## Implementation Steps

Work through these steps in order. Each step has a clear goal and a way to verify it works before moving on.

---

### Step 1: Add `updateUserProfile` to `authService.ts`

**File**: `/Users/loris/TowLink/services/firebase/authService.ts`

**Action**: Add a new exported async function `updateUserProfile` after the existing `updateUserRole` function.

**Why first?** Because the screen will import this function. Getting the service layer right before building the UI is good architecture practice.

**What to do:**
1. Open `authService.ts`
2. Read the existing `updateUserRole` function carefully — understand how it uses `doc(db, 'users', userId)` and `updateDoc`
3. Write `updateUserProfile` using the same pattern, but writing `name` and `phone` instead of `role`

**Verify**: After writing the function, check that TypeScript does not show any errors on the file (no red squiggles in VS Code).

---

### Step 2: Create `app/(auth)/commuter-setup.tsx` — skeleton first

**File**: `/Users/loris/TowLink/app/(auth)/commuter-setup.tsx`

**Action**: Create the file with just a placeholder screen to verify routing works before adding any real UI.

**What to do**: Create the file with a minimal component that just renders a `View` with a `Text` saying "Commuter Setup". Don't worry about styling yet.

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

The reason to start with a skeleton is so you can wire up the navigation in Step 3 and test that the screen is reachable before spending time on UI.

---

### Step 3: Wire up navigation in `role-selection.tsx`

**File**: `/Users/loris/TowLink/app/(auth)/role-selection.tsx`

**Action**: Modify the `handleContinue` function so the commuter path navigates to `commuter-setup` instead of calling `refreshRole()`.

**What to do:**
1. Add `import { useRouter } from 'expo-router';` to the imports
2. Add `const router = useRouter();` inside the component (alongside the existing `const { refreshRole } = useAuth();`)
3. In `handleContinue`, replace `await refreshRole()` with the if/else shown in the "Navigation Flow Change" section above

**Verify**: On the simulator/device, go through the full flow: Onboarding → Signup → Role Selection → select Commuter → tap "Continue" → you should land on the placeholder "Commuter Setup" screen.

If it works, you know the routing is correct. Now you can safely build out the full UI.

---

### Step 4: Build the Form state UI

**File**: `/Users/loris/TowLink/app/(auth)/commuter-setup.tsx`

**Action**: Replace the placeholder with the full form screen.

**What to add (piece by piece):**

1. **Imports** — `useState`, `useEffect` from React; `View`, `Text`, `TextInput`, `Pressable`, `StyleSheet`, `ScrollView` from React Native; `SafeAreaView` from `react-native-safe-area-context`; `useAuth` from `@/context/auth-context`; `updateUserProfile` from `@/services/firebase/authService`

2. **State declarations** — `name`, `phone`, `error`, `loading`, `isSaved` (all described in the Component Structure section above)

3. **The `validateProfileForm` pure function** — defined OUTSIDE the component (above the `export default` line), matching the validation described in the Component Structure section

4. **The `handleSave` handler** — calls validation, then `updateUserProfile`, then sets `isSaved(true)` on success

5. **The JSX** — only the form state for now (don't add success state until Step 5):
   - `SafeAreaView` as outer container
   - `ScrollView` with padding to allow keyboard scrolling
   - Icon circle at top (car emoji centered in a light blue circle)
   - Heading and subtitle text
   - Two input groups (label + TextInput), one for name, one for phone
   - Error text below inputs (only rendered when `error !== ''`)
   - CTA button that calls `handleSave` and is disabled while `loading`

6. **StyleSheet** — create styles for all elements

**Learning note:** Notice how the form state is identical to patterns you've already seen in `signup.tsx` and `login.tsx` — `useState` for each field, a validation function, an async handler, an `error` state, a `loading` state, disabled button while loading. You've built this pattern before — apply it here.

**Verify**: Test the form. Try:
- Submitting empty fields — should show validation error
- Typing a name that's too short — should show error
- Typing an invalid phone number — should show error
- Typing valid name + phone — should call Firestore and show no crash (even before success state is built)

---

### Step 5: Build the Success state UI and auto-redirect

**File**: `/Users/loris/TowLink/app/(auth)/commuter-setup.tsx`

**Action**: Add the success state render and the `useEffect` timer for auto-redirect.

**What to add:**

1. **`handleContinue` function** — calls `refreshRole()` from auth context, which triggers the redirect

2. **`useEffect` for auto-redirect** — runs when `isSaved` changes to `true`, starts a 3-second `setTimeout`, calls `handleContinue` when it fires, returns cleanup function to cancel timer on unmount

3. **Conditional rendering** — wrap the existing form JSX and add the success JSX in a conditional:

```typescript
if (isSaved) {
  return (
    <SafeAreaView style={styles.container}>
      {/* success screen content */}
    </SafeAreaView>
  );
}

return (
  <SafeAreaView style={styles.container}>
    {/* form screen content */}
  </SafeAreaView>
);
```

4. **Success state content:**
   - Large green checkmark circle at the top (use `Ionicons` name `"checkmark-circle"` at size 80, color `"#22C55E"`, inside a circle View with `backgroundColor: '#DCFCE7'`)
   - "Welcome to TowLink!" bold heading
   - "Your account has been created successfully" subtitle
   - White card with 3 feature bullet rows. Each row is a horizontal flex with an icon on the left and text on the right:
     - `"checkmark"` icon + "Account Verified" (bold) + "Your email has been verified and your account is ready" (gray)
     - `"car"` icon (or car emoji `🚗`) + "Request Assistance Anytime" (bold) + "Get help whenever and wherever you need it" (gray)
     - `"flash"` icon + "Fast Response Times" (bold) + "Get connected to nearby drivers in seconds" (gray)
   - Blue "Continue to App" `Pressable` button that calls `handleContinue`
   - Small gray text: "Automatically redirecting in 3 seconds..."

**Verify**: Complete the form with valid data, tap "Save & Continue" — the success screen should appear. Wait 3 seconds — should auto-redirect to Commuter Home. Or tap "Continue to App" immediately — should redirect right away.

---

### Step 6: Manual test the full flow end-to-end

Run through the complete new user journey from scratch:

1. Clear app state (sign out if logged in, or use a fresh account)
2. Go through Onboarding → "Continue as Customer" → Signup with a NEW email
3. See Role Selection → select "Commuter" → tap "Continue"
4. **Should land on Commuter Setup screen** (not Commuter Home)
5. Try submitting with empty fields — error message appears
6. Fill in a valid name and phone number
7. Tap "Save & Continue"
8. **Should see the Success screen** ("Welcome to TowLink!" + feature bullets)
9. Wait 3 seconds OR tap "Continue to App"
10. **Should land on Commuter Home**
11. Open the Firebase Console → Firestore → `users` collection → find your user document
12. **Verify**: the document now has `name` and `phone` fields with the values you entered

---

## Edge Cases

1. **User is null when handleSave runs** - This shouldn't happen because this screen is only reachable after role-selection (which requires auth), but guard it anyway with `if (!user) { setError('Session expired...'); return; }`. The pattern is already shown in `role-selection.tsx`.

2. **User navigates back from commuter-setup** - The device back button could potentially take the user back to `role-selection.tsx`. Since we used `router.replace` (not `router.push`) when navigating to `commuter-setup`, there is no back history to return to. The `router.replace` call is critical here — verify you are using `replace` not `push`.

3. **Slow network / Firestore write fails** - The `loading` state disables the button during the write. If the write fails, the `catch` block sets `error` with the message from `updateUserProfile`. The user stays on the form and can retry.

4. **User force-kills the app during success screen before auto-redirect** - On re-launch, `auth-context.tsx` reads the Firestore document. Since `role` is already `'commuter'`, `_layout.tsx` redirects to `/(commuter)`. The name and phone were written before `isSaved` was set, so the profile data is not lost. The user skips the setup screen and goes straight to Commuter Home on re-launch. This is correct behavior.

5. **User force-kills app after role write but before profile write** - On re-launch, `_layout.tsx` redirects to `/(commuter)` (role is set). The user lands on Commuter Home with no name or phone — the profile write never happened. This is a known gap for MVP. Future sprint: check for missing `name` on the commuter home screen and prompt them to complete their profile.

6. **Phone number format** - The regex used (`/^[\+]?[\d\s\-\(\)]{7,15}$/`) is intentionally lenient. It accepts formats like `555-1234`, `(555) 123-4567`, `+1 555 123 4567`. Don't over-engineer this to be a perfect phone validator — the goal is to catch obviously wrong input (letters, empty, too short) while accepting common US/international formats.

7. **Keyboard overlaps inputs on small screens** - Wrapping the form in `ScrollView` with `keyboardShouldPersistTaps="handled"` allows the keyboard to dismiss when tapping outside the inputs, and allows the view to scroll when the keyboard appears.

---

## Testing Strategy

This story has no automated tests. Manual testing is the correct approach at this stage.

### Manual Testing Checklist

**Form Validation:**
- [ ] Submit with both fields empty → "Please fill in all fields." error appears
- [ ] Submit with only name filled → error appears
- [ ] Submit with only phone filled → error appears
- [ ] Submit with name that is 1 character → "Please enter your full name." error appears
- [ ] Submit with clearly invalid phone (e.g., "abc") → phone validation error appears
- [ ] Valid name + valid phone → no error, proceed to save

**Firestore Write:**
- [ ] After successful save, open Firebase Console → Firestore → `users` collection → find the test user → confirm `name` and `phone` fields are present and correct
- [ ] Confirm existing fields (`id`, `email`, `role`, `createdAt`) are NOT overwritten

**Navigation:**
- [ ] After role selection with "Commuter", lands on commuter-setup (not commuter home)
- [ ] After role selection with "Driver", goes directly to driver home (not commuter-setup) — driver path unchanged
- [ ] After successful save, success screen appears
- [ ] 3 seconds after success screen, redirects to Commuter Home
- [ ] Tapping "Continue to App" immediately redirects to Commuter Home
- [ ] Back button from commuter-setup does NOT go back to role-selection (because router.replace was used)

**Loading State:**
- [ ] While Firestore write is in progress, button shows "Saving..." (or disabled)
- [ ] Button cannot be double-tapped during loading

---

## Dependencies

### Already installed — no new packages needed

| Package | How it's used in this screen |
|---------|------------------------------|
| `firebase/firestore` | `updateDoc`, `doc` for Firestore write |
| `expo-router` | `useRouter`, `router.replace` for navigation |
| `react-native-safe-area-context` | `SafeAreaView` to handle notch/home indicator |
| `@expo/vector-icons` | `Ionicons` for checkmark and feature bullet icons |

### Prerequisite stories

This story depends on the following already being complete (they are):
- `types/models.ts` — `User` interface with `name?: string` and `phone?: string` fields already defined
- `services/firebase/authService.ts` — `updateUserRole()` write pattern to reference
- `app/(auth)/role-selection.tsx` — the screen that will navigate to this new screen
- `context/auth-context.tsx` — provides `user` and `refreshRole()` used in this screen

### This story blocks

- **TOW-75** — Driver Account Setup Screen. The same pattern will be applied to the driver path. That story cannot begin until this one is reviewed and merged.

---

## File Summary

```
MODIFY:
  /Users/loris/TowLink/services/firebase/authService.ts
    → Add updateUserProfile(userId, { name, phone }) function

  /Users/loris/TowLink/app/(auth)/role-selection.tsx
    → Change commuter path in handleContinue to use router.replace('/(auth)/commuter-setup')
    → Add useRouter import and const router = useRouter()

CREATE:
  /Users/loris/TowLink/app/(auth)/commuter-setup.tsx
    → Full screen with form state + success state
    → Imports: useAuth, updateUserProfile, Ionicons, SafeAreaView, ScrollView, etc.
    → State: name, phone, error, loading, isSaved
    → validateProfileForm() pure function
    → handleSave() async handler
    → handleContinue() calls refreshRole()
    → useEffect for 3-second auto-redirect
```

**Total new files**: 1
**Modified files**: 2

---

## Important Notes for Chris

### Understand the flow before coding

Before writing a single line, trace through the existing code:

1. Open `role-selection.tsx` and read `handleContinue` line by line
2. Open `auth-context.tsx` and understand what `refreshRole()` does — it reads Firestore and sets the `role` state
3. Open `_layout.tsx` and find where it checks `role === 'commuter'` and does a `<Redirect>` — THIS is why calling `refreshRole()` too early skips the setup screen

Once you understand WHY the current flow bypasses setup, the fix becomes obvious.

### Follow the existing patterns exactly

Every file you need to reference for patterns already exists in this codebase:

| Pattern | Where to look |
|---------|---------------|
| Form with validation | `app/(auth)/signup.tsx` |
| `updateDoc` Firestore write | `services/firebase/authService.ts` → `updateUserRole()` |
| `useAuth()` context hook | `app/(auth)/role-selection.tsx` (the auth layout one) |
| `router.replace` navigation | `app/(auth)/signup.tsx` → `handleSignup()` |
| `loading` + disabled button | `app/(auth)/role-selection.tsx` |

### The Figma "Create Account" screen is a reference, not a literal spec

The Figma "Create Account" design includes Email, Password, and Confirm Password fields — but those already exist in `signup.tsx`. Your `commuter-setup.tsx` only needs **Full Name** and **Phone Number**. Use the Figma's visual style (colors, card layout, rounded inputs) as your reference, but the field set is just those two.

### `router.replace` vs `router.push`

In Expo Router, `router.replace` removes the current screen from the navigation stack — the user CANNOT go back. `router.push` adds to the stack — the user CAN go back with the back button. Always use `router.replace` when transitioning between auth flow screens. You don't want a commuter to back-navigate from the setup screen to role-selection.
