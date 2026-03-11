# Code Review: TOW-74
# FE Sprint 3A - Commuter Account Setup Screen

Reviewed: 2026-03-01
Reviewer: quality-reviewer agent

---

## Acceptance Criteria Verification

- [x] Screen layout matches Figma design intent (form + success states) - PASSED WITH NOTES
- [ ] Form validation — name and phone fields validated before save - FAILED
- [ ] Save to Firestore — writes `name` and `phone` to the authenticated user's Firestore document via `updateUserProfile` - FAILED (partial)
- [x] Navigation — on successful save, navigates to Commuter Home (via `refreshRole()`) - PASSED
- [x] Wired into existing flow — `role-selection.tsx` navigates commuter path to this screen (not calling `refreshRole()` immediately) - PASSED
- [x] No TypeScript errors - PASSED
- [x] No console errors during normal use - PASSED (no diagnostic errors)

---

## Summary of What Was Built vs. What Was Specified

The implementation diverges substantially from the spec. The screen that was built is a **full account creation screen** (name + email + password + confirm password + terms checkbox) rather than a **profile completion screen** (name + phone only) that collects information for an already-authenticated user. This is a fundamental scope mismatch.

The spec for TOW-74 states: "What the screen collects: Full Name (maps to User.name), Phone Number (maps to User.phone)." The built screen collects six fields and calls `signUpWithEmail` — creating a brand-new Firebase Auth account — rather than calling `updateUserProfile` on an already-authenticated user.

---

## Code Quality Assessment

### Strengths

- `updateUserProfile` in `authService.ts` is correctly implemented. It uses `updateDoc` (not `setDoc`), follows the exact same pattern as `updateUserRole`, and throws a user-friendly error on failure. This file is correct and well-structured.
- `role-selection.tsx` change is correct. The commuter path now calls `router.replace('/(auth)/commuter-setup' as any)` instead of `refreshRole()`. The driver path is preserved. `useRouter` was already present in the file. `router.replace` (not `router.push`) is used, which correctly disables back navigation.
- Success state UI matches Figma intent closely. The green checkmark circle, "Welcome to TowLink!" heading, three feature bullets, "Continue to App" button, and "Automatically redirecting in 3 seconds..." text are all present.
- `useEffect` auto-redirect is correctly structured. It guards on `!isSaved`, starts a 3000ms timer, and returns `clearTimeout(timer)` as the cleanup function.
- `handleContinue` correctly calls `refreshRole()` which triggers the `_layout.tsx` redirect to `/(commuter)`.
- No TypeScript errors on any of the three modified/created files.
- `KeyboardAvoidingView` with platform-specific behavior is a good addition beyond the spec.

### Critical Issues

**Issue 1: Wrong screen purpose — this is a signup screen, not a profile-completion screen.**

The spec describes `commuter-setup.tsx` as a screen reached AFTER Firebase Auth signup has already happened (via `signup.tsx` or the new `commuter-login.tsx`). The user already has a Firebase Auth account and a Firestore document when they arrive here. The screen's only job is to add `name` and `phone` to the existing document.

The actual implementation instead:
- Shows six form fields: Full Name, Email, Password, Confirm Password, Terms checkbox, Phone
- Calls `signUpWithEmail(email, password)` — which creates a NEW Firebase Auth user account
- Then calls `updateUserRole(userId, 'commuter')` — writing a role to a brand-new document
- Then calls `updateUserProfile(userId, {...})` — writing name and phone

This means the screen bypasses `role-selection.tsx` entirely for its write logic, creates a duplicate signup path, and would fail or produce incorrect data for a user who arrived via the intended flow (already authenticated, role already set by `role-selection.tsx`).

From `commuter-setup.tsx` line 73-75:
```typescript
const { userId } = await signUpWithEmail(email, password);
await updateUserRole(userId, 'commuter');
await updateUserProfile(userId, { name: name.trim(), phone: phone.trim() });
```

