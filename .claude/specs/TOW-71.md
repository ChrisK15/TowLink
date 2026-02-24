# Technical Specification: TOW-71

## Story Reference

**Title**: FE Sprint 1 - General Onboarding Flow up to Role Selection
**Branch**: `TOW-71-fe-sprint-1-general-onboarding-flow-up-to-role-selection`
**Status**: To Do - pure frontend/UI, no backend dependencies
**Jira**: https://chriskelamyan115.atlassian.net/browse/TOW-71

### What We Are Building

A 4-screen onboarding experience that every new user sees when they first open the app:

1. **Welcome Screen** - Location pin icon, "Welcome to TowLink" heading
2. **Fast & Reliable Screen** - Lightning bolt icon, feature highlight
3. **Safe & Secure Screen** - Shield icon, "Get Started" CTA
4. **Role Selection Screen** - Two cards: "Continue as Customer" and "Continue as Driver"

Screens 1-3 form a horizontal pager (slideshow). Screen 4 is a separate screen reached after the pager.

After onboarding is completed once, AsyncStorage will flag it as seen, and future app launches skip straight to the auth flow.

**Out of scope**: "Administrative Access" option on Role Selection screen.

---

## Architecture Overview

The onboarding flow sits inside the existing `(auth)` route group, which already has `headerShown: false` configured. The flow inserts itself **before** the signup/login screens. The root `_layout.tsx` already redirects unauthenticated users to `/(auth)`, so we only need to redirect within the auth group's index to either the onboarding or signup screen depending on AsyncStorage.

The existing `(auth)/role-selection.tsx` is a functional (but visually bare) screen that handles Firebase role writes. This story creates a **new, visually-designed** role selection screen at `(auth)/onboarding/role-selection.tsx` as part of the onboarding flow. The existing `(auth)/role-selection.tsx` should remain untouched — it is the post-signup functional fallback used when `role === null`.

### Navigation Flow

```
App Launch
    |
    v
_layout.tsx (RootLayoutNav)
    |-- user not authenticated --> /(auth)
    |
    v
(auth)/_layout.tsx --> Stack (headerShown: false)
    |
    v
(auth)/index.tsx  <-- MODIFY THIS FILE
    |
    |-- AsyncStorage 'onboarding_complete' === 'true'
    |       --> Redirect to /(auth)/signup  (existing behavior, returning users)
    |
    |-- AsyncStorage key missing / false
            --> Redirect to /(auth)/onboarding
                |
                v
        (auth)/onboarding/_layout.tsx  (Stack, headerShown: false)
                |
                v
        (auth)/onboarding/index.tsx  (Pager - screens 1, 2, 3)
                |
                v (taps "Get Started")
        (auth)/onboarding/role-selection.tsx  (screen 4)
                |
                |-- "Continue as Customer"
                |       --> router.replace('/(auth)/signup') + set selectedRole context/param
                |
                |-- "Continue as Driver"
                        --> router.replace('/(auth)/signup') + set selectedRole context/param
```

**Important note on the role selection integration**: The new onboarding Role Selection screen does NOT write to Firebase. Its job is purely to:
1. Mark onboarding as complete in AsyncStorage
2. Navigate to the signup/login flow

At this MVP stage, the role selection choice made during onboarding does not need to pre-populate the post-signup role selection screen. The existing `(auth)/role-selection.tsx` handles the actual Firebase role write after account creation. The onboarding role selection is a UX entry point only.

---

## Technical Requirements

### Frontend Components

**Files to create:**

```
app/
  (auth)/
    onboarding/
      _layout.tsx           -- Stack navigator for the onboarding sub-group
      index.tsx             -- The 3-slide pager (Welcome, Fast & Reliable, Safe & Secure)
      role-selection.tsx    -- Role Selection screen (screen 4)

components/
  onboarding/
    OnboardingHeader.tsx    -- Shared header (logo + tagline + dark mode toggle)
    PaginationDots.tsx      -- The 3-dot progress indicator
    OnboardingSlide.tsx     -- Single slide: icon circle + heading + body text
    RoleCard.tsx            -- Individual role selection card
```

