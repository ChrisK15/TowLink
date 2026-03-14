# Technical Specification: TOW-75

## Story Reference

**Jira**: https://chriskelamyan115.atlassian.net/browse/TOW-75
**Title**: FE Sprint 3B – Driver Account Setup Screen
**Sprint**: TOW Sprint 4 (Mar 12–26, 2026)
**Points**: 3 | **Priority**: Medium | **Status**: To Do

The goal is to build the driver account setup screen that sits between signup and the driver home screen. New driver accounts currently land on the home screen with `"Unknown"` placeholder values in their `vehicleInfo` fields. This screen replaces those placeholders with real data entered by the driver.

The story also includes two smaller tasks: wiring `role-selection.tsx` to route drivers to this new screen instead of jumping straight to `signup.tsx`, and fixing the SignOut bug in `app/(driver)/index.tsx` that routes drivers to the commuter login screen instead of a driver login screen.

---

## Architecture Overview

This story touches three concerns:

1. **New screen** (`app/(auth)/driver-setup.tsx`) — a combined signup + vehicle info form. It mirrors `app/(auth)/commuter-setup.tsx` in structure but adds five vehicle fields and performs two Firestore writes on submit.
2. **Navigation routing fix** (`app/(auth)/onboarding/role-selection.tsx`) — the `handleDriver` function currently goes straight to `/(auth)/signup`. It needs to go to `/(auth)/driver-setup` instead.
3. **SignOut bug fix** (`app/(driver)/index.tsx` and `app/(auth)/onboarding/driver-login.tsx`) — after sign-out, drivers are redirected to the commuter login screen. The fix requires creating a driver login screen and updating the post-sign-out redirect.

There are no new Cloud Functions, no new Firestore collections, and no new TypeScript types required. All data shapes already exist in `types/models.ts`.

---

## Technical Requirements

### Frontend Components

**Files to create:**
- `app/(auth)/driver-setup.tsx` — the main new screen (signup form + vehicle fields + success state)
- `app/(auth)/onboarding/driver-login.tsx` — driver-specific login screen (mirrors `commuter-login.tsx` with driver branding)

**Files to modify:**
- `app/(auth)/onboarding/role-selection.tsx` — update `handleDriver` to navigate to `/(auth)/driver-setup` instead of `/(auth)/signup`
- `app/(driver)/index.tsx` — fix the SignOut button to navigate to the driver login screen after sign-out
- `app/(auth)/index.tsx` — update the fallback redirect so returning drivers land on a role-selection screen rather than commuter-login (see SignOut bug section below)

### State Management

The `driver-setup.tsx` screen manages all state locally with `useState`. No global state changes are needed. After a successful save, `refreshRole()` from `useAuth()` is called — this re-reads the `users/{uid}.role` field from Firestore and triggers the root layout to redirect the user to `/(driver)` automatically, exactly as the commuter setup screen does.

**State shape for `driver-setup.tsx`:**

```typescript
// Personal info (written to users/{uid})
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);

// Vehicle info (written to drivers/{uid})
const [vehicleMake, setVehicleMake] = useState('');
const [vehicleModel, setVehicleModel] = useState('');
const [vehicleYear, setVehicleYear] = useState('');
const [licensePlate, setLicensePlate] = useState('');
const [towingCapacity, setTowingCapacity] = useState('');

// UI state
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
const [isSaved, setIsSaved] = useState(false);
```

---

## Form Fields and Validation Rules

### Section 1 — Personal Info (same as commuter-setup)

| Field | Input Type | Placeholder | Validation Rule |
|---|---|---|---|
| Full Name | text | "Jane Smith" | Required. `trim().length >= 2` |
| Email Address | email | "you@example.com" | Required. Must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Phone Number | phone-pad | "+1 (555) 123-4567" | Required. Must match `/^[\+]?[\d\s\-\(\)]{7,15}$/` |
| Password | password (toggle eye) | "••••••••" | Required. `length >= 8` |
| Confirm Password | password (toggle eye) | "••••••••" | Required. Must equal Password field |
| Terms checkbox | Pressable toggle | — | Must be `true` |

