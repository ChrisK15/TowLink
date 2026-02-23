# Implementation Progress: TOW-71
## FE Sprint 1 - General Onboarding Flow up to Role Selection

---

## Lesson Plan Overview

Welcome to TOW-71! This is your first pure frontend story - no Firebase, no network calls, just React Native UI. That makes it a great opportunity to go deep on the visual craft of building mobile screens.

### What You'll Build

A polished 4-screen onboarding experience shown to every new user when they first open the app:

1. **Welcome Screen** - Location pin icon, heading, and tagline
2. **Fast & Reliable Screen** - Lightning bolt icon, feature highlight
3. **Safe & Secure Screen** - Shield icon, "Get Started" CTA
4. **Role Selection Screen** - Two cards: "Continue as Customer" / "Continue as Driver"

Screens 1-3 are a horizontal slideshow built with `FlatList`. Screen 4 is a separate route reached after the pager.

### Key Learning Objectives

1. **Reusable Components** - You'll build 4 shared components used across multiple screens. This is the core skill of React/React Native development.

2. **FlatList as a Pager** - You'll use a `FlatList` with `pagingEnabled` to create a swipeable slideshow without installing any external libraries. You'll learn how FlatList refs work and how to sync UI state with scroll position.

3. **Conditional Styling** - You'll render pagination dots where the active dot looks different from the inactive ones, using array-style styles.

4. **AsyncStorage for First-Launch Detection** - You'll use AsyncStorage to remember whether a user has already completed onboarding, skipping these screens on their next app launch.

5. **Expo Router Navigation Patterns** - You'll create a nested route group under `(auth)` and learn the difference between `router.push` (can go back) and `router.replace` (cannot go back).

6. **Component Separation** - You'll learn why splitting components into their own files makes code easier to understand, reuse, and test.

### What Makes This Interesting

- You have real design files to match. Open the `.png` files in `.claude/design/screens/onboarding_flow/` side by side with the simulator as you work.
- The FlatList pager approach is the kind of thing you'd build in a professional React Native app - it avoids a new library while teaching you how scroll events and refs work.
- The AsyncStorage pattern you implement here (first-launch detection) is a pattern used in virtually every real app.

### The Build Order

We build from the smallest pieces to the largest:

```
Types  -->  Components  -->  Screens  -->  Navigation  -->  Testing
```

This mirrors how professional React Native development works. You design the data shapes first, build reusable pieces next, then assemble them into screens.

---

## Current Step

**Step 10 - Visual Polish - Match the Design Files**

---

## Implementation Steps

---

### Step 1: Create TypeScript Types

**Status**: [x] Complete

**Learning Objective:**
Understand why we define data shapes (types) before writing any UI code. Types act like a contract between your components. When you define what a "slide" looks like as a type, every file that uses slide data is forced to follow the same structure. This prevents bugs.

**Concept - Types vs Interfaces:**
In TypeScript, `interface` and `type` both describe the shape of data. In this project we use `interface` for object types and `type` for union types (like `'customer' | 'driver'`). This matches how `types/models.ts` already works - open that file and read through it before starting.

**What to Do:**
1. Look at `types/models.ts` to understand the pattern used in this project.
2. Create a new file: `types/onboarding.ts`
3. Define two type exports:
   - `SlideData` - an interface with `id`, `iconName`, `heading`, and `subtext` fields. All strings.
   - `OnboardingRole` - a type that is either `'customer'` or `'driver'`

**Think About This First:**
- Why does `id` exist on `SlideData`? (Hint: FlatList needs a `keyExtractor` - look up what that is)
- Why is `OnboardingRole` a `type` instead of an `interface`?
- Where will `SlideData` be imported and used?

**File to Create:**
`/Users/loris/TowLink/types/onboarding.ts`

**Success Criteria:**
- [ ] File exists at the correct path
- [ ] `SlideData` interface is exported with correct fields
- [ ] `OnboardingRole` type is exported as a union
- [ ] No TypeScript errors
- [ ] You can explain what a TypeScript union type is

**Gotchas:**
- Use `export interface` and `export type` (not just `interface`/`type`) so these can be imported in other files
- All four fields in `SlideData` are `string` - no optional fields needed here

---

### Step 2: Create the `OnboardingHeader` Component

**Status**: [x] Complete

**Learning Objective:**
Build your first reusable component for this story. A "reusable component" means it accepts props to customize its appearance and behaviour, so the same component can be used on multiple screens without duplicating code.

**Concept - Props as an Interface:**
Look at the existing `components/RequestPopup.tsx` to see how this project structures a component. Notice:
1. An interface defines the props
2. The component function receives `props` typed to that interface
3. `StyleSheet.create()` holds all styles at the bottom

You'll follow this same pattern.

**Concept - Why a Shared Header?:**
All 4 onboarding screens share the same header. If you put the header code directly inside each screen, you'd have to maintain the same code in 4 places. When the design changes, you'd have to update 4 files. A shared component means one change fixes all 4 screens at once.

