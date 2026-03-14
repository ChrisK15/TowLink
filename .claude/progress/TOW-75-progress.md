# Implementation Progress: TOW-75

## Story Summary

Build the Driver Account Setup screen (`app/(auth)/driver-setup.tsx`), wire it into the onboarding flow via `role-selection.tsx`, create a driver-specific login screen, and fix the post-sign-out redirect bug so drivers do not land on the commuter login screen.

This story has four distinct pieces of work. Complete them in order — each step is independently verifiable in the simulator before moving on.

---

## Completed Steps

(none yet)

---

## Current Step

- [ ] Step 1: Fix the sign-out redirect bug in `app/(auth)/index.tsx`

---

## Remaining Steps

- [ ] Step 2: Create `app/(auth)/onboarding/driver-login.tsx`
- [ ] Step 3: Update `role-selection.tsx` to route drivers to `driver-setup`
- [ ] Step 4: Create `app/(auth)/driver-setup.tsx` — validation function only
- [ ] Step 5: Build the form UI in `driver-setup.tsx`
- [ ] Step 6: Wire up `handleCreateAccount` in `driver-setup.tsx`
- [ ] Step 7: Build the success state UI in `driver-setup.tsx`
- [ ] Step 8: Manual end-to-end test + TypeScript check

---

## Step-by-Step Lesson Plan

---

### Step 1 — Fix the sign-out redirect bug

**File to edit:** `/Users/loris/TowLink/app/(auth)/index.tsx`

**What is happening now:**
When a driver signs out, Firebase clears the auth session, the root layout redirects to `/(auth)`, and `index.tsx` checks AsyncStorage for `onboarding_complete`. Since the driver already went through onboarding, that key is `'true'`, so the app redirects to `commuter-login` — the wrong screen.

**What to change:**
Find the block on line 33:
```typescript
if (onboardingComplete) {
  return <Redirect href="/(auth)/onboarding/commuter-login" />;
}
```
Change the redirect destination from `commuter-login` to `role-selection`:
```typescript
if (onboardingComplete) {
  return <Redirect href={'/(auth)/onboarding/role-selection' as any} />;
}
```

**Why this fixes it:** Both commuters and drivers will land on the role-selection screen after sign-out. From there, each can tap their correct login path. This is better UX for a dual-role app regardless of which role signs out.

**Before moving on, verify:**
- The file saves without TypeScript errors
- You understand why this one-line change is the correct fix (and not a change inside `driver/index.tsx`)

---

### Step 2 — Create the driver login screen

**File to create:** `/Users/loris/TowLink/app/(auth)/onboarding/driver-login.tsx`

**What this screen is:**
A near-identical copy of `commuter-login.tsx` with driver-appropriate copy. The login logic is exactly the same — `signInWithEmail` works for both roles, and the root layout handles the redirect to the correct home screen based on `role` after sign-in.

**How to approach it:**
1. Open `/Users/loris/TowLink/app/(auth)/onboarding/commuter-login.tsx` as your reference.
2. Create the new file and copy the structure across.
3. Make these specific changes — do not change anything else:

| Location in file | Commuter version | Driver version |
|---|---|---|
| `headerTitle` text | `"Commuter Login"` | `"Driver Login"` |
| Icon emoji | `"🚗"` | `"🚛"` |
| Heading text | `"Welcome Back"` | `"Welcome Back, Driver"` |
| Subtitle text | `"Sign in to request roadside assistance"` | `"Sign in to start earning"` |
| Back button destination | `role-selection` (already correct) | `role-selection` (same) |
| Create Account `onPress` | `/(auth)/commuter-setup` | `/(auth)/driver-setup` |

The `handleSignIn` function, all state variables, all styles, the keyboard-avoiding view, the Google/Apple social buttons — all stay identical. Copy them verbatim.

**Before moving on, verify:**
- The file is saved at the correct path: `app/(auth)/onboarding/driver-login.tsx`
- You can navigate to it manually in the simulator by temporarily changing a redirect to point to it, then reverting
- The header says "Driver Login" and the Create Account link goes to `driver-setup`

---

### Step 3 — Update role-selection to route drivers correctly

**File to edit:** `/Users/loris/TowLink/app/(auth)/onboarding/role-selection.tsx`

**What to change:**
Find `handleDriver` on line 16. The current destination is `/(auth)/signup`, which is wrong — that screen has no driver-specific vehicle fields. Change the single `router.replace` call:

```typescript
// BEFORE
router.replace('/(auth)/signup');

// AFTER
router.replace('/(auth)/driver-setup' as any);
```

The `as any` cast is needed because the TypeScript router type definitions are generated from existing files. Since `driver-setup.tsx` does not exist yet, the type system does not know about this route. Once Step 4 creates that file, the cast may not be strictly necessary (but keeping it is harmless).

**Before moving on, verify:**
- Tap "Continue as Driver" in the simulator
- The app should try to navigate to `driver-setup` — it will likely show a 404 / unmatched route screen since the file does not exist yet. That is the expected result at this stage. It confirms the routing change works.

---

### Step 4 — Create `driver-setup.tsx` with the validation function

**File to create:** `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`

**Goal of this step:** Get the validation logic right in isolation before building any UI. A validation function is pure logic — no components, no Firestore, no imports needed. You can reason about it and test it mentally before wiring it up.

**What to write:**
Create the file with just the validation function. The signature is:
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

The function returns `null` if everything is valid, or a human-readable error string if something is wrong. Show one error at a time — the first failing check wins.

**Validation order to follow:**
1. Copy the personal field checks verbatim from `commuter-setup.tsx` — the `validateCreateAccountForm` function there already handles name, email, phone, password, confirm password, and terms. Paste those checks at the top of your new function.
2. After the personal checks pass, add vehicle checks in this order:
   - `vehicleMake.trim().length === 0` → return `'Vehicle make is required.'`
   - `vehicleModel.trim().length === 0` → return `'Vehicle model is required.'`
   - `vehicleYear.trim().length === 0` → return `'Vehicle year is required.'`
   - `isNaN(parseInt(vehicleYear.trim(), 10))` → return `'Vehicle year must be a number.'`
   - year out of range (< 1990 or > 2030) → return `'Vehicle year must be between 1990 and 2030.'`
   - `licensePlate.trim().length === 0` → return `'License plate is required.'`
   - `towingCapacity.trim().length === 0` → return `'Towing capacity is required.'`
3. If all checks pass, return `null`.

**Key thing to get right:** The year field is typed as `string` in your state (because TextInput values are always strings), but the `VehicleInfo` type expects `year` as a `number`. The conversion happens in the Firestore write step (`parseInt`), not in validation. Validation just needs to confirm the string represents a valid number in the right range.

**Before moving on, verify:**
- The function is syntactically correct (no red squiggles)
- Walk through the logic mentally: what happens if `vehicleYear` is `"abc"`? What if it's `"1850"`? What if it's empty?
- Add a minimal default export so Expo Router does not crash when navigating to this route:
  ```typescript
  export default function DriverSetupScreen() {
    return null;
  }
  ```
  After adding this, go back to the simulator and confirm that tapping "Continue as Driver" no longer shows a 404 — it should show a blank white screen.

---

### Step 5 — Build the form UI

**File to edit:** `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`

**What to build:** Replace the placeholder `return null` with the full form UI. This step is UI only — no handler logic yet. Use `commuter-setup.tsx` as your line-by-line reference.

**Structure to follow:**

```
SafeAreaView (white background)
  View (header row)
    Pressable (back arrow → router.back())
    Text ("Driver Setup")
    View (moon icon placeholder)
  KeyboardAvoidingView
    ScrollView (keyboardShouldPersistTaps="handled")
      View (icon circle — use emoji "🚛" or truck icon)
      Text ("Join as a Driver")       ← heading
      Text ("Set up your account...") ← subtitle

      Text ("Personal Information")   ← section label
      [5 personal fields — copy exactly from commuter-setup.tsx]
        Full Name
        Email Address
        Phone Number
        Password (with eye toggle)
        Confirm Password (with eye toggle)

      Text ("Vehicle Information")    ← section label (new)
      [5 vehicle fields]
        Vehicle Make (autoCapitalize="words")
        Vehicle Model (autoCapitalize="words")
        Vehicle Year (keyboardType="numeric")
        License Plate (autoCapitalize="characters")
        Towing Capacity (placeholder="e.g. 10,000 lbs")

      Pressable (terms checkbox row — copy from commuter-setup.tsx)

      {error ? <Text style={errorText}>{error}</Text> : null}

      Pressable (CTA button — "Create Driver Account" / "Creating Account...")
```

