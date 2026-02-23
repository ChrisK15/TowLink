# Code Review: TOW-71

## Story
FE Sprint 1 - General Onboarding Flow up to Role Selection
Branch: `TOW-71-fe-sprint-1-general-onboarding-flow-up-to-role-selection`

---

## Acceptance Criteria Verification

### Screen 1 - Welcome Screen
- [x] TowLink logo/icon + "TowLink" branding in header - PASSED
- [x] "Roadside Assistance On-Demand" subtitle in header - PASSED
- [x] Dark mode toggle (moon icon) in top-right corner - PASSED (stubbed correctly)
- [x] Large location pin icon centered in a light blue circle - PASSED (`iconName: 'location'`)
- [x] Bold "Welcome to TowLink" heading - PASSED
- [x] Correct subtext - PASSED
- [x] Pagination dots - first dot active - PASSED
- [x] "Next" button with arrow at the bottom - PASSED

### Screen 2 - Fast & Reliable
- [x] Same fixed header - PASSED
- [x] Lightning bolt icon in circle - PASSED (`iconName: 'flash'`)
- [x] Bold "Fast & Reliable" heading - PASSED
- [x] Correct subtext - PASSED
- [x] Second pagination dot active - PASSED
- [x] "Next" button - PASSED

### Screen 3 - Safe & Secure
- [x] Same fixed header - PASSED
- [x] Shield icon in circle - PASSED (`iconName: 'shield-checkmark'`)
- [x] Bold "Safe & Secure" heading - PASSED
- [x] Correct subtext - PASSED
- [x] Third pagination dot active - PASSED
- [x] "Get Started" button (label change on last slide) - PASSED

### Screen 4 - Role Selection
- [x] Header tagline: "Choose how you want to use TowLink" - PASSED
- [x] Dark mode toggle visible - PASSED
- [x] "I want to..." heading - PASSED
- [x] Card 1: person icon, "Get Roadside Assistance", description, "Continue as Customer" CTA - PASSED
- [x] Card 2: car icon, "Drive & Earn Money", description, "Continue as Driver" CTA - PASSED
- [x] "Administrative Access" excluded (intentional, in-scope exclusion) - PASSED

### Navigation Flow
- [x] Welcome -> Fast & Reliable -> Safe & Secure -> Role Selection - PASSED
- [x] "Continue as Customer" routes to `/(auth)/signup` - PASSED
- [x] "Continue as Driver" routes to `/(auth)/signup` - PASSED
- [x] `router.replace` used (not `router.push`) when leaving role selection - PASSED

### AsyncStorage Behavior
- [x] First launch shows onboarding - PASSED
- [x] After completing onboarding, next launch skips to signup - PASSED
- [x] Error handling in AsyncStorage read (try/catch/finally) - PASSED
- [x] AsyncStorage written before navigating away from role selection - PASSED

---

## Code Quality Assessment

### Strengths

**Solid component architecture.** All four reusable components (`OnboardingHeader`, `PaginationDots`, `OnboardingSlide`, `RoleCard`) are clean, well-scoped, and follow the existing project patterns. Props interfaces are defined at the top of each file, StyleSheet is at the bottom — consistent with the codebase convention.

**FlatList pager is implemented correctly.** The `SLIDES` constant and `screenWidth` are defined outside the component (avoiding re-computation on every render). The `flatListRef` is properly typed as `useRef<FlatList>(null)`. The guard in `handleNext` (`if (activeIndex >= SLIDES.length - 1)`) prevents scrolling past the last slide. `onMomentumScrollEnd` correctly syncs `activeIndex` during swipe gestures.

**AsyncStorage error handling is complete.** The `try/catch/finally` pattern in `app/(auth)/index.tsx` exactly matches the spec. On error, onboarding is shown rather than skipped — this is the correct safe default.

**`router.replace` used correctly on role selection.** Both `handleCustomer` and `handleDriver` use `router.replace` so the user cannot press back and return to the onboarding flow after committing to sign up.

**ScrollView on Role Selection screen is a good call.** The spec mentioned this as an acceptable deviation. It prevents role cards from being clipped on smaller devices (iPhone SE).

**Zero TypeScript errors.** IDE diagnostics confirm all 8 new/modified files are clean.