**What to Do:**
1. Create the folder `components/onboarding/` - this is a new subfolder
2. Create `components/onboarding/OnboardingHeader.tsx`
3. Build the header with three visual sections:
   - **Left:** Tow truck emoji in a `Text` tag + bold "TowLink" text, side by side with `flexDirection: 'row'`
   - **Right:** A `Pressable` containing an `Ionicons` moon icon (dark mode toggle - just stubs for now)
   - **Below:** The `tagline` prop displayed as centered text
   - **Divider:** A thin `View` with `height: 1, backgroundColor: '#E0E0E0'` at the very bottom of the header

**Props to Accept:**
```typescript
interface OnboardingHeaderProps {
  tagline: string;
  onDarkModeToggle?: () => void;
  isDarkMode?: boolean;
}
```

**Icon Import:**
```typescript
import { Ionicons } from '@expo/vector-icons';
// Usage: <Ionicons name="moon-outline" size={24} color="#333" />
```

**Dark Mode Toggle:**
For now, if `onDarkModeToggle` is provided, call it when the moon icon is pressed. If not provided, the button still renders but does nothing. The full dark mode feature is a separate story - here you just need the button to exist and be pressable.

**Key Layout Tip:**
Use `flexDirection: 'row'` on the outer header container with `justifyContent: 'space-between'` to push the logo to the left and moon icon to the right. The tagline goes in a separate `View` below that row.

**File to Create:**
`/Users/loris/TowLink/components/onboarding/OnboardingHeader.tsx`

**Success Criteria:**
- [ ] Component file exists
- [ ] Accepts `tagline`, `onDarkModeToggle`, `isDarkMode` props
- [ ] TowLink emoji + name shows on the left
- [ ] Moon icon shows on the right, is pressable
- [ ] Tagline text shows below the logo/icon row
- [ ] Horizontal divider line at the bottom of the header
- [ ] No TypeScript errors
- [ ] You can explain the purpose of the `?` on optional props

**Design Reference:**
Open `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Welcome Screen.png` - the header is the section at the very top with the logo, "Roadside Assistance On-Demand" subtitle, and moon icon.

---

### Step 3: Create the `PaginationDots` Component

**Status**: [x] Complete

**Learning Objective:**
Learn conditional styling - changing a component's appearance based on data. This is one of the most common patterns in React Native UI development.

**Concept - Array Styles:**
In React Native, you can pass an array to the `style` prop: `style={[styles.base, condition && styles.variant]}`. When `condition` is false, `false` is ignored by React Native. This is how you apply variant styles without duplicating the base styles.

**Concept - Generating a List from a Number:**
You will not hardcode 3 dots - instead you'll generate them dynamically from the `total` prop. This way the component works for any number of slides. The pattern is:
```typescript
Array.from({ length: total }, (_, i) => i)
```
This creates `[0, 1, 2]` when `total` is 3. You then `.map()` over it to render each dot.

**What to Do:**
1. Create `components/onboarding/PaginationDots.tsx`
2. Accept `total` (number) and `activeIndex` (number) as props
3. Render `total` dots in a horizontal row
4. The dot at `activeIndex` renders as a pill shape (wider); all others render as small circles

**Visual Spec:**
- Active dot: `width: 24, height: 8, borderRadius: 4, backgroundColor: '#1E6FD9'`
- Inactive dot: `width: 8, height: 8, borderRadius: 4, backgroundColor: '#C4C4C4'`
- Gap between dots: `marginHorizontal: 3`
- Row container: `flexDirection: 'row', alignItems: 'center'`

**File to Create:**
`/Users/loris/TowLink/components/onboarding/PaginationDots.tsx`

**Success Criteria:**
- [ ] Component renders `total` dots
- [ ] Active dot is visually wider (pill shape)
- [ ] Inactive dots are small circles
- [ ] Dots are horizontal and centered
- [ ] No TypeScript errors
- [ ] You can explain how `Array.from` works and why you use it here

**Checkpoint Test:**
You can't test this in isolation yet, but you can create a quick test by importing it into any existing screen temporarily and passing `total={3} activeIndex={1}`. Verify the middle dot is wider. Then remove the test import.

---

### Step 4: Create the `OnboardingSlide` Component

**Status**: [x] Complete

**Learning Objective:**
Learn to use `Dimensions` for screen-width-aware layout. You'll also practice centering content both vertically and horizontally - a fundamental mobile layout skill.

**Concept - Why `Dimensions.get('window').width`:**
When you build a horizontal pager with `FlatList`, each "page" must be exactly as wide as the screen so only one slides is visible at a time. But React Native doesn't let you write `width: '100%'` on a FlatList item reliably for this use case. Instead you read the actual device width at render time using `Dimensions`. This is a standard pattern for FlatList pagers.

**Concept - The Circle Icon:**
The centered icon-in-a-circle visual is built by giving a `View` equal `width` and `height` and then setting `borderRadius` to half of that value. A borderRadius of exactly half the width/height turns a rectangle into a circle. Everything inside that View gets clipped to the circle shape.