**Section label style:** You will need a small new style for the "Personal Information" and "Vehicle Information" labels. Keep it simple:
```typescript
sectionLabel: {
  fontSize: 13,
  fontWeight: '700',
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  width: '100%',
  marginTop: 8,
  marginBottom: 12,
},
```

**State to declare at the top of the component** (before the return):
```typescript
const { refreshRole } = useAuth();
const router = useRouter();

// Personal info
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);

// Vehicle info
const [vehicleMake, setVehicleMake] = useState('');
const [vehicleModel, setVehicleModel] = useState('');
const [vehicleYear, setVehicleYear] = useState('');
const [licensePlate, setLicensePlate] = useState('');
const [towingCapacity, setTowingCapacity] = useState('');

// UI state
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
const [isSaved, setIsSaved] = useState(false);

const clearError = () => setError('');
```

**Styles to copy directly from commuter-setup.tsx** (they are identical — no need to reinvent):
`container`, `header`, `headerBack`, `headerTitle`, `headerRight`, `formContent`, `iconCircle`, `iconEmoji`, `heading`, `subtitle`, `highlightText`, `formGroup`, `label`, `input`, `passwordContainer`, `passwordInput`, `eyeButton`, `termsRow`, `checkbox`, `checkboxChecked`, `termsText`, `errorText`, `button`, `buttonDisabled`, `buttonText`

**Before moving on, verify:**
- The form renders in the simulator (tap "Continue as Driver" from role-selection)
- Both sections are visible when you scroll
- The keyboard pushes content up correctly when you tap a vehicle field at the bottom
- No TypeScript errors shown in the editor

---

### Step 6 — Wire up `handleCreateAccount`

**File to edit:** `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`

**What to write:** The async function that runs when the CTA button is pressed. Add it before the return statement in your component.

**Imports you will need at the top of the file** (add these to your existing imports):
```typescript
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { signUpWithEmail, updateUserProfile, updateUserRole } from '@/services/firebase/authService';
```

**The three-write sequence:**

```
1. signUpWithEmail(email, password)
   → creates Firebase Auth user AND users/{uid} with role: null

2. updateUserRole(userId, 'driver')
   updateUserProfile(userId, { name: name.trim(), phone: phone.trim() })
   → sets role + name + phone on users/{uid}

3. setDoc(doc(db, 'drivers', userId), { ... })
   → creates the drivers/{uid} document with vehicleInfo
```

**Structure of the handler:**
```typescript
const handleCreateAccount = async () => {
  const validationError = validateDriverSetupForm(
    name, email, phone, password, confirmPassword, termsAccepted,
    vehicleMake, vehicleModel, vehicleYear, licensePlate, towingCapacity,
  );
  if (validationError) {
    setError(validationError);
    return;
  }
  setLoading(true);
  setError('');
  try {
    // Write 1
    const { userId } = await signUpWithEmail(email.trim(), password);

    // Write 2
    await updateUserRole(userId, 'driver');
    await updateUserProfile(userId, { name: name.trim(), phone: phone.trim() });

    // Write 3 — drivers/{uid}
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

    setIsSaved(true);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**Key things to get right:**
- Use `setDoc` (not `updateDoc`) — the drivers document does not exist yet.
- `year` must be `parseInt(vehicleYear.trim(), 10)` — the `VehicleInfo` type requires a `number`, not a string.
- `licensePlate` must be `.toUpperCase()` for consistent storage.
- Wire the button: `onPress={handleCreateAccount}` and `disabled={loading}`.

**Before moving on, verify:**
- Fill out all fields and tap "Create Driver Account"
- Watch for errors in the terminal / Metro logs
- Check Firebase Console: `users/{uid}` should have `role: 'driver'`, `name`, `phone`
- Check Firebase Console: `drivers/{uid}` should exist with `vehicleInfo` — no "Unknown" values
- Try submitting with an empty field — the inline error message should appear

---

### Step 7 — Build the success state UI

**File to edit:** `/Users/loris/TowLink/app/(auth)/driver-setup.tsx`

**What to add:** Two things — a `useEffect` and the success state JSX rendered when `isSaved` is `true`.

**Where to add the useEffect** (above the `if (isSaved)` return, inside the component):
```typescript
const handleContinue = async () => {
  await refreshRole();
};