**Files to modify:**

```
app/(auth)/index.tsx        -- Add AsyncStorage check, redirect to onboarding or signup
```

---

### Component Specifications

#### `components/onboarding/OnboardingHeader.tsx`

Renders the persistent header visible on all 4 onboarding screens.

**Visual spec (from design images):**
- Left side: Tow truck emoji image + bold "TowLink" text
- Center/below: "Roadside Assistance On-Demand" subtitle (on screens 1-3) OR "Choose how you want to use TowLink" (on Role Selection screen)
- Right side: Dark mode toggle button (crescent moon icon)
- Bottom: thin horizontal divider line

**Props:**
```typescript
interface OnboardingHeaderProps {
  tagline: string;
  onDarkModeToggle?: () => void;
  isDarkMode?: boolean;
}
```

**Dark mode toggle**: For this story, implement as a **stub** - the button renders and is pressable but does not need to change the actual system theme. Log a console message or show a brief Alert. Full dark mode implementation is a separate story.

**Icon source**: Use `@expo/vector-icons` (`Ionicons` or `Feather`). The tow truck can use the `🚛` emoji in a `<Text>` tag OR the `Ionicons` "car" icon - match the blue circular background style from the design. The moon icon for dark mode toggle: `Ionicons` name `"moon-outline"`.

---

#### `components/onboarding/OnboardingSlide.tsx`

Renders a single slide's content area (used inside the pager).

**Visual spec:**
- Large icon centered inside a light blue circle (`backgroundColor: '#EBF4FD'`, circle `width: 160, height: 160, borderRadius: 80`)
- Icon itself is blue (`#1E6FD9` or `#2B7FE0`) at ~72px size
- Bold heading below the circle (fontSize: 28, fontWeight: 'bold')
- Subtext below heading (fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24)

**Props:**
```typescript
interface OnboardingSlideProps {
  iconName: string;          // Ionicons icon name
  iconLibrary?: 'Ionicons' | 'MaterialIcons';  // defaults to Ionicons
  heading: string;
  subtext: string;
}
```

---

#### `components/onboarding/PaginationDots.tsx`

Renders the 3-dot pagination indicator.

**Visual spec (from design):**
- 3 dots in a horizontal row
- Active dot: wider pill shape (`width: 24, height: 8, borderRadius: 4, backgroundColor: '#1E6FD9'`)
- Inactive dot: small circle (`width: 8, height: 8, borderRadius: 4, backgroundColor: '#C4C4C4'`)
- Gap between dots: 6px

**Props:**
```typescript
interface PaginationDotsProps {
  total: number;     // always 3 for this story
  activeIndex: number;
}
```

---

#### `components/onboarding/RoleCard.tsx`

Renders a single role option card on the Role Selection screen.

**Visual spec (from design):**
- White card with light gray border (`borderWidth: 1, borderColor: '#E0E0E0'`), `borderRadius: 12`
- Horizontal layout: icon area on left, text on right
- Icon: inside a light blue square/rounded box (`backgroundColor: '#EBF4FD'`, size ~48x48)
- Title text: bold, fontSize 17
- Description: gray, fontSize 14, wraps to multiple lines
- CTA link: blue text with `->` arrow, fontSize 14, `color: '#1E6FD9'`

**Props:**
```typescript
interface RoleCardProps {
  iconName: string;
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
}
```

---

### Screen Specifications

#### `app/(auth)/onboarding/_layout.tsx`

Simple Stack navigator with no header, wrapping the onboarding sub-screens.