A user arriving at this screen via `role-selection.tsx` already has a uid and a Firestore document. Calling `signUpWithEmail` again would attempt to create a second Firebase account (which would fail with `auth/email-already-in-use` if the same email is used, or create an unlinked orphan account if a different email is entered).

**Issue 2: `user` null guard is missing from the save handler.**

The spec explicitly requires: `if (!user) { setError('Session expired. Please sign in again.'); return; }`. The actual implementation does not pull `user` from `useAuth()` at all. The line `const { refreshRole } = useAuth()` only extracts `refreshRole` — `user` is never retrieved. Because the screen calls `signUpWithEmail` instead of `updateUserProfile(user.uid, ...)`, it has no dependency on the authenticated session, which is precisely the wrong design.

**Issue 3: Validation function does not match the spec.**

The spec defines `validateProfileForm(name, phone)` — a function that validates exactly two fields. The implemented function is `validateCreateAccountForm(name, email, phone, password, confirmPassword, termsAccepted)` — a six-field validator. The phone regex `/^[\+]?[\d\s\-\(\)]{7,15}$/` is correct and matches the spec, but it is embedded in a validator that is not the right function for this screen's intended purpose.

**Issue 4: The back-navigation guard contradicts the spec.**

The form state renders a back button in the header:
```typescript
<Pressable onPress={() => router.back()} style={styles.headerBack}>
  <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
</Pressable>
```

The spec states (Edge Cases, item 2): "Since we used `router.replace` (not `router.push`) when navigating to `commuter-setup`, there is no back history to return to." The header back button and the "Sign In" link at the bottom both provide navigation escape hatches that would send users backward into the auth flow. This is also a symptom of Issue 1 — this screen was designed as a standalone signup entry point, not as a guarded mid-flow screen.

**Issue 5: The "Sign in link" at the bottom calls `router.back()`, which on this screen's intended navigation path has no destination.**

Line 329-331:
```typescript
<Pressable onPress={() => router.back()}>
  <Text style={styles.signInLink}>Sign In</Text>
</Pressable>
```

When `router.replace` was used to get here from `role-selection.tsx`, `router.back()` has no previous screen to return to in the auth stack. This will either do nothing or navigate unpredictably depending on the Expo Router stack state.

### Warnings

**Warning 1: `useEffect` has a stale closure on `handleContinue`.**

The `useEffect` dependency array is `[isSaved]`, but `handleContinue` is called inside the effect and captures `refreshRole` from the outer scope. If `refreshRole` were to change identity between renders, the timer would call a stale version. In practice this is unlikely to cause a bug because `refreshRole` is defined with a stable reference in context, but the correct pattern is either to add `handleContinue` to the dependency array or to move the `refreshRole()` call inline into the effect body. This is a lint warning category issue (`react-hooks/exhaustive-deps`).

**Warning 2: The screen heading says "Join TowLink" and the CTA says "Create Account".**

The spec specifies heading "Complete Your Profile" and button text "Save & Continue". The implemented text matches a signup screen, not a profile-completion screen. This is a direct symptom of Issue 1, but worth calling out as a user-visible regression.

**Warning 3: `role-selection.tsx` still has `import { auth } from '@/services/firebase/config'` on line 3.**

Looking at the file, `auth.currentUser` is used on line 24. This is existing code and not introduced by this story, but it is worth noting that the `auth` import and direct `auth.currentUser` access is a pattern inconsistent with the `useAuth()` context being used elsewhere. Not blocking for this story.

### Suggestions

- When fixing the screen, the validation function name should be `validateProfileForm` (not `validateCreateAccountForm`) to clearly signal it is validating a profile completion form, not a signup form.
- Consider extracting the success screen into a separate `if (isSaved) return (...)` block at the top of the component for readability, exactly as the spec describes. The current implementation does do this correctly — keep it.
- The `useEffect` cleanup pattern is correctly implemented — this is good code that should be preserved when the screen is reworked.
- The visual polish of the form (icon circle, card styling, color tokens, pill-shaped inputs) is good work that should be preserved. Only the field set and submit logic need to change.