### Section 2 — Vehicle Info (new, driver-only)

| Field | Input Type | Placeholder | Validation Rule |
|---|---|---|---|
| Vehicle Make | text | "Ford" | Required. `trim().length > 0` |
| Vehicle Model | text | "F-350" | Required. `trim().length > 0` |
| Vehicle Year | numeric | "2022" | Required. Must be a 4-digit number, parsed as integer. Range: 1990–2030 |
| License Plate | text, autoCapitalize="characters" | "ABC-1234" | Required. `trim().length > 0` |
| Towing Capacity | text | "e.g. 10,000 lbs" | Required. `trim().length > 0`. Stored as a string per `VehicleInfo` type |

### Validation Function Signature

```typescript
function validateDriverSetupForm(
  name: string,
  email: string,
  phone: string,
  password: string,
  confirmPassword: string,
  termsAccepted: boolean,
  vehicleMake: string,
  vehicleModel: string,
  vehicleYear: string,
  licensePlate: string,
  towingCapacity: string,
): string | null
```

Return `null` if valid, or a human-readable error string. Validate in this order: personal fields first (reuse the exact checks from `commuter-setup.tsx`), then vehicle fields. Show one error at a time via the inline `error` state, not an Alert.

---

## Firestore Write Operations

The `handleCreateAccount` handler performs three sequential async operations. The order matters.

### Write 1 — Firebase Auth + users document (via authService)

```typescript
const { userId } = await signUpWithEmail(email.trim(), password);
```

`signUpWithEmail` in `services/firebase/authService.ts` creates the Firebase Auth user AND the `users/{uid}` Firestore document with `role: null` in one call. No changes needed to this function.

### Write 2 — Set role and profile on users/{uid}

```typescript
await updateUserRole(userId, 'driver');
await updateUserProfile(userId, { name: name.trim(), phone: phone.trim() });
```

`updateUserRole` and `updateUserProfile` already exist in `authService.ts`. No changes needed. This sets `users/{uid}.role = 'driver'` and `users/{uid}.name`, `users/{uid}.phone`.

### Write 3 — Create drivers/{uid} document

This is the new write that doesn't exist anywhere in the auth flow yet. It must be called after Write 2.

```typescript
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

await setDoc(doc(db, 'drivers', userId), {
  userId: userId,
  isAvailable: false,
  isVerified: false,
  isActivelyDriving: false,
  vehicleInfo: {
    make: vehicleMake.trim(),
    model: vehicleModel.trim(),
    year: parseInt(vehicleYear.trim(), 10),
    licensePlate: licensePlate.trim().toUpperCase(),
    towingCapacity: towingCapacity.trim(),
  },
  currentLocation: { latitude: 0, longitude: 0 },
  serviceRadius: 10,
  totalTrips: 0,
  createdAt: Timestamp.now(),
});
```

**Important**: Use `setDoc` (not `updateDoc`) because this document doesn't exist yet. Use `Timestamp.now()` here to match the pattern already used in `initializeDriverDocument()` in `app/(driver)/index.tsx`. The `initializeDriverDocument()` function in `app/(driver)/index.tsx` checks `if (!driverSnap.exists())` before creating — since this setup screen now creates the document, the existing guard in `initializeDriverDocument` will simply no-op when the driver first lands on the home screen. No changes needed to that function.

### Firestore Document Structure After Submit

**`users/{uid}`:**
```javascript
{
  id: uid,
  email: "driver@example.com",
  role: "driver",
  name: "Jane Smith",
  phone: "+15551234567",
  createdAt: Timestamp
}
```

**`drivers/{uid}`:**
```javascript
{
  userId: uid,
  isAvailable: false,
  isVerified: false,
  isActivelyDriving: false,
  vehicleInfo: {
    make: "Ford",
    model: "F-350",
    year: 2022,
    licensePlate: "ABC-1234",
    towingCapacity: "10,000 lbs"
  },
  currentLocation: { latitude: 0, longitude: 0 },
  serviceRadius: 10,
  totalTrips: 0,
  createdAt: Timestamp
}
```