```typescript
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

---

#### `app/(auth)/onboarding/index.tsx` (The Pager - Screens 1, 2, 3)

**Implementation approach**: Use a native React Native `FlatList` with `horizontal`, `pagingEnabled`, and `showsHorizontalScrollIndicator={false}`. This is preferred over adding a new library because:
- `FlatList` is already part of React Native (no new dependency)
- `pagingEnabled` snaps between full-screen pages automatically
- We can control the active page index via `onMomentumScrollEnd`
- The "Next" button can programmatically scroll to the next item via a `FlatList` ref

**Slide data** (static array, defined in the file):

```typescript
const SLIDES: SlideData[] = [
  {
    id: 'welcome',
    iconName: 'location',          // Ionicons
    heading: 'Welcome to TowLink',
    subtext: 'The fastest way to get roadside assistance or earn money helping others on the road.',
  },
  {
    id: 'fast',
    iconName: 'flash',             // Ionicons
    heading: 'Fast & Reliable',
    subtext: 'Connect in minutes. Real-time tracking and in-app communication for a seamless experience.',
  },
  {
    id: 'secure',
    iconName: 'shield-checkmark',  // Ionicons
    heading: 'Safe & Secure',
    subtext: 'All users are verified. Ratings and reviews ensure quality service every time.',
  },
];
```

**State:**
```typescript
const [activeIndex, setActiveIndex] = useState<number>(0);
const flatListRef = useRef<FlatList>(null);
```

**Key behaviors:**
- Each slide item has `width: Dimensions.get('window').width` so it fills exactly one screen width
- `onMomentumScrollEnd` event updates `activeIndex` based on `contentOffset.x / screenWidth`
- "Next" button calls `flatListRef.current?.scrollToIndex({ index: activeIndex + 1 })`
- On the last slide (index 2), the button label changes to "Get Started" and pressing it navigates to `/(auth)/onboarding/role-selection` using `router.push`
- User can also swipe between slides manually; `onMomentumScrollEnd` keeps `activeIndex` in sync

**Layout structure:**
```
<SafeAreaView flex:1>
  <OnboardingHeader tagline="Roadside Assistance On-Demand" />
  <FlatList  (the pager, flex:1)
    horizontal
    pagingEnabled
    data={SLIDES}
    renderItem={({ item }) => <OnboardingSlide ... />}
    onMomentumScrollEnd={handleScrollEnd}
  />
  <View (bottom section - outside FlatList)>
    <PaginationDots total={3} activeIndex={activeIndex} />
    <Pressable (Next / Get Started button)>
      <Text>Next  →</Text>
    </Pressable>
  </View>
</SafeAreaView>
```

**Important**: The `OnboardingHeader`, `PaginationDots`, and bottom button must be rendered **outside** the `FlatList` so they stay fixed while only the slide content scrolls.

---

#### `app/(auth)/onboarding/role-selection.tsx` (Screen 4)

**Visual spec (from design):**
- Header: `OnboardingHeader` with `tagline="Choose how you want to use TowLink"`
- No pagination dots
- Large "I want to..." heading (fontSize: 32, fontWeight: 'bold', marginTop: 40)
- Two `RoleCard` components stacked vertically with 16px gap
- No "Administrative Access" option (out of scope)

**State**: None needed - this is a static UI screen.

**On "Continue as Customer" press:**
```typescript
const handleCustomer = async () => {
  await AsyncStorage.setItem('onboarding_complete', 'true');
  router.replace('/(auth)/signup');
};
```

**On "Continue as Driver" press:**
```typescript
const handleDriver = async () => {
  await AsyncStorage.setItem('onboarding_complete', 'true');
  router.replace('/(auth)/signup');
};
```

Both routes go to `/(auth)/signup` for now. The role choice is cosmetic at this stage - the actual Firebase role write happens post-signup in the existing `(auth)/role-selection.tsx` screen. This is acceptable for the current sprint scope.

**Card data:**
- Card 1: icon `person`, title `"Get Roadside Assistance"`, description `"Request towing, jump starts, tire changes, and more. Help arrives in minutes."`, cta `"Continue as Customer"`
- Card 2: icon `car` or `truck` variant, title `"Drive & Earn Money"`, description `"Be your own boss. Set your schedule and earn money providing roadside assistance."`, cta `"Continue as Driver"`

---

#### `app/(auth)/index.tsx` (Modified)

This file currently redirects straight to `/(auth)/signup`. We change it to check AsyncStorage first:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function AuthIndex() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const value = await AsyncStorage.getItem('onboarding_complete');
      setOnboardingComplete(value === 'true');
      setIsLoading(false);
    }
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (onboardingComplete) {
    return <Redirect href="/(auth)/signup" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
```