**What to Do:**
1. Create `components/onboarding/OnboardingSlide.tsx`
2. Import `Dimensions` from `react-native`
3. Outside the component, store screen width: `const { width } = Dimensions.get('window');`
4. The component root `View` should have `width: width` so it takes up exactly one page in a FlatList
5. Inside: a centered circle View containing an `Ionicons` icon, then the heading text, then the subtext below

**Props to Accept:**
```typescript
interface OnboardingSlideProps {
  iconName: string;
  heading: string;
  subtext: string;
}
```

**Visual Spec:**
- Root: `width: screenWidth, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32`
- Icon circle: `width: 160, height: 160, borderRadius: 80, backgroundColor: '#EBF4FD', justifyContent: 'center', alignItems: 'center'`
- Icon inside circle: `Ionicons` at size 72, color `'#1E6FD9'`
- Heading: `fontSize: 28, fontWeight: 'bold', marginTop: 40, textAlign: 'center', color: '#1A1A2E'`
- Subtext: `fontSize: 16, color: '#555555', textAlign: 'center', lineHeight: 24, marginTop: 16`

**File to Create:**
`/Users/loris/TowLink/components/onboarding/OnboardingSlide.tsx`

**Success Criteria:**
- [ ] Component renders with icon circle, heading, and subtext
- [ ] Root view width equals the device screen width
- [ ] Icon is centered inside the circle
- [ ] Heading and subtext are centered below the circle
- [ ] No TypeScript errors
- [ ] You can explain why `width: screenWidth` is needed for the FlatList pager

**Think About This:**
What would happen if you used `width: '100%'` instead of `width: screenWidth`? Try it mentally - what would the FlatList show?

---

### Step 5: Create the `RoleCard` Component

**Status**: [x] Complete

**Learning Objective:**
Practice `flexDirection: 'row'` layout - putting content side by side. This is one of the layouts you'll use constantly in React Native. You'll also learn the difference between a "container" Pressable (the whole card taps) vs an inner Pressable (just a button inside taps).

**Concept - Row Layout:**
By default React Native stacks things vertically (flexDirection: 'column'). Setting `flexDirection: 'row'` on a container makes its children sit side by side. To make the text area take up remaining space after the icon box, give the text View `flex: 1`.

**Concept - Card Border:**
Cards in React Native are made with `borderWidth`, `borderColor`, and `borderRadius`. There is no `Card` component built in - you build it with a styled `View` and sometimes a shadow.

**What to Do:**
1. Create `components/onboarding/RoleCard.tsx`
2. The card itself is a `Pressable` - tapping anywhere on the card triggers `onPress`
3. Inside the card: left icon box, then right text area (`flex: 1`)
4. Inside the text area: bold title, description text, then a "Continue as X ->" link text (styled in blue)

**Props to Accept:**
```typescript
interface RoleCardProps {
  iconName: string;
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
}
```

**Visual Spec:**
- Card: `borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff'`
- Card shadow: `shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2`
- Icon box: `width: 52, height: 52, borderRadius: 10, backgroundColor: '#EBF4FD', justifyContent: 'center', alignItems: 'center'`
- Icon inside box: `Ionicons`, size 28, color `'#1E6FD9'`
- Title: `fontSize: 17, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4`
- Description: `fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 8`
- CTA link text: `fontSize: 14, color: '#1E6FD9', fontWeight: '600'`

**File to Create:**
`/Users/loris/TowLink/components/onboarding/RoleCard.tsx`

**Success Criteria:**
- [ ] Card renders with icon box on the left, text on the right
- [ ] Title, description, and CTA text all display
- [ ] Tapping anywhere on the card calls `onPress`
- [ ] Card has a visible border and subtle shadow
- [ ] Icon box has a light blue background
- [ ] No TypeScript errors
- [ ] You can explain what `flex: 1` on the text View does

**Design Reference:**
Open `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Role Selection.png` to see how the cards should look.

---

### Step 6: Create the Onboarding Sub-Group Layout

**Status**: [x] Complete

**Learning Objective:**
Understand how Expo Router uses the filesystem to define navigation. A `_layout.tsx` file inside a folder tells Expo Router "this is a group of screens, wrap them in this navigator." Nested groups let you have different navigation behavior in different parts of the app.

**Concept - Nested Route Groups:**
Look at the existing `app/(auth)/_layout.tsx` - it creates a Stack navigator for everything inside `(auth)/`. You're now creating a Stack navigator specifically for the onboarding screens inside `(auth)/onboarding/`. This keeps the onboarding flow self-contained and gives you control over navigation behaviour (like hiding the header).

**Concept - Why `headerShown: false`:**
By default, a Stack navigator shows a navigation header bar at the top of each screen with a back button and title. For the onboarding flow, you're building your own custom header (`OnboardingHeader`), so you hide the built-in one to avoid having two headers.

**What to Do:**
1. Create the folder: `app/(auth)/onboarding/`
2. Create `app/(auth)/onboarding/_layout.tsx`
3. Return a `<Stack>` with `screenOptions={{ headerShown: false }}`