---

## Testing Results

No automated tests exist for this story (as expected per spec). The following was assessed by static code analysis only — no device testing was performed by the reviewer.

**Static analysis findings:**

| Check | Result |
|---|---|
| TypeScript: `authService.ts` | No errors |
| TypeScript: `commuter-setup.tsx` | No errors |
| TypeScript: `role-selection.tsx` | No errors |
| `updateDoc` used (not `setDoc`) in `updateUserProfile` | Confirmed correct |
| `router.replace` used in `role-selection.tsx` | Confirmed correct |
| `useEffect` cleanup function present | Confirmed correct |
| `isSaved` controls two render paths | Confirmed correct |
| `user` null guard in save handler | NOT present — FAIL |
| Correct fields written (name + phone only) | NOT correct — screen writes name, phone, role via a new signup flow |
| `handleSave` calls `updateUserProfile` on existing user | NOT correct — screen calls `signUpWithEmail` |

---

## Root Cause Analysis

The implementation appears to have taken the Figma "Create Account" design reference too literally. The spec notes explicitly: "The Figma 'Create Account' design includes Email, Password, and Confirm Password fields — but those already exist in `signup.tsx`. Your `commuter-setup.tsx` only needs Full Name and Phone Number."

The student built the Figma design as shown rather than the scoped-down version described in the spec. The result is a screen that is a full signup replacement rather than a profile-completion mid-flow step. The `signUpWithEmail` import on line 4 of `commuter-setup.tsx` is the clearest signal that the screen's intent diverged from the spec.

---

## Final Verdict

- [ ] Ready for production
- [x] Needs revisions (see critical issues)
- [ ] Needs major rework

The verdict is **Needs Revisions**. The spec infrastructure is solid — `updateUserProfile` in `authService.ts` is correct, `role-selection.tsx` navigation change is correct, the success state and auto-redirect are correct, and there are no TypeScript errors. The problem is isolated to the form state of `commuter-setup.tsx`: it has the wrong field set, wrong submit handler, and wrong user-session assumptions.

---

## Next Steps

The following changes are needed before this story can be marked Done. All changes are in `app/(auth)/commuter-setup.tsx` only — `authService.ts` and `role-selection.tsx` do not need to change.

**1. Replace the form state entirely.**

The form should collect only two fields: Full Name and Phone Number. Email, Password, Confirm Password, and Terms checkbox should be removed entirely.

**2. Replace the validation function.**

Replace `validateCreateAccountForm` with `validateProfileForm(name, phone)` matching the spec exactly:
- Both fields required
- Name at least 2 characters
- Phone matches `/^[\+]?[\d\s\-\(\)]{7,15}$/`

**3. Replace the submit handler.**

Replace `handleCreateAccount` with `handleSave`. It should:
- Pull `user` from `useAuth()` (alongside `refreshRole`)
- Validate with `validateProfileForm`
- Guard with `if (!user) { setError('Session expired. Please sign in again.'); return; }`
- Call `await updateUserProfile(user.uid, { name: name.trim(), phone: phone.trim() })`
- Set `isSaved(true)` on success

**4. Remove the back button and sign-in link from the form state.**

The header back arrow (line 173) and the "Already have an account? Sign In" row (lines 327-332) should both be removed. This screen is a guarded mid-flow step — there is no valid backward navigation from it.

**5. Remove unused imports.**

After the above changes, `signUpWithEmail` and `updateUserRole` imports on lines 3-5 will be unused. Remove them.

**6. Update the screen heading and button text.**

- Heading: "Join TowLink" should become "Complete Your Profile"
- Button text: "Create Account" should become "Save & Continue"

The success state, `handleContinue`, `useEffect` auto-redirect, and all styling can remain as written — they are correct.