---

### TypeScript Types

Add to `types/models.ts` or create a new `types/onboarding.ts`:

```typescript
// types/onboarding.ts

export interface SlideData {
  id: string;
  iconName: string;
  heading: string;
  subtext: string;
}

export type OnboardingRole = 'customer' | 'driver';
```

---

### AsyncStorage Logic

**Key**: `'onboarding_complete'`
**Value**: `'true'` (string, not boolean - AsyncStorage only stores strings)
**When set**: When user presses "Continue as Customer" or "Continue as Driver" on the Role Selection screen
**Where read**: In `app/(auth)/index.tsx` on mount

**Package already installed**: `@react-native-async-storage/async-storage` version `2.2.0` is already in `package.json`. No new dependencies needed.

**Import**:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

---

### Color Constants

The design uses a specific blue palette not currently in `constants/theme.ts`. Add these to the theme or use them inline in the onboarding components (inline is fine for now since this is isolated to onboarding screens):

```typescript
// Onboarding-specific colors (can be inline or added to theme.ts)
const ONBOARDING_COLORS = {
  primary: '#1E6FD9',           // Main blue for icons, button, active dot
  primaryLight: '#EBF4FD',      // Light blue for icon circles and card icon backgrounds
  buttonBlue: '#2176FF',        // Full-width CTA button
  ctaLink: '#1E6FD9',           // "Continue as Customer ->" link text
  dotInactive: '#C4C4C4',       // Inactive pagination dots
  cardBorder: '#E0E0E0',        // Role card border
  subtext: '#555555',           // Body text below headings
  divider: '#E0E0E0',           // Header divider line
};
```

---

### Navigation Wiring Summary

| From | Action | To | Method |
|------|--------|----|--------|
| `(auth)/index` | onboarding not complete | `(auth)/onboarding` | `<Redirect>` |
| `(auth)/index` | onboarding complete | `(auth)/signup` | `<Redirect>` |
| `onboarding/index` (slide 3) | tap "Get Started" | `onboarding/role-selection` | `router.push` |
| `onboarding/role-selection` | tap "Continue as Customer" | `(auth)/signup` | `router.replace` |
| `onboarding/role-selection` | tap "Continue as Driver" | `(auth)/signup` | `router.replace` |

Use `router.replace` (not `router.push`) when leaving onboarding so the user cannot press the hardware back button to return to the onboarding flow once they've committed to sign up.

---

## Implementation Steps

### Step 1: Create the TypeScript types

**Files**: `/Users/loris/TowLink/types/onboarding.ts`
**Action**: Create the `SlideData` and `OnboardingRole` type definitions.
**Goal**: Student learns to separate types into their own file, matching the project's existing `types/models.ts` pattern.

---

### Step 2: Create the `OnboardingHeader` component

**Files**: `/Users/loris/TowLink/components/onboarding/OnboardingHeader.tsx`
**Action**: Build the shared header with the TowLink logo (emoji + text), tagline subtitle, dark mode toggle icon button (stubbed), and a horizontal divider.
**Code hint**: Use `View`, `Text`, `Pressable` from React Native. For the moon icon: `import { Ionicons } from '@expo/vector-icons'` then `<Ionicons name="moon-outline" size={24} color="#333" />`. The dark mode toggle should call `onDarkModeToggle` prop if provided.
**Goal**: Student learns to build reusable header components with props.

---

### Step 3: Create the `PaginationDots` component

**Files**: `/Users/loris/TowLink/components/onboarding/PaginationDots.tsx`
**Action**: Render `total` dots in a row, with the dot at `activeIndex` rendered as an elongated pill (wider than the others).
**Code hint**: Use `Array.from({ length: total }, (_, i) => i).map(...)` to generate the dots. Use an array style: `[styles.dot, i === activeIndex && styles.dotActive]`.
**Goal**: Student learns conditional styling based on props/index.

---

### Step 4: Create the `OnboardingSlide` component