This file is intentionally short - that's fine. Its job is just to configure the navigator for this sub-group.

**File to Create:**
`/Users/loris/TowLink/app/(auth)/onboarding/_layout.tsx`

**The Code:**
Look at `app/(auth)/_layout.tsx` - this file should look nearly identical. The only differences are the function name and that it wraps the `onboarding` sub-group.

**Success Criteria:**
- [ ] Folder `app/(auth)/onboarding/` exists
- [ ] `_layout.tsx` file exists inside it
- [ ] Stack navigator is returned with `headerShown: false`
- [ ] No TypeScript errors
- [ ] You can explain what `_layout.tsx` does in Expo Router

---

### Step 7: Build the Onboarding Pager Screen (Screens 1-3)

**Status**: [x] Complete

**Learning Objective:**
This is the most technically involved step. You'll learn:
- How to use a `FlatList` as a horizontal page-snapping pager
- How to use a `ref` to programmatically control a FlatList
- How to listen to scroll events to keep `activeIndex` in sync

**Concept - FlatList as a Pager:**
`FlatList` is React Native's performant list component. When you add `horizontal` + `pagingEnabled` to a FlatList:
- `horizontal` makes items scroll left/right instead of up/down
- `pagingEnabled` makes the scroll snap to exact multiples of the container width (like pages)

Since each `OnboardingSlide` item has `width: screenWidth`, snapping to the container width means snapping to show exactly one slide at a time.

**Concept - Refs:**
A `ref` is a way to directly access a component's underlying object. With a `FlatList` ref, you can call methods like `scrollToIndex()` to programmatically move to a slide when the "Next" button is tapped - without the user having to swipe. Think of refs as a "remote control" for a component.

**Concept - `onMomentumScrollEnd`:**
When a user swipes the pager, the FlatList fires this event after the scroll animation settles. The event includes `contentOffset.x` - how far the list has been scrolled horizontally. Dividing `contentOffset.x` by the screen width (and rounding) gives you the index of the currently visible slide.

**Concept - Fixed vs Scrolling Elements:**
The header, pagination dots, and button must stay fixed while only the slide content scrolls. This is why you must place `OnboardingHeader`, `PaginationDots`, and the button OUTSIDE the `FlatList` tag. If they were inside the FlatList as items, they would scroll away with the slides.

**What to Do:**
1. Create `app/(auth)/onboarding/index.tsx`
2. Define the `SLIDES` constant array (static data, outside the component):
   ```
   - Welcome: iconName 'location', heading 'Welcome to TowLink', subtext as per spec
   - Fast: iconName 'flash', heading 'Fast & Reliable', subtext as per spec
   - Secure: iconName 'shield-checkmark', heading 'Safe & Secure', subtext as per spec
   ```
3. Set up state and ref:
   - `activeIndex` state (number, starts at 0)
   - `flatListRef` using `useRef<FlatList>(null)`
4. Build the `handleScrollEnd` function that reads `contentOffset.x` from the scroll event and updates `activeIndex`
5. Build the `handleNext` function:
   - If `activeIndex < SLIDES.length - 1`: scroll forward using `flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true })`
   - If `activeIndex === SLIDES.length - 1`: navigate to role selection with `router.push('/(auth)/onboarding/role-selection')`
6. Layout structure (in order, top to bottom):
   ```
   <SafeAreaView flex:1 backgroundColor:'#fff'>
     <OnboardingHeader tagline="Roadside Assistance On-Demand" />
     <FlatList
       ref={flatListRef}
       data={SLIDES}
       horizontal
       pagingEnabled
       showsHorizontalScrollIndicator={false}
       keyExtractor={(item) => item.id}
       renderItem={({ item }) => <OnboardingSlide ...item />}
       onMomentumScrollEnd={handleScrollEnd}
     />
     <View (bottom section, paddingHorizontal:24, paddingBottom:40)>
       <PaginationDots total={3} activeIndex={activeIndex} />
       <Pressable (Next/Get Started button) onPress={handleNext}>
         <Text>{activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'} →</Text>
       </Pressable>
     </View>
   </SafeAreaView>
   ```

**Button Styling:**
- Full width: `width: '100%'`
- Blue background: `backgroundColor: '#2176FF'`
- Rounded: `borderRadius: 30`
- Padding: `paddingVertical: 16`
- Text: white, bold, `fontSize: 17`, centered
- Add `marginTop: 24` between PaginationDots and button

**Imports You'll Need:**
```typescript
import { FlatList, Pressable, SafeAreaView, Text, View, Dimensions } from 'react-native';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SlideData } from '@/types/onboarding';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import OnboardingSlide from '@/components/onboarding/OnboardingSlide';
import PaginationDots from '@/components/onboarding/PaginationDots';
```

**File to Create:**
`/Users/loris/TowLink/app/(auth)/onboarding/index.tsx`