---

## Navigation Flow Changes

### Current (broken) driver path:
```
Onboarding slides -> Role Selection -> signup.tsx -> (role is null, no redirect) -> stuck
```

### Target driver path:
```
Onboarding slides -> Role Selection -> driver-setup.tsx -> [on save] refreshRole() -> /(driver)
```

### Change 1 — `role-selection.tsx`

Update `handleDriver` to navigate to the driver setup screen instead of signup:

```typescript
// BEFORE
const handleDriver = async () => {
  await AsyncStorage.setItem('onboarding_complete', 'true');
  router.replace('/(auth)/signup');
};

// AFTER
const handleDriver = async () => {
  await AsyncStorage.setItem('onboarding_complete', 'true');
  router.replace('/(auth)/driver-setup' as any);
};
```

### Change 2 — Post-save navigation in `driver-setup.tsx`

After all three writes succeed, set `isSaved = true` and show the success state. Then after 3 seconds (or immediately on button press), call `refreshRole()`. The root `_layout.tsx` will detect `role === 'driver'` and automatically redirect to `/(driver)`. This is identical to the pattern in `commuter-setup.tsx`.

---

## The SignOut Bug Fix

### Root Cause

In `app/(driver)/index.tsx`, when the driver taps Sign Out, `signOut()` from `useAuth()` is called. This clears `user` in the auth context, which causes `app/_layout.tsx` to execute `<Redirect href="/(auth)" />`. That hits `app/(auth)/index.tsx`, which checks `AsyncStorage` for `onboarding_complete`. Since it was set to `'true'` when the driver first went through onboarding, it redirects to `/(auth)/onboarding/commuter-login` — the commuter login screen.

### Fix

There is currently no driver-specific login screen in the codebase. The correct fix is:

**Step A** — Create `app/(auth)/onboarding/driver-login.tsx`. This screen is a near-identical copy of `app/(auth)/onboarding/commuter-login.tsx` with two differences:
  - The header title reads "Driver Login" instead of "Commuter Login"
  - The icon and subtitle copy references drivers (e.g., "Sign in to start earning")
  - The back button uses `router.replace('/(auth)/onboarding/role-selection' as any)`
  - The "Create Account" link goes to `/(auth)/driver-setup` instead of `/(auth)/commuter-setup`

**Step B** — The sign-out flow itself does not need to change in `driver/index.tsx`. The fix happens upstream: after sign-out, the app redirects to `/(auth)/index.tsx`, which should route to a screen where the driver can choose to log back in. The cleanest solution that does not break the commuter path is to redirect to `/(auth)/onboarding/role-selection` instead of `/(auth)/onboarding/commuter-login` when `onboarding_complete` is true. This lets both returning commuters and returning drivers choose where to go.

Update `app/(auth)/index.tsx`:
```typescript
// BEFORE
if (onboardingComplete) {
  return <Redirect href="/(auth)/onboarding/commuter-login" />;
}

// AFTER
if (onboardingComplete) {
  return <Redirect href={'/(auth)/onboarding/role-selection' as any} />;
}
```

This routes returning users (both commuter and driver) back to role-selection after sign-out, where they can navigate to the correct login screen. This is a better UX for a dual-role app and does not break any existing commuter flows.

---

## Implementation Steps

### Step 1 — Create the SignOut redirect fix in `/(auth)/index.tsx`

**File**: `/Users/loris/TowLink/app/(auth)/index.tsx`
**Action**: Change the `onboardingComplete` redirect from `commuter-login` to `role-selection`. This is a one-line change.

This step is done first so the SignOut bug is fixed independently and can be verified before the new screen exists.

### Step 2 — Create `driver-login.tsx`

**File**: `/Users/loris/TowLink/app/(auth)/onboarding/driver-login.tsx`
**Action**: Duplicate `commuter-login.tsx`. Change the header title, subtitle, icon text, and the "Create Account" link destination. Change the back button destination to `role-selection`. No logic changes — authentication is the same for both roles.