useEffect(() => {
  if (!isSaved) return;
  const timer = setTimeout(() => {
    handleContinue();
  }, 3000);
  return () => clearTimeout(timer);
}, [isSaved]);
```

**How `refreshRole()` works:** It re-reads `users/{uid}.role` from Firestore and updates the auth context. The root `_layout.tsx` watches that role value and, when it becomes `'driver'`, automatically redirects the user to `/(driver)`. You do not need to call `router.push` manually — the redirect happens for you.

**The success state JSX** (add this block just before the form state return, guarded by `if (isSaved)`):

Mirror the structure from `commuter-setup.tsx` lines 97-166. Make these driver-specific copy changes:

| Commuter copy | Driver copy |
|---|---|
| "Welcome to TowLink!" | "Welcome, Driver!" |
| "Your account has been created successfully" | "Your driver account is ready" |
| Bullet 1: "Account Verified / Your email has been verified..." | "Account Created / Your driver profile is set up and ready" |
| Bullet 2: "Request Assistance Anytime / Get help whenever..." | "Accept Jobs / Start receiving tow requests in your area" |
| Bullet 3: "Fast Response Times / Get connected to nearby drivers..." | "Earn Money / Set your own schedule and go online anytime" |
| Bullet 2 emoji: 🚗 | 🚛 |
| Bullet 3 emoji: ⚡ | 💰 |
| CTA button: "Continue to App" | "Continue to Dashboard" |

**Styles to copy from commuter-setup.tsx:**
`successContent`, `successIconCircle`, `successHeading`, `successSubtitle`, `card`, `bulletRow`, `bulletRowLast`, `bulletIconCircle`, `bulletEmoji`, `bulletText`, `bulletTitle`, `bulletDescription`, `redirectText`

**Before moving on, verify:**
- Submit a valid form and watch the success screen appear
- Wait 3 seconds — confirm the app auto-redirects to the driver home screen
- Confirm no console errors during this flow
- Check that the "Continue to Dashboard" button also works when pressed manually (before the timer fires)

---

### Step 8 — Manual end-to-end test + TypeScript check

**What to test:**

Run `npx tsc --noEmit` from the project root first. Fix any TypeScript errors before doing manual testing.

Then test these scenarios in the simulator:

**Happy path (full flow):**
1. Clear AsyncStorage (or reinstall the app) to start fresh
2. Go through onboarding slides
3. Tap "Continue as Driver" on role selection → should land on `driver-setup.tsx`
4. Fill all fields with valid data and submit
5. Success screen appears with "Welcome, Driver!"
6. After 3 seconds, auto-redirects to driver home screen `/(driver)`
7. Open Firebase Console and confirm:
   - `users/{uid}`: `role: "driver"`, `name` and `phone` are set
   - `drivers/{uid}`: `vehicleInfo` has real values (make, model, year as number, licensePlate uppercase, towingCapacity)

**Sign-out flow:**
8. From the driver home screen, tap Sign Out
9. Confirm you land on `role-selection` (not commuter login)
10. Tap "Continue as Driver" → confirm driver-login screen appears with "Driver Login" header
11. Tap back → confirm you return to role-selection

**Validation errors (test each individually):**
12. Submit with all fields empty → "All fields are required."
13. Submit with invalid email → "Please enter a valid email address."
14. Submit with password shorter than 8 characters → "Password must be at least 8 characters."
15. Submit with mismatched passwords → "Passwords do not match."
16. Submit without checking terms → "Please accept the Terms of Service to continue."
17. Submit with valid personal info but empty vehicle make → "Vehicle make is required."
18. Submit with `vehicleYear` = "abc" → "Vehicle year must be a number."
19. Submit with `vehicleYear` = "1850" → "Vehicle year must be between 1990 and 2030."

**Before marking complete:**
- All scenarios above pass
- `npx tsc --noEmit` outputs zero errors
- No red warnings in the Metro terminal during any of the above test cases

---

## Notes

- The `driver-setup.tsx` screen lives at `app/(auth)/driver-setup.tsx`, NOT inside the `onboarding/` subfolder. The commuter equivalent is at the same level (`app/(auth)/commuter-setup.tsx`). Check the path carefully before creating the file.
- The `as any` cast on router paths is a known pattern in this codebase for routes that are not yet reflected in the generated type definitions. It is intentional, not a bug.
- `initializeDriverDocument()` in `app/(driver)/index.tsx` uses `if (!driverSnap.exists())` as a guard. After this story is complete, that guard will always no-op for new drivers (because `driver-setup.tsx` creates the document first). The function does not need to be changed.
- Do not use `updateDoc` for the drivers document write in Step 6. `updateDoc` throws if the document does not exist. Use `setDoc`.