**Success Criteria:**
- [ ] All 3 slides are visible by swiping left/right
- [ ] Pagination dots update as you swipe
- [ ] "Next" button scrolls to the next slide
- [ ] Button label changes to "Get Started" on slide 3
- [ ] Tapping "Get Started" on slide 3 navigates to role selection (will error until Step 8 - that's okay)
- [ ] Swiping also updates the dots correctly
- [ ] Header stays fixed while slides scroll past
- [ ] No TypeScript errors

**Checkpoint - Test This Step:**
Run `npx expo start` and open the app. You should be able to swipe through the 3 slides and use the "Next" button.

**Edge Case Guard:**
Before calling `scrollToIndex`, add this guard to prevent scrolling past the last slide:
```typescript
if (activeIndex >= SLIDES.length - 1) {
  router.push('/(auth)/onboarding/role-selection');
  return;
}
```

---

### Step 8: Build the Role Selection Screen (Screen 4)

**Status**: [x] Complete

**Learning Objective:**
Learn to use AsyncStorage for persisting small pieces of data that survive app restarts. You'll also understand the difference between `router.push` (user can press back) and `router.replace` (removes current screen from the back-stack, user cannot go back).

**Concept - AsyncStorage:**
`AsyncStorage` is React Native's equivalent to `localStorage` in a web browser. It stores key-value pairs as strings on the device. It survives app restarts but is deleted if the app is uninstalled. It's async (returns a Promise) even for simple reads.

Important: AsyncStorage only stores strings. To store a boolean `true`, you store the string `'true'`. When reading, you compare with `=== 'true'`.

**Concept - `router.push` vs `router.replace`:**
- `router.push('/(auth)/signup')` adds the signup screen on top of the stack. The user can press the back button and return to the role selection screen.
- `router.replace('/(auth)/signup')` replaces the current screen. The user cannot go back. This is the correct choice here - once someone has chosen a role and is heading to signup, they should not be able to swipe back to the onboarding flow.

**What to Do:**
1. Create `app/(auth)/onboarding/role-selection.tsx`
2. Import `AsyncStorage` from `@react-native-async-storage/async-storage`
3. Create two handler functions:
   - `handleCustomer`: saves `'onboarding_complete'` as `'true'` in AsyncStorage, then calls `router.replace('/(auth)/signup')`
   - `handleDriver`: same AsyncStorage write, then same `router.replace`
4. Build the layout:
   - `<SafeAreaView>` wrapping everything
   - `<OnboardingHeader tagline="Choose how you want to use TowLink" />`
   - Scrollable content area with `<ScrollView>` (role cards might not fit on smaller phones without it)
   - "I want to..." heading (`fontSize: 32, fontWeight: 'bold'`)
   - Two `<RoleCard>` components with a gap between them
5. Card data:
   - **Customer card:** `iconName="person"`, title `"Get Roadside Assistance"`, description `"Request towing, jump starts, tire changes, and more. Help arrives in minutes."`, ctaLabel `"Continue as Customer"`, `onPress={handleCustomer}`
   - **Driver card:** `iconName="car"`, title `"Drive & Earn Money"`, description `"Be your own boss. Set your schedule and earn money providing roadside assistance."`, ctaLabel `"Continue as Driver"`, `onPress={handleDriver}`

**File to Create:**
`/Users/loris/TowLink/app/(auth)/onboarding/role-selection.tsx`

**Success Criteria:**
- [ ] Screen shows the header with the updated tagline
- [ ] "I want to..." heading is visible
- [ ] Both role cards render correctly
- [ ] Tapping either card navigates to `/(auth)/signup`
- [ ] AsyncStorage is written before navigating (wrap in `async` / `await`)
- [ ] No TypeScript errors
- [ ] You can explain why `router.replace` is used here instead of `router.push`

**Design Reference:**
Open `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Role Selection.png` - match the visual layout.

---

### Step 9: Modify the Auth Index to Check AsyncStorage

**Status**: [x] Complete

**Learning Objective:**
Learn to implement a "gate check" at the start of a navigation flow. This is the pattern used by virtually every app that has an onboarding flow: check persistent storage on mount, then redirect to the right place.

**Concept - Why a Loading State:**
When the component first mounts, the AsyncStorage read takes a small amount of time (it reads from disk). During that time, you don't know yet whether to show onboarding or go to signup. Without a loading state, the component would momentarily render a blank screen or flash the wrong redirect. The `isLoading` state holds up the redirect until the check completes.

**Concept - `useEffect` with Empty Dependency Array:**
`useEffect(() => { ... }, [])` runs once, immediately after the component first renders, and never again. This is the right tool for "run this once when the screen first appears" logic like reading from storage.

**Concept - `<Redirect>` vs `router.push`:**
`<Redirect>` is a special Expo Router component that performs a navigation redirect as part of the render. When you return `<Redirect href="..." />` from a screen component, Expo Router immediately navigates away. This is clean for "this screen is just a decision point" screens that never display any real content.

**What to Do:**
1. Open `app/(auth)/index.tsx`
2. Note the current content - it's just `return <Redirect href="/(auth)/signup" />;`. You're replacing this with the AsyncStorage check.
3. Add these imports: `AsyncStorage`, `useEffect`, `useState`, `ActivityIndicator`, `View`
4. Add state: `isLoading` (boolean, starts `true`) and `onboardingComplete` (boolean, starts `false`)
5. Add a `useEffect` that:
   - Calls an async function that reads `'onboarding_complete'` from AsyncStorage
   - Sets `onboardingComplete` to `true` if the value is `'true'`
   - Wraps everything in a `try/catch` - on error, keep `onboardingComplete` as `false` (show onboarding rather than skip it)
   - Sets `isLoading` to `false` in a `finally` block
6. Add the conditional returns:
   - If `isLoading`: return a centered `<ActivityIndicator size="large" />`
   - If `onboardingComplete`: return `<Redirect href="/(auth)/signup" />`
   - Otherwise: return `<Redirect href="/(auth)/onboarding" />`

**File to Modify:**
`/Users/loris/TowLink/app/(auth)/index.tsx`

**Success Criteria:**
- [ ] A spinner shows briefly when the auth screen first loads
- [ ] First time opening: redirects to onboarding
- [ ] After completing onboarding: redirects directly to signup
- [ ] AsyncStorage error is handled gracefully (shows onboarding, not a crash)
- [ ] No TypeScript errors
- [ ] You can explain why `isLoading` is needed

**To Test "Second Launch" Behavior:**
After completing onboarding once, the key is written. On the next run, you should go straight to signup. To test "first launch" again, temporarily add this to a dev button:
```typescript
await AsyncStorage.removeItem('onboarding_complete');
```

---

### Step 10: Visual Polish - Match the Design Files

**Status**: [ ] Pending

**Learning Objective:**
Learn to compare your implementation against a design mockup and close the gap. This is a critical professional skill - the difference between "it works" and "it looks right."

**What to Do:**
1. Run the app on the iOS Simulator (or device)
2. Open each design PNG file from `.claude/design/screens/onboarding_flow/` in Finder
3. Hold them up side by side and look for differences
4. Fix discrepancies in spacing, font size, colors, and layout

**Comparison Checklist - Screen by Screen:**

**Welcome Screen** (`Welcome Screen.png`):
- [ ] Header: logo left, moon icon right, tagline centered below
- [ ] Thin gray divider below header
- [ ] Icon circle is light blue, large and centered
- [ ] "Welcome to TowLink" heading is bold and large
- [ ] Subtext is readable gray, centered, wraps to 2-3 lines
- [ ] 3 pagination dots visible, first dot is wider/blue
- [ ] "Next" button is full-width, blue, with right arrow

**Fast & Reliable Screen** (swipe to screen 2):
- [ ] Header stays fixed (same header, did not scroll)
- [ ] Lightning bolt icon in the circle
- [ ] "Fast & Reliable" heading
- [ ] Second pagination dot is now active/blue

**Safe & Secure Screen** (swipe to screen 3):
- [ ] Shield checkmark icon
- [ ] "Safe & Secure" heading
- [ ] Button now says "Get Started" instead of "Next"
- [ ] Third pagination dot is now active

**Role Selection Screen** (tap "Get Started"):
- [ ] Header tagline changed to "Choose how you want to use TowLink"
- [ ] No pagination dots on this screen
- [ ] "I want to..." heading is large and bold
- [ ] Both cards render with icon, title, description, and CTA link
- [ ] Cards have visible border and subtle shadow

**Success Criteria:**
- [ ] All 4 screens look close to the design files
- [ ] No obvious visual bugs (text cut off, wrong colors, missing elements)
- [ ] Pagination dots behave correctly when swiping
- [ ] You've made at least 3 visual adjustments after comparing with the designs

**Acceptable Differences:**
- System fonts vs the exact font in the mockup
- Minor pixel-level spacing differences (within ±4px)
- Map tile style differences (not applicable here)

**Fix Priority (in order):**
1. Missing elements (something shown in design but not in your build)
2. Wrong colors (especially the blue `#1E6FD9` vs a generic blue)
3. Wrong sizing (heading too small, icon circle too large, etc.)
4. Spacing refinements (padding, margins, gaps)

---

### Step 11: Test All Acceptance Criteria

**Status**: [ ] Pending

**Learning Objective:**
Learn to test a feature systematically against its acceptance criteria - exactly how QA engineers work.

**What to Do:**
Go through the Jira acceptance criteria one by one and verify each item in the running app.

**Acceptance Criteria Checklist:**

**Screen 1 - Welcome Screen:**
- [ ] TowLink logo/icon + "TowLink" branding in header
- [ ] "Roadside Assistance On-Demand" subtitle in header
- [ ] Dark mode toggle (moon icon) in top-right corner
- [ ] Large location pin icon centered in a light blue circle
- [ ] Bold "Welcome to TowLink" heading
- [ ] Subtext: "The fastest way to get roadside assistance or earn money helping others on the road."
- [ ] Pagination dots - first dot highlighted blue, others gray
- [ ] "Next" button with arrow at the bottom

**Screen 2 - Fast & Reliable:**
- [ ] Same header as Welcome Screen
- [ ] Lightning bolt icon centered in light blue circle
- [ ] Bold "Fast & Reliable" heading
- [ ] Correct subtext
- [ ] Second pagination dot is active
- [ ] "Next" button with arrow

**Screen 3 - Safe & Secure:**
- [ ] Same header as Welcome Screen
- [ ] Shield icon centered in light blue circle
- [ ] Bold "Safe & Secure" heading
- [ ] Correct subtext
- [ ] Third pagination dot is active
- [ ] Button says "Get Started" (not "Next")

**Screen 4 - Role Selection:**
- [ ] Header subtitle: "Choose how you want to use TowLink"
- [ ] Dark mode toggle visible
- [ ] "I want to..." heading
- [ ] Card 1: person icon, "Get Roadside Assistance", description, "Continue as Customer ->" link
- [ ] Card 2: car/truck icon, "Drive & Earn Money", description, "Continue as Driver ->" link

**Navigation Flow:**
- [ ] Welcome -> Fast & Reliable -> Safe & Secure -> Role Selection works
- [ ] Tapping "Continue as Customer" navigates to signup screen
- [ ] Tapping "Continue as Driver" navigates to signup screen

**AsyncStorage Behavior:**
- [ ] First launch shows onboarding
- [ ] After completing onboarding, relaunching app skips onboarding and goes to signup
- [ ] After using "Continue as Customer/Driver", back button does NOT return to onboarding (role-selection used `router.replace`)

**Swipe Gesture:**
- [ ] Swiping left/right on slides works
- [ ] Dots update correctly when swiping (not just when using the button)

**Dark Mode Toggle:**
- [ ] Moon icon is tappable and does not crash the app

---

### Step 12: Code Review and Cleanup

**Status**: [ ] Pending

**Learning Objective:**
Review your own code before it goes to the quality-reviewer agent. The goal is to catch things yourself before someone else does - a professional habit.

**What to Do:**
Go through each file you created/modified and apply this checklist.

**Files to Review:**
- `types/onboarding.ts`
- `components/onboarding/OnboardingHeader.tsx`
- `components/onboarding/PaginationDots.tsx`
- `components/onboarding/OnboardingSlide.tsx`
- `components/onboarding/RoleCard.tsx`
- `app/(auth)/onboarding/_layout.tsx`
- `app/(auth)/onboarding/index.tsx`
- `app/(auth)/onboarding/role-selection.tsx`
- `app/(auth)/index.tsx`

**TypeScript Quality:**
- [ ] No `any` types anywhere
- [ ] All function return types are clear (or TypeScript can infer them cleanly)
- [ ] All component props are typed with interfaces
- [ ] No TypeScript errors when you run the app

**Imports:**
- [ ] No unused imports
- [ ] Imports are grouped: React imports first, then React Native, then expo/external, then local files
- [ ] All local imports use `@/` path aliases (e.g., `@/components/onboarding/OnboardingHeader`)

**React Best Practices:**
- [ ] The `SLIDES` constant is defined outside the component (it doesn't change, so it shouldn't be inside)
- [ ] The `screenWidth` from `Dimensions.get('window').width` is defined outside the component for the same reason
- [ ] `useEffect` in `auth/index.tsx` has a correct empty dependency array `[]`

**Code Readability:**
- [ ] Any logic that is non-obvious has a short comment explaining why
- [ ] No debug `console.log` statements left in (remove them or replace with meaningful ones)
- [ ] Variable names describe what they contain (not `x`, `temp`, `data`)

**Async/Await:**
- [ ] AsyncStorage calls in `role-selection.tsx` are awaited before navigating
- [ ] AsyncStorage read in `auth/index.tsx` has a try/catch/finally block

**Component Structure:**
- [ ] Each component file follows: imports -> interface -> component function -> StyleSheet
- [ ] StyleSheet is at the bottom of the file (consistent with rest of codebase)

**Success Criteria:**
- [ ] All checklist items reviewed
- [ ] At least 3 improvements made during this review
- [ ] Code feels clean and readable
- [ ] You're happy to have another developer look at this code

---

### Step 13: Commit Your Work

**Status**: [ ] Pending

**Learning Objective:**
Learn to write a meaningful git commit message that describes what changed and why - not just "fixed stuff."

**What to Do:**
1. Verify you are on the correct branch: `git status` should show branch `TOW-71-fe-sprint-1-general-onboarding-flow-up-to-role-selection`
2. Add all your new and modified files: `git add .`
3. Review what you're committing: `git diff --staged --stat`
4. Commit with a descriptive message

**Good Commit Message Format:**
```
TOW-71: implement onboarding flow UI (Welcome, Fast & Reliable, Safe & Secure, Role Selection)

- Add 4 reusable components: OnboardingHeader, PaginationDots, OnboardingSlide, RoleCard
- Build 3-screen FlatList pager at (auth)/onboarding/index
- Add role selection screen at (auth)/onboarding/role-selection
- Add AsyncStorage first-launch check in (auth)/index
- Create onboarding TypeScript types
```

**Why This Format:**
- First line: ticket reference + short summary (what you built)
- Blank line separating summary from details
- Bullet list of specific changes (what files/features changed)

This format helps teammates (and your future self) understand exactly what changed without opening every file.

**Commands:**
```bash
git add .
git diff --staged --stat
git commit -m "TOW-71: implement onboarding flow UI (Welcome, Fast & Reliable, Safe & Secure, Role Selection)"
```

**Success Criteria:**
- [ ] All 9 files are staged and committed
- [ ] Commit message references TOW-71
- [ ] `git log --oneline -3` shows your new commit at the top

---

## Notes and Decisions

### Design Decisions Made

(Document any important decisions you make during implementation - write these as you go)

Example format:
- **Decision**: Used `SafeAreaView` instead of `View` as root for all onboarding screens
- **Reason**: `SafeAreaView` automatically avoids the notch/island area on iPhones and the status bar on Android
- **Alternative considered**: `View` with manual top padding
- **Date**: [Date when you made this decision]

---

### Bugs Found and Fixed

(Track bugs you discovered during testing - useful for the quality-reviewer)

Example format:
- **Bug**: Pagination dots didn't update when swiping (only when tapping Next)
- **Fix**: Added `onMomentumScrollEnd` handler to the FlatList
- **Found in**: Step 10 - visual testing

---

### Deviations from Spec

(Note any intentional differences from `.claude/specs/TOW-71.md`)

Example format:
- **Deviation**: Used `ScrollView` wrapping the role cards instead of no scroll on role selection screen
- **Reason**: Role cards were clipped on smaller screen sizes (iPhone SE)
- **Impact**: No functional difference

---

### Questions for Coach

(Write questions here as they come up - don't block yourself, move forward and ask)

---

## Resources and References

### Project Files
- Technical Spec: `.claude/specs/TOW-71.md`
- Story Context: `.claude/context/current-story.md`
- Architecture Doc: `.claude/docs/ARCHITECTURE.md`
- Patterns Doc: `.claude/docs/PATTERNS.md`

### Design Files
- General Flow: `.claude/design/screens/onboarding_flow/General Flow.png`
- Welcome Screen: `.claude/design/screens/onboarding_flow/Welcome Screen.png`
- Fast & Reliable: `.claude/design/screens/onboarding_flow/Fast & Reliable.png`
- Safe & Secure: `.claude/design/screens/onboarding_flow/Get Started.png`
- Role Selection: `.claude/design/screens/onboarding_flow/Role Selection.png`

### Related Existing Files (Reference These While Building)
- Existing role selection (functional, no new styling): `app/(auth)/role-selection.tsx`
- Auth layout (pattern for `_layout.tsx`): `app/(auth)/_layout.tsx`
- Auth index (file you will modify): `app/(auth)/index.tsx`
- Type definitions pattern: `types/models.ts`
- Existing component pattern: `components/RequestPopup.tsx`

### External Documentation
- React Native FlatList: https://reactnative.dev/docs/flatlist
- React Native Dimensions: https://reactnative.dev/docs/dimensions
- AsyncStorage: https://react-native-async-storage.github.io/async-storage/
- Expo Router navigation: https://docs.expo.dev/router/navigating-pages/
- Expo Vector Icons: https://docs.expo.dev/guides/icons/
- Ionicons icon browser: https://ionic.io/ionicons

---

## Time Tracking (Optional)

Track time spent on each step to help estimate future stories:

- Step 1 - Types: [Duration]
- Step 2 - OnboardingHeader: [Duration]
- Step 3 - PaginationDots: [Duration]
- Step 4 - OnboardingSlide: [Duration]
- Step 5 - RoleCard: [Duration]
- Step 6 - Onboarding Layout: [Duration]
- Step 7 - Pager Screen: [Duration]
- Step 8 - Role Selection Screen: [Duration]
- Step 9 - Auth Index: [Duration]
- Step 10 - Visual Polish: [Duration]
- Step 11 - Acceptance Criteria Testing: [Duration]
- Step 12 - Code Review: [Duration]
- Step 13 - Git Commit: [Duration]

**Total Time**: [Sum]

---

## Ready for Review

When all steps are complete, check these boxes:

- [ ] All 13 steps marked complete above
- [ ] All acceptance criteria verified in Step 11
- [ ] Code reviewed in Step 12
- [ ] Git commit made in Step 13
- [ ] UI closely matches the design PNG files
- [ ] AsyncStorage skip-onboarding behavior works correctly
- [ ] No TypeScript errors
- [ ] No console errors during normal use

**Ready for quality-reviewer agent**: [ ] Yes / [ ] No

---

_Last Updated: 2026-02-22_
_Student: Chris_
_Story: TOW-71 - FE Sprint 1 - General Onboarding Flow up to Role Selection_
_Spec Reference: `.claude/specs/TOW-71.md`_