### Step 3 — Update `role-selection.tsx` routing

**File**: `/Users/loris/TowLink/app/(auth)/onboarding/role-selection.tsx`
**Action**: In `handleDriver`, change `router.replace('/(auth)/signup')` to `router.replace('/(auth)/driver-setup' as any)`. This is a one-line change.

### Step 4 — Create `driver-setup.tsx` — validation function

**File**: `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`
**Action**: Create the file. Start with the validation function only. Model it on the `validateCreateAccountForm` function in `commuter-setup.tsx` and extend it to check all five vehicle fields. Test the logic in isolation before wiring up the UI.

### Step 5 — Build the `driver-setup.tsx` form UI

**File**: `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`
**Action**: Build the form-state render path (the non-success view). Structure:
- `SafeAreaView` container with white background
- Header row: back arrow (`router.back()`), centered title "Driver Setup", moon icon placeholder
- `KeyboardAvoidingView` wrapping a `ScrollView`
- Truck icon circle (use Ionicons `"truck"` or `"car-sport"` — whichever is available)
- Heading "Join as a Driver" and subtitle
- Section label "Personal Information" — then the 5 personal fields (Full Name, Email, Phone, Password, Confirm Password) with the same pill-shaped input style as `commuter-setup.tsx` (`borderRadius: 30`, `borderColor: '#D1D5DB'`)
- Section label "Vehicle Information" — then the 5 vehicle fields in the same input style
- Terms checkbox row (same as `commuter-setup.tsx`)
- Inline error text block in red if `error` is not empty
- Primary CTA button "Create Driver Account" / "Creating Account..." when loading

### Step 6 — Wire up the `handleCreateAccount` handler

**File**: `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`
**Action**: Implement the three-write sequence (described in the Firestore section above). Use `try/catch/finally` with `setLoading`. On success, set `isSaved = true`. On error, call `setError(err.message)`.

Imports needed for this step:
```typescript
import { useAuth } from '@/context/auth-context';
import { signUpWithEmail, updateUserProfile, updateUserRole } from '@/services/firebase/authService';
import { db } from '@/services/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
```

### Step 7 — Build the success state UI

**File**: `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`
**Action**: Mirror the success state in `commuter-setup.tsx`. Show a green checkmark circle, "Welcome, Driver!" heading, a card with three bullet points relevant to driving (e.g., "Ready to Accept Jobs", "Earn on Your Schedule", "Real-Time Requests"). Include a `useEffect` that auto-calls `handleContinue()` after 3 seconds. `handleContinue` calls `await refreshRole()` which triggers the root layout redirect.

Change the bullet point copy to be driver-focused rather than commuter-focused:
- "Account Created" — "Your driver account is ready"
- "Accept Jobs" — "Start receiving tow requests in your area"
- "Earn Money" — "Set your own schedule and go online anytime"

### Step 8 — Manual test of the full flow

Test this sequence end-to-end in the simulator:
1. Launch fresh (clear AsyncStorage if needed)
2. Go through onboarding slides
3. Tap "Continue as Driver" on role selection
4. Verify you land on `driver-setup.tsx` (not the old `signup.tsx`)
5. Submit with empty fields — verify error messages appear
6. Submit with invalid year (e.g., "abc") — verify validation catches it
7. Fill all fields correctly and submit
8. Verify success screen appears
9. Verify auto-redirect to `/(driver)` home screen after 3 seconds
10. Open Firestore console: confirm `users/{uid}` has `role: "driver"`, `name`, `phone`
11. Open Firestore console: confirm `drivers/{uid}` has correct `vehicleInfo` (no "Unknown" values)
12. Sign out from the driver home screen
13. Verify you land on `role-selection.tsx` (not commuter login)

---

## Edge Cases

1. **Year field non-numeric input** — `parseInt('abc', 10)` returns `NaN`. The validation function must check `isNaN(parseInt(vehicleYear, 10))` and return an error before submitting. Also check the range is within 1990–2030.