**Files**: `/Users/loris/TowLink/components/onboarding/OnboardingSlide.tsx`
**Action**: Build the centered icon-circle + heading + subtext layout.
**Code hint**: The slide needs `width: Dimensions.get('window').width` to fill one page in the FlatList. Import `Dimensions` from React Native. Use `Ionicons` for the icon inside a `View` styled as a circle.
**Goal**: Student learns to use `Dimensions` for responsive layout and build icon-centered UI.

---

### Step 5: Build the `RoleCard` component

**Files**: `/Users/loris/TowLink/components/onboarding/RoleCard.tsx`
**Action**: Create a card with horizontal layout: left icon box, right text area (title, description, CTA link).
**Code hint**: Use `flexDirection: 'row'` on the card container. Icon box: `width: 52, height: 52, borderRadius: 10, backgroundColor: '#EBF4FD', justifyContent: 'center', alignItems: 'center'`. CTA: a `Pressable` wrapping a `Text` in blue.
**Goal**: Student learns flex layout with `flexDirection: 'row'` and component composition.

---

### Step 6: Create the onboarding sub-group layout

**Files**: `/Users/loris/TowLink/app/(auth)/onboarding/_layout.tsx`
**Action**: Create a simple Stack navigator with `headerShown: false`.
**Goal**: Student understands how nested route groups work in Expo Router.

---

### Step 7: Build the onboarding pager screen (Screens 1-3)

**Files**: `/Users/loris/TowLink/app/(auth)/onboarding/index.tsx`
**Action**: Wire together the `OnboardingHeader`, `FlatList` pager, `OnboardingSlide` items, `PaginationDots`, and the Next/Get Started button.
**Key details**:
- `useRef<FlatList>(null)` for the ref
- `useState(0)` for `activeIndex`
- `onMomentumScrollEnd` handler: `Math.round(event.nativeEvent.contentOffset.x / screenWidth)`
- Button press: if `activeIndex < 2`, scroll forward; if `activeIndex === 2`, `router.push('/(auth)/onboarding/role-selection')`
- Button label: `activeIndex === 2 ? 'Get Started' : 'Next'`
**Goal**: Student learns `FlatList` as a pager, ref forwarding, and scroll event handling.

---

### Step 8: Build the Role Selection screen

**Files**: `/Users/loris/TowLink/app/(auth)/onboarding/role-selection.tsx`
**Action**: Use `OnboardingHeader` with the role selection tagline. Render "I want to..." heading, then two `RoleCard` components. Each card's `onPress` writes to AsyncStorage then calls `router.replace('/(auth)/signup')`.
**Goal**: Student learns AsyncStorage write operations and the `router.replace` vs `router.push` distinction.

---

### Step 9: Modify the auth index to check AsyncStorage

**Files**: `/Users/loris/TowLink/app/(auth)/index.tsx`
**Action**: Replace the current hard-coded `<Redirect href="/(auth)/signup" />` with the AsyncStorage check pattern shown in the specification above.
**Goal**: Student learns persistent storage with AsyncStorage and conditional navigation at app startup.

---

### Step 10: Manual testing checklist

Test the following scenarios on a simulator or device:

1. **First launch**: AsyncStorage is empty -> onboarding screens appear -> swipe/tap through all 3 slides -> pagination dots update correctly -> tap "Get Started" -> Role Selection screen appears -> tap "Continue as Customer" -> lands on Signup screen
2. **Second launch**: AsyncStorage has `'onboarding_complete': 'true'` -> goes straight to Signup (skips onboarding)
3. **Back button**: After tapping "Continue as Customer/Driver", the back button must NOT return to onboarding (because `router.replace` was used)
4. **Swipe gesture**: Swiping left/right on slides updates the pagination dots correctly
5. **Dark mode toggle**: Tapping the moon icon does something visible (even just a console.log) - does not crash

---

## Edge Cases

1. **AsyncStorage read fails** - Wrap the `AsyncStorage.getItem` call in a try/catch. On error, default to showing the onboarding (`setOnboardingComplete(false)`) rather than silently skipping it. This means a first-time user always sees onboarding even if storage is temporarily unavailable.

2. **User force-kills app on slide 2** - They see slide 1 again on next launch. This is acceptable. AsyncStorage is only written on the Role Selection screen CTA, so partial onboarding is never persisted as complete.