**`OnboardingRole` type uses `'commuter'` (not `'customer')`.** This aligns with the existing `types/models.ts` where the User role union uses `'commuter'` — a smart alignment with the existing data model rather than blindly following the spec's `'customer'` term.

---

### Critical Issues

None. The implementation is functionally correct and meets all acceptance criteria.

---

### Warnings

**1. Multiple `as any` casts suppress type safety — should be cleaned up.**

There are five `as any` casts across the implementation:

- `components/onboarding/OnboardingSlide.tsx` line 20: `<Ionicons name={iconName as any} ...>`
- `components/onboarding/RoleCard.tsx` line 16: `<Ionicons name={iconName as any} ...>`
- `app/(auth)/onboarding/index.tsx` line 46: `router.push('/(auth)/onboarding/role-selection' as any)`
- `app/(auth)/index.tsx` line 37: `<Redirect href={"/(auth)/onboarding" as any} />`
- `app/(auth)/signup.tsx` line 62: `router.replace('/(auth)/onboarding' as any)`

The Ionicons `as any` casts are a known friction point when `iconName` is a plain `string` prop — Ionicons expects its own `keyof typeof Ionicons.glyphMap` type. The usual fix is to type the prop as `React.ComponentProps<typeof Ionicons>['name']` instead of `string`. This is not a runtime bug (the correct icon names are passed), but it removes type-checking on icon names.

The route string casts suggest the Expo Router typed routes feature (`expo-router/typed-routes`) may not be fully configured or the route paths are not being picked up by the type generator. These casts work at runtime but again bypass compile-time route validation.

These are warnings rather than blockers — everything works correctly. But they are the kind of thing that should be addressed before the pattern spreads to other components.

**2. `handleScrollEnd` uses `e: any` parameter type.**

In `app/(auth)/onboarding/index.tsx` line 38:

```typescript
const handleScrollEnd = (e: any) => {
```

This should be typed as `NativeScrollEvent` or the FlatList scroll handler type:

```typescript
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
```

This is a minor type safety gap — the handler works correctly at runtime.

**3. `marginBottom: 125` on the role selection `content` style is a magic number.**

In `app/(auth)/onboarding/role-selection.tsx` line 59:

```typescript
content: {
  flexGrow: 1,
  justifyContent: 'center',
  padding: 24,
  marginBottom: 125,   // <-- why 125?
},
```

This value appears to be a trial-and-error spacing fix to center the cards visually. The intent is unclear and it will behave differently on devices with different screen heights or safe area insets. A comment explaining why this value was chosen, or a more robust centering approach, would help future maintainers.

**4. `isDarkMode` prop is declared but never used inside `OnboardingHeader`.**

In `components/onboarding/OnboardingHeader.tsx`, `isDarkMode` is in the props interface but is destructured out and not used:

```typescript
export default function OnboardingHeader({
  tagline,
  onDarkModeToggle,
  // isDarkMode is never destructured or used
}: OnboardingHeaderProps)
```

Since dark mode is intentionally stubbed, this is fine for now. But either the unused prop should be removed from the interface (cleaner), or it should be destructured and used (even if just to pass a different icon color) to avoid dead props.

**5. `signup.tsx` has a dev-only back button that clears AsyncStorage.**

The `handleBackToOnboarding` function and accompanying "Back to Onboarding" button were added to `signup.tsx` for testing purposes. This is helpful during development but should be removed or gated behind a `__DEV__` flag before the branch is merged into main, as it exposes a way for users to reset their onboarding state from the production signup screen.

---

### Suggestions

**1. Consider `useWindowDimensions` instead of `Dimensions.get('window')` in `OnboardingSlide`.**

`Dimensions.get('window')` reads the width at module load time (since it is outside the component). On foldable devices or if the device rotates, the cached value will be stale. The spec acknowledges this is out of scope for now, but it is worth knowing for future reference.

**2. The `OnboardingHeader` logo does not exactly match the design.**

The design shows a circular blue badge with a red car icon for the TowLink logo. The implementation uses the `🚛` truck emoji in a plain Text tag. The result is visually close but not identical — the emoji does not have the blue circular background badge shown in the design. Since emoji rendering also varies across Android/iOS platforms, a proper `Image` component or a styled `View` with an Ionicons icon would be more consistent. This is a cosmetic gap, not a functional bug.

**3. Pagination dots container is not centered.**

In `PaginationDots`, the container style only has `flexDirection: 'row'` and `alignItems: 'center'`, but no `justifyContent: 'center'` or `alignSelf: 'center'`. The dots are centered because the parent `bottom` View in `onboarding/index.tsx` has `alignItems: 'center'`, which works correctly. This is fine, but adding `justifyContent: 'center'` directly on the dots container would make `PaginationDots` self-contained and reusable in other contexts without relying on the parent.

**4. Import ordering in `role-selection.tsx` is inconsistent.**

```typescript
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import RoleCard from '@/components/onboarding/RoleCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
```

Local `@/` imports appear before the external library imports. The progress file specifies the preferred order: React, then React Native, then expo/external, then local. Consistent grouping makes it easier to scan what a file depends on at a glance.

---

## Testing Results

### Manual Test Observations (from code review, not live device)

The following behaviors can be confirmed from static analysis:

- The slide data strings match the acceptance criteria exactly (verified line-by-line).
- `SLIDES.length` is used everywhere instead of the hardcoded number `3`, which means the pager and pagination dots will adapt if a slide is ever added or removed.
- The `keyExtractor` uses `item.id` (string IDs) correctly.
- Both card `onPress` handlers are `async` functions and `await` the AsyncStorage write before calling `router.replace`. The navigation will not fire before storage is written.
- The `useEffect` dependency array is `[]` (empty), which is correct for a one-time mount check.
- The `finally` block in the AsyncStorage check correctly ensures `setIsLoading(false)` runs even if the `try` block throws.
- The `router.replace('/(auth)/signup')` path from role selection correctly matches the existing signup screen location.

### TypeScript
All 8 new/modified files: 0 errors reported by IDE diagnostics.

### Design Comparison
From visual comparison with design PNGs:

- Slide screens (Welcome, Fast & Reliable, Safe & Secure): match the design layout closely. Pagination dots, headings, subtexts, and CTA button all render as specified.
- Role Selection screen: cards match the design for layout, border, icon box, text hierarchy, and CTA link style.
- Header: the logo area uses a truck emoji where the design uses a styled circular icon badge. Functionally acceptable; cosmetically a minor gap.
- The design shows only one active pagination dot rendered (a wider blue pill); the inactive dots are small gray circles. This matches the implementation in `PaginationDots`.

---

## Final Verdict

- [x] Pass with notes (see warnings above)
- [ ] Ready for production as-is
- [ ] Needs revisions
- [ ] Needs major rework

The implementation is complete, correct, and well-structured. All acceptance criteria are met. The warnings above are code quality improvements, not functional bugs. The story is ready to be marked Done once the following two items are addressed before merging to main:

---

## Required Before Merge

1. **Remove or gate the dev back button in `signup.tsx`** — either delete `handleBackToOnboarding` and the "Back to Onboarding" `Pressable`, or wrap it in `if (__DEV__)` so it only appears in development builds.

2. **Clean up `as any` casts in the Ionicons name props** — replace `iconName: string` with `iconName: React.ComponentProps<typeof Ionicons>['name']` in both `OnboardingSlide.tsx` and `RoleCard.tsx`. This removes the need for the `as any` cast and restores type checking on icon names. The route string casts in `index.tsx`, `signup.tsx`, and `onboarding/index.tsx` are lower priority and can be addressed when Expo Router typed routes is configured project-wide.

---

## Optional Improvements (Post-Merge)

- Add a comment explaining the `marginBottom: 125` value in `role-selection.tsx` or replace with a more robust centering solution.
- Add `justifyContent: 'center'` to the `PaginationDots` container style to make the component self-contained.
- Type the `handleScrollEnd` parameter with `NativeSyntheticEvent<NativeScrollEvent>` instead of `any`.
- Remove the unused `isDarkMode` prop from `OnboardingHeaderProps` or start using it.
- Fix import ordering in `role-selection.tsx` to follow the project convention (external before local).

---

_Reviewed: 2026-02-22_
_Reviewer: quality-reviewer agent_
_Story: TOW-71 - FE Sprint 1 - General Onboarding Flow up to Role Selection_