2. **`setDoc` vs `updateDoc` for drivers document** — `updateDoc` would throw if the document doesn't exist. Use `setDoc` here since the drivers document is guaranteed not to exist at this point in the flow.

3. **Driver home screen `initializeDriverDocument()` guard** — After this screen runs, `drivers/{uid}` already exists. The guard `if (!driverSnap.exists())` in `driver/index.tsx` will correctly skip re-initialization. No change needed there.

4. **Email already in use** — `signUpWithEmail` throws a `FirebaseError` with `auth/email-already-in-use`. The catch block in `handleCreateAccount` will catch it and the thrown `Error` from `authService.ts` has a human-readable message already: "This email is already registered." Display it via `setError`.

5. **Partial write failure** — If Write 1 succeeds but Write 2 or 3 fails, the Firebase Auth user and the `users/{uid}` document with `role: null` exist, but the driver document is not created. The user is stuck with no role. For this sprint, wrap all three writes in a single `try` block so any failure shows an error and the user can retry. A full rollback transaction is out of scope.

6. **Keyboard obscuring vehicle fields** — The `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` and `keyboardShouldPersistTaps="handled"` on the `ScrollView` handles this, same as the commuter screen. The vehicle fields are at the bottom so this is especially important to test.

7. **License plate casing** — Apply `.toUpperCase()` before writing to Firestore so plates are stored consistently regardless of how the driver types them.

---

## Testing Strategy

**Manual (required for this story):**
- Full happy path from onboarding to driver home screen (Step 8 above)
- Validation errors: each field individually blank, invalid email, short password, password mismatch, non-numeric year, year out of range
- Sign-out redirect: sign out, confirm landing on role-selection, not commuter-login
- Firestore data integrity: inspect both `users/{uid}` and `drivers/{uid}` documents in Firebase console after a successful signup

**TypeScript (zero tolerance):**
- Run `npx tsc --noEmit` after implementation. No new TypeScript errors allowed.
- The `year` field in `VehicleInfo` is typed as `number`. Ensure `parseInt` result is passed, not the raw string.
- The `towingCapacity` field in `VehicleInfo` is typed as `string`. Pass the string directly.

---

## Dependencies

- TOW-74 (Commuter Account Setup) is Done — the commuter-setup screen is the direct template for this screen. Read it thoroughly before starting.
- `signUpWithEmail`, `updateUserRole`, and `updateUserProfile` in `services/firebase/authService.ts` are all available and tested. No changes to this file are required.
- `VehicleInfo` interface in `types/models.ts` matches exactly what needs to be stored. No type changes needed.
- No new npm packages required.

---

## Acceptance Criteria Checklist

- [ ] `app/(auth)/driver-setup.tsx` created
- [ ] Form contains all 5 personal fields and all 5 vehicle fields
- [ ] Validation function catches all invalid inputs and surfaces inline error messages
- [ ] On submit, Write 1 creates Firebase Auth user + `users/{uid}` document
- [ ] On submit, Write 2 sets `role: 'driver'`, `name`, and `phone` on `users/{uid}`
- [ ] On submit, Write 3 creates `drivers/{uid}` with correct `vehicleInfo` (no "Unknown" values)
- [ ] Success state renders after save, auto-redirects to `/(driver)` after 3 seconds
- [ ] `app/(auth)/onboarding/role-selection.tsx` updated: "Continue as Driver" now navigates to `driver-setup`, not `signup`
- [ ] `app/(auth)/onboarding/driver-login.tsx` created with driver-appropriate copy and correct back/create-account links
- [ ] `app/(auth)/index.tsx` updated: returning users redirect to `role-selection`, not `commuter-login`
- [ ] SignOut in `app/(driver)/index.tsx` results in landing on `role-selection` (not commuter login)
- [ ] `npx tsc --noEmit` passes with zero new errors
- [ ] No console errors during the full sign-up flow
- [ ] Firestore data verified in Firebase console after a real signup