3. **Screen width changes** (e.g., fold phones) - Using `Dimensions.get('window').width` at render time is sufficient for now. A more robust approach would use the `useWindowDimensions` hook, but that is out of scope.

4. **Fast-tap of Next button** - Tapping "Next" rapidly could attempt to scroll past the last index. Guard with: `if (activeIndex >= SLIDES.length - 1) { navigate; return; }` before calling `scrollToIndex`.

5. **FlatList `scrollToIndex` with index 0** - Always safe since we initialize `activeIndex` to 0 and only scroll forward.

---

## Testing Strategy

This story is pure UI with no Firebase calls, so testing is straightforward:

- **Manual testing**: Primary strategy. Use the iOS Simulator and Android Emulator.
- **Visual comparison**: Open the design PNG files in `.claude/design/screens/onboarding_flow/` side-by-side with the simulator while building.
- **AsyncStorage reset**: During development, call `AsyncStorage.clear()` in a dev-only button or run `npx react-native start --reset-cache` equivalent. Alternatively, clear it from code temporarily with a dev flag.
- **No automated tests**: For this UI-only story, manual testing is sufficient at this stage of the project.

---

## Dependencies

### Already Installed (No New Packages Needed)

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-native-async-storage/async-storage` | `2.2.0` | Persist onboarding completion flag |
| `@expo/vector-icons` | `^15.0.2` | Ionicons for moon, location, flash, shield icons |
| `expo-router` | `~6.0.22` | Navigation between onboarding screens |
| `react-native` | `0.81.5` | FlatList, Dimensions, SafeAreaView, Pressable |

### No New Libraries Required

The spec deliberately avoids `react-native-pager-view` (requires native build step) and `react-native-snap-carousel` (unmaintained) in favor of the built-in `FlatList` with `pagingEnabled`. This keeps the implementation simple and dependency-free.

### Prerequisites

- The `(auth)` route group and its `_layout.tsx` already exist - no changes needed there.
- The existing `(auth)/role-selection.tsx` (Firebase role write screen) remains unchanged.
- The `context/auth-context.tsx` and root `_layout.tsx` remain unchanged.

---

## File/Folder Structure Summary

```
app/
  (auth)/
    index.tsx                          MODIFY - add AsyncStorage check
    onboarding/
      _layout.tsx                      CREATE - Stack with headerShown: false
      index.tsx                        CREATE - 3-slide FlatList pager
      role-selection.tsx               CREATE - Role selection screen (screen 4)

components/
  onboarding/
    OnboardingHeader.tsx               CREATE - shared header component
    PaginationDots.tsx                 CREATE - pagination indicator
    OnboardingSlide.tsx                CREATE - single slide content
    RoleCard.tsx                       CREATE - role option card

types/
  onboarding.ts                        CREATE - SlideData, OnboardingRole types
```

**Total new files**: 7
**Modified files**: 1 (`app/(auth)/index.tsx`)

---

## Design Reference

All design images are at `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/`:

| File | Screen |
|------|--------|
| `Welcome Screen.png` | Screen 1 - location pin, "Welcome to TowLink" |
| `Fast & Reliable.png` | Screen 2 - lightning bolt, "Fast & Reliable" |
| `Get Started.png` | Screen 3 - shield, "Safe & Secure", "Get Started" button |
| `Role Selection.png` | Screen 4 - two role cards |
| `General Flow.png` | All 4 screens side by side for overview |

Key design measurements observed from the images:
- Header: logo + name left-aligned, dark mode toggle right-aligned, tagline centered below
- Thin horizontal gray divider below header
- Icon circle: ~160px diameter, `backgroundColor: '#EBF4FD'` (very light blue)
- Icon: ~72px, blue stroke style
- Heading: bold, ~28px, dark near-black color
- Subtext: ~16px, medium gray, centered, max 2-3 lines
- Pagination dots: centered horizontally, below subtext, above a spacer
- CTA button: full-width, `borderRadius: 30`, blue background, white text + arrow
- Role cards: white with subtle border, full width with 20px horizontal padding
