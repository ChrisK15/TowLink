# Implementation Progress: TOW-51 - Basic Request Pop-Up UI

**Story**: TOW-51 - Basic Request Pop-Up UI
**Epic**: EPIC 3: Driver Job Management
**Sprint**: TOW Sprint 2 (2026-02-12 to 2026-02-24)
**Story Points**: 3
**Started**: 2026-02-16
**Completed**: 2026-02-16
**Status**: ✅ COMPLETE

---

## 🎯 Technical Approach Change

**Original Plan**: Use `@gorhom/bottom-sheet` library for a slide-up bottom sheet UI.

**What Actually Happened**: After troubleshooting library compatibility issues with Expo Router and React Native Reanimated configuration, we pivoted to using **React Native's built-in Modal component** with a full-screen presentation. This turned out to be:
- ✅ Simpler and more reliable
- ✅ No third-party dependencies needed
- ✅ Better learning experience (understanding when to pivot vs. debug)

**Key Learning**: Sometimes the simpler solution is the better solution. Knowing when to pivot is an important engineering skill!

---

## Learning Overview

This story taught you how to build **modal popup UI components** for displaying time-sensitive information to users. You learned about React Native's Modal component, countdown timers, mock data patterns, and conditional rendering.

### Key Learning Objectives ✅

1. **React Native Modal Component** - Using the built-in Modal for full-screen overlays
2. **Timer & State Management** - Implementing countdown timers with useEffect and useState
3. **Component Communication** - Parent-child callbacks (onAccept, onDecline) and prop drilling
4. **Mock Data Systems** - Creating realistic test data with varied scenarios
5. **Conditional Rendering** - Handling optional fields gracefully with fallbacks
6. **UI/UX Polish** - Progress bars, color changes, smooth animations, professional styling
7. **Problem-Solving** - Learning when to pivot technical approaches vs. debugging

---

## Implementation Roadmap

### Phase 1: Setup & Data Model
- [x] Step 1: Extend TypeScript Types (Request interface)
- [x] Step 2: Add optional fields for UI enhancements (distances, ETA, notes, price)

### Phase 2: Data Layer (Mock Data)
- [x] Step 3: Create Mock Request Data (3 diverse scenarios)
- [x] Step 4: Add realistic values for distances, ETA, and customer notes

### Phase 3: Component Building (Modal UI)
- [x] Step 5: Build RequestPopup Component with React Native Modal
- [x] Step 6: Implement countdown timer with auto-decline
- [x] Step 7: Add progress bar with color changes
- [x] Step 8: Build all UI sections (commuter info, locations, service, vehicle, notes, ETA cards)
- [x] Step 9: Add Accept/Decline action buttons

### Phase 4: Integration
- [x] Step 10: Integrate RequestPopup into Driver Screen
- [x] Step 11: Add Test Trigger Button
- [x] Connect state management (visible, currentRequest, handlers)

### Phase 5: Testing & Polish
- [x] Step 12: Manual testing with mock data
- [x] Step 13: Style refinement to match design mockup
- [x] Step 14: Handle optional fields gracefully
- [x] Step 15: Clean up debugging code

---

## Step-by-Step Lesson Plan

### Step 1: Install Bottom Sheet Library

**Learning Goal**: Understanding how to add third-party UI libraries to Expo projects and check compatibility.

**Background Knowledge**:
Bottom sheets are a common mobile UI pattern where content slides up from the bottom of the screen. Think of how Uber shows driver details or how Apple Maps shows location info. We're using `@gorhom/bottom-sheet` because it:
- Works seamlessly with Expo
- Uses Reanimated 2 for smooth 60fps animations
- Supports gestures out of the box
- Has great documentation

**Your Task**:
1. Open your terminal
2. Run the installation command:
   ```bash
   npx expo install @gorhom/bottom-sheet
   ```
3. After installation, verify it was added to `package.json`
4. Start your dev server to ensure no errors: `npx expo start`

**Check Your Understanding**:
- Why do we use `npx expo install` instead of `npm install`?
  (Hint: Expo manages compatible versions for you)
- What dependencies does this library need? (Check the docs or package.json)

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 2: Configure Root Layout for Gestures

**Learning Goal**: Understanding React Native gesture handling and provider patterns.

**Background Knowledge**:
The bottom sheet needs two things to work:
1. **GestureHandlerRootView** - Enables swipe, drag, and touch gestures across your entire app
2. **BottomSheetModalProvider** - Provides context for bottom sheets to manage their state

Think of these as "enabling switches" that must wrap your whole app. This is a common pattern in React Native - providers give special powers to child components.

**Before You Start - Let's Think**:
- Where in your app structure would you put something that needs to affect EVERYTHING?
- Have you seen provider patterns before? (Hint: You use `AuthProvider` already!)

**Your Task**:
1. Open `app/_layout.tsx`
2. Read through the current structure - what's already wrapping the app?
3. Add these imports at the top:
   ```typescript
   import { GestureHandlerRootView } from 'react-native-gesture-handler';
   import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
   ```
4. Wrap your existing layout with both providers:
   - Outermost: `GestureHandlerRootView` with `style={{ flex: 1 }}`
   - Inside that: `BottomSheetModalProvider`
   - Inside that: Your existing layout code

**Think About**:
- Why does the order matter? (Which needs to be outer vs inner?)
- What does `flex: 1` do on the GestureHandlerRootView?

**Verification**:
- Run your app - it should look exactly the same
- No TypeScript errors
- No console warnings about gesture handlers

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 3: Extend TypeScript Types

**Learning Goal**: Learning how to extend existing interfaces for new UI requirements.

**Background Knowledge**:
You already have a `Request` interface in `types/models.ts`, but it was designed for backend data. Now we need to add fields that the UI needs to display, like the commuter's name and vehicle details.

**Before You Code - Design Discussion**:
Look at the existing `Request` interface:
- What fields does it already have?
- What information would a driver want to see before accepting a tow request?
- Should these new fields be required or optional? Why?

**Your Task**:
1. Open `types/models.ts`
2. Find the `Request` interface
3. Add these optional fields (notice the `?` - why are they optional?):
   ```typescript
   commuterName?: string;           // Display name in popup
   commuterPhone?: string;          // Contact info (future use)
   vehicleInfo?: VehicleInfo;       // Car details for the popup
   ```

**Think About**:
- Why use optional fields (`?`) instead of required fields?
- What happens if a real request doesn't have this data?
- How will you handle missing data in the UI?

**Verification**:
- Run TypeScript checker (your editor should show no errors)
- Try creating a mock request object - does it accept these new fields?

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 4: Create Mock Request Data

**Learning Goal**: Learning to create realistic test data that's separate from production code.

**Background Knowledge**:
In Phase 2, we focus on UI and user experience. We don't have real requests from Firebase yet (that's Phase 3), so we need **mock data** - fake but realistic data for testing.

Good mock data helps you:
- Test your UI with different scenarios
- Don't need a backend to develop
- Share examples with teammates
- Create consistent test cases

**Design Challenge - Before You Code**:
What makes a "good" mock request?
- Should the addresses be real places?
- How many different scenarios should you create?
- What edge cases should you test? (long names, long addresses, etc.)

**Your Task**:
1. Create a new file: `services/mockData/requests.ts`
2. Import your types at the top
3. Create an array of 3 mock requests with realistic data:
   - Different commuter names
   - Different locations (you can use LA coordinates from the spec)
   - Different vehicles
   - Different phone numbers
4. Add a helper function `getRandomMockRequest()` that returns a random request

**Refer to the spec** (`.claude/specs/TOW-51.md` Step 4) for a complete template, but try building it yourself first.

**Think About**:
- How do you create a Date object for "30 minutes from now"?
- Why separate mock data into its own file instead of putting it in the component?
- What makes mock data "realistic"?

**Verification**:
- Import your mock data in a component and console.log it
- Check that all required Request fields are present
- Try calling `getRandomMockRequest()` multiple times - do you get different requests?

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 5: Build RequestPopup Component (Part A: Structure)

**Learning Goal**: Building complex UI components with proper React patterns.

**Background Knowledge**:
This is your first "advanced" component! It uses:
- **useRef** - To directly control the bottom sheet
- **useMemo** - To avoid recalculating snap points every render
- **useCallback** - To create stable function references for performance

You're building a component that will be reused and needs to be professional-quality.

**Before You Code - Architecture Discussion**:
Let's plan the component structure:
```
RequestPopup
├── What props does it need?
│   ├── The request data to display
│   ├── Callbacks for accept/decline
│   └── Is it visible?
├── What state does it manage internally?
│   └── (Hint: The bottom sheet library manages most state)
└── What does it render?
    ├── Bottom sheet container
    └── Content sections (header, commuter, locations, vehicle, buttons)
```

**Your Task - Part A (Structure)**:

1. Create `components/RequestPopup.tsx`

2. Set up the component skeleton:
   ```typescript
   import { Request } from '@/types/models';
   import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
   import { useCallback, useMemo, useRef } from 'react';
   import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

   interface RequestPopupProps {
     // What props do you need? Think about what the parent needs to control
   }

   export function RequestPopup({ /* destructure props */ }: RequestPopupProps) {
     // Set up refs and memoized values

     // What should happen if there's no request?

     // Return the BottomSheet component
   }
   ```

3. Define your snap points using `useMemo`:
   ```typescript
   const snapPoints = useMemo(() => ['50%', '85%'], []);
   ```

**Think About**:
- Why use `useMemo` for snap points?
- What does a snap point of '50%' mean?
- Why have multiple snap points?

4. Create the backdrop renderer using `useCallback`:
   ```typescript
   const renderBackdrop = useCallback(
     (props: any) => (
       <BottomSheetBackdrop
         {...props}
         disappearsOnIndex={-1}  // What does -1 mean?
         appearsOnIndex={0}      // What does 0 mean?
         opacity={0.5}
       />
     ),
     []
   );
   ```

**Think About**:
- Why use `useCallback` here?
- What does the `[]` dependency array mean?

5. Set up the BottomSheet with proper configuration (refer to spec for details)

**Checkpoint Before Moving to Part B**:
- Can you render a simple BottomSheet with just "Hello World" text?
- Does it slide up from the bottom?
- Can you drag it?
- Does the backdrop appear?

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 6: Build RequestPopup Component (Part B: Content & Styling)

**Learning Goal**: Professional UI design with proper information hierarchy and styling.

**Background Knowledge**:
Good UI design has **visual hierarchy** - the most important info stands out. For a tow request:
1. Most important: Commuter name and location
2. Important: Vehicle details
3. Critical actions: Accept/Decline buttons

You'll learn about:
- Typography hierarchy (different font sizes/weights)
- Spacing and padding for readability
- Color psychology (green = accept, red = decline)
- Touch target sizes for accessibility

**Design Challenge - Before You Code**:
Sketch out on paper:
- What sections do you need? (Header, Commuter Info, Locations, Vehicle, Buttons)
- What order should they be in?
- How much space between sections?
- What should stand out?

**Your Task**:

1. Inside your BottomSheet, create the content structure:
   ```typescript
   <View style={styles.contentContainer}>
     {/* Header Section */}
     <View style={styles.header}>
       <Text style={styles.title}>New Service Request</Text>
       <Text style={styles.subtitle}>Review details before accepting</Text>
     </View>

     {/* Commuter Info Section */}
     {/* Location Sections (Pickup & Dropoff) */}
     {/* Vehicle Section (conditional - only if vehicleInfo exists) */}
     {/* Service Type Badge */}
     {/* Action Buttons */}
   </View>
   ```

2. For each section, think about:
   - What data from `request` do you display?
   - How do you handle missing optional data? (`request.commuterName || 'Unknown'`)
   - What styles make it readable?

3. Create your StyleSheet with proper:
   - Font sizes (title: 22, body: 15-18, labels: 11)
   - Colors (refer to spec for color palette)
   - Spacing (consistent margins/padding)
   - Button styles (min height 48px for accessibility)

**Refer to the complete component in the spec** (`.claude/specs/TOW-51.md` Step 5), but try implementing it yourself first!

**Think About**:
- Why use emoji icons (📍, 🏁, 🚗)? (Hint: Simple, universal, no image files needed)
- Why set a minimum button height?
- What's the difference between `marginBottom` and `paddingBottom`?

**Style Considerations**:
```typescript
// Good touch target size (accessibility)
button: {
  minHeight: 48,
  paddingVertical: 16,
  borderRadius: 12,
}

// Clear visual hierarchy
title: {
  fontSize: 22,
  fontWeight: 'bold',
}
sectionLabel: {
  fontSize: 11,
  fontWeight: '600',
  color: '#8E8E93',  // Gray for labels
}
```

**Verification**:
- Does all the request data display correctly?
- Is text readable on both light and dark backgrounds?
- Do buttons look tappable?
- Does the layout work on different screen sizes?

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 7: Integrate RequestPopup into Driver Screen

**Learning Goal**: State management for modal overlays and component communication.

**Background Knowledge**:
Your RequestPopup is a "controlled component" - the parent (DriverScreen) controls:
- Whether it's visible
- What data it shows
- What happens when buttons are pressed

This is a common React pattern. Think of it like a TV:
- The TV (RequestPopup) can display content
- The remote (DriverScreen state) controls what's on and when

**Architecture Discussion - Before You Code**:
What state does DriverScreen need to manage?
- `showPopup` - boolean, is it visible?
- `currentRequest` - which request to show?

What callbacks do you need?
- `onAccept` - what happens when driver taps Accept?
- `onDecline` - what happens when driver taps Decline?
- `onDismiss` - what happens when driver swipes down or taps backdrop?

**Your Task**:

1. Open `app/(driver)/index.tsx`

2. Add imports:
   ```typescript
   import { RequestPopup } from '@/components/RequestPopup';
   import { getRandomMockRequest } from '@/services/mockData/requests';
   import { Request } from '@/types/models';
   ```

3. Add state (below your existing state):
   ```typescript
   const [showPopup, setShowPopup] = useState(false);
   const [currentRequest, setCurrentRequest] = useState<Request | null>(null);
   ```

**Think About**:
- Why initialize `currentRequest` to `null`?
- What does `Request | null` mean in TypeScript?

4. Add the RequestPopup component at the end of your return statement (after the location button, before the closing `</View>`):
   ```typescript
   <RequestPopup
     request={currentRequest}
     isVisible={showPopup && isOnline}  // Why && isOnline?
     onAccept={(requestId) => {
       console.log('✅ ACCEPT REQUEST:', requestId);
       Alert.alert('Request Accepted', `You accepted request ${requestId}`);
       setShowPopup(false);
       setCurrentRequest(null);
     }}
     onDecline={(requestId) => {
       console.log('❌ DECLINE REQUEST:', requestId);
       Alert.alert('Request Declined', `You declined request ${requestId}`);
       setShowPopup(false);
       setCurrentRequest(null);
     }}
     onDismiss={() => {
       console.log('🔽 DISMISS POPUP');
       setShowPopup(false);
       setCurrentRequest(null);
     }}
   />
   ```

**Think About**:
- Why do we need to reset BOTH `showPopup` and `currentRequest`?
- What do the console.log statements help with?
- Why check `isOnline` in the `isVisible` prop?

**Verification**:
- Does your app still compile?
- TypeScript should be happy with all the props
- No popup should appear yet (we haven't triggered it)

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 8: Add Test Trigger Mechanism

**Learning Goal**: Debugging UI with test buttons and conditional rendering.

**Background Knowledge**:
We don't have real requests yet, so we need a way to manually trigger the popup for testing. This is a common development pattern - add temporary test buttons during development, remove them in production.

**Design Discussion**:
Where should the test button go?
- Should it always be visible?
- Should it only show when the driver is online? (Yes! Why?)
- Where on screen won't it overlap other UI?

**Your Task**:

1. Add a test button in your driver screen (add this after the info banner, around line 251):
   ```typescript
   {/* Test Button - Trigger Request Popup (TEMPORARY) */}
   {isOnline && (
     <TouchableOpacity
       style={styles.testButton}
       onPress={() => {
         const mockRequest = getRandomMockRequest();
         console.log('🧪 Testing with request:', mockRequest.id);
         setCurrentRequest(mockRequest);
         setShowPopup(true);
       }}
     >
       <Text style={styles.testButtonText}>Test Request</Text>
     </TouchableOpacity>
   )}
   ```

**Think About**:
- Why wrap it in `{isOnline && ...}`?
- Why log the request ID to console?
- What happens if you tap the button multiple times?

2. Add styles for the test button:
   ```typescript
   testButton: {
     position: 'absolute',
     top: 210,  // Position below the info banner
     right: 20,
     backgroundColor: '#5856D6',  // Purple (different from other buttons)
     paddingHorizontal: 16,
     paddingVertical: 10,
     borderRadius: 8,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.2,
     shadowRadius: 4,
     elevation: 3,
   },
   testButtonText: {
     color: 'white',
     fontSize: 12,
     fontWeight: 'bold',
   },
   ```

**Think About**:
- Why use a different color (purple) than your other buttons?
- Why use `position: 'absolute'`?
- How do you make sure it doesn't overlap other UI elements?

**Verification**:
- Button appears when you go online
- Button disappears when you go offline
- Tapping the button triggers the popup
- Console shows the test request ID

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes**:
<!-- Student: Add any issues or observations here -->

---

### Step 9: Manual Testing of Interactions

**Learning Goal**: Systematic QA testing and identifying edge cases.

**Background Knowledge**:
Professional developers don't just build features - they thoroughly test them. Good testing finds bugs before users do. You need to test:
- Happy path (everything works as expected)
- Edge cases (what if driver goes offline during popup?)
- User mistakes (what if they tap buttons rapidly?)

**Testing Philosophy**:
Think like a user who's trying to break your app. What weird things might they do?

**Your Comprehensive Test Plan**:

#### Test 1: Basic Popup Display
1. Go online
2. Tap "Test Request" button
3. Verify:
   - [ ] Bottom sheet slides up smoothly
   - [ ] Map dims with overlay
   - [ ] All request details are visible and readable
   - [ ] Commuter name displays
   - [ ] Pickup address displays
   - [ ] Dropoff address displays
   - [ ] Vehicle info displays
   - [ ] Both buttons are visible

#### Test 2: Accept Flow
1. Trigger popup
2. Tap "Accept Request" button
3. Verify:
   - [ ] Alert shows "Request Accepted"
   - [ ] Console logs "✅ ACCEPT REQUEST: [id]"
   - [ ] Popup closes smoothly
   - [ ] Can trigger a new popup after accepting

#### Test 3: Decline Flow
1. Trigger popup
2. Tap "Decline" button
3. Verify:
   - [ ] Alert shows "Request Declined"
   - [ ] Console logs "❌ DECLINE REQUEST: [id]"
   - [ ] Popup closes smoothly

#### Test 4: Dismiss by Backdrop
1. Trigger popup
2. Tap on the dimmed map area (backdrop)
3. Verify:
   - [ ] Popup closes
   - [ ] Console logs "🔽 DISMISS POPUP"
   - [ ] No error messages

#### Test 5: Dismiss by Dragging
1. Trigger popup
2. Drag the bottom sheet downward
3. Verify:
   - [ ] Sheet follows your finger
   - [ ] Releasing dismisses it
   - [ ] Smooth animation
   - [ ] Console logs dismiss

#### Test 6: Dragging Up/Down
1. Trigger popup
2. Drag the sheet up (to expand)
3. Verify:
   - [ ] Sheet expands to show more content
   - [ ] Snaps to defined snap point (85%)
4. Drag down partially (not fully dismissing)
5. Verify:
   - [ ] Sheet snaps back to 50%

#### Test 7: Online/Offline Integration (CRITICAL)
1. Go online
2. Trigger popup (popup is now showing)
3. Toggle driver offline
4. Verify:
   - [ ] Popup dismisses automatically
   - [ ] No crash or error
5. Try tapping test button while offline
6. Verify:
   - [ ] Button is hidden
   - [ ] Cannot trigger popup while offline

#### Test 8: Multiple Requests in Sequence
1. Trigger popup
2. Accept or decline
3. Immediately trigger another popup
4. Verify:
   - [ ] New request has different data
   - [ ] Different request ID in console
   - [ ] Smooth transition between popups
   - [ ] No memory leaks (app doesn't slow down)

#### Test 9: Rapid Button Tapping
1. Trigger popup
2. Tap "Accept" button 5 times rapidly
3. Verify:
   - [ ] Only one alert appears
   - [ ] No duplicate actions
   - [ ] App doesn't crash

#### Test 10: Different Mock Data
1. Trigger popup multiple times
2. Verify each time:
   - [ ] Different commuter names appear
   - [ ] Different addresses appear
   - [ ] Different vehicles appear
   - [ ] All formatting is correct regardless of content

**Document Issues**:
For any test that fails, document:
- What did you expect to happen?
- What actually happened?
- Can you reproduce it consistently?
- What might be causing it?

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Test Results**:
<!-- Student: Document which tests passed/failed and any bugs found -->

---

### Step 10: Style Refinement and Edge Cases

**Learning Goal**: UI polish, accessibility, and handling edge cases gracefully.

**Background Knowledge**:
The difference between "works" and "feels professional" is polish. You need to:
- Ensure accessibility (can people with disabilities use it?)
- Handle missing data gracefully
- Make sure UI works on different screen sizes
- Check performance (smooth animations)

**Polish Checklist**:

#### Typography Review
- [ ] All text is readable (not too small)
- [ ] Font weights create clear hierarchy
- [ ] Line heights prevent cramped text
- [ ] Text doesn't get cut off on small screens

#### Spacing Review
- [ ] Consistent padding/margins throughout
- [ ] Sections are clearly separated
- [ ] Not too cramped or too spacious
- [ ] White space used effectively

#### Color & Contrast Review
- [ ] Accept button is clearly green (#34C759)
- [ ] Decline button has red border (#FF3B30)
- [ ] Text has good contrast with backgrounds
- [ ] Colors convey meaning (green=go, red=stop)

#### Touch Targets (Accessibility)
- [ ] Buttons are at least 44x44 points (Apple guideline)
- [ ] Buttons are at least 48x48 dp (Android guideline)
- [ ] Sufficient space between tappable elements

#### Animation Performance
- [ ] Bottom sheet slides smoothly (60fps)
- [ ] No jank or stuttering
- [ ] Backdrop fade is smooth
- [ ] No lag when dragging

#### Edge Case Handling
Test these scenarios:

**Missing Optional Data**:
1. Edit mock data to remove `commuterName`
2. Verify it shows "Unknown" instead of crashing
3. Remove `vehicleInfo`
4. Verify it handles gracefully (or doesn't render that section)

**Very Long Text**:
1. Edit mock data to have a very long address (100+ characters)
2. Verify:
   - [ ] Text wraps properly
   - [ ] Doesn't overflow the container
   - [ ] Still readable

**Small Screen**:
1. Test on different device sizes (if possible)
2. Verify:
   - [ ] Content fits without scrolling issues
   - [ ] Buttons remain accessible
   - [ ] Text doesn't overlap

**Adjustments You Might Need**:

If touch targets are too small:
```typescript
button: {
  minHeight: 48,  // Ensures accessibility
  paddingVertical: 16,
}
```

If text contrast is poor:
```typescript
commuterName: {
  color: '#000',  // Pure black for better contrast
  fontWeight: '600',
}
```

If long addresses overflow:
```typescript
address: {
  fontSize: 15,
  lineHeight: 20,
  flexWrap: 'wrap',  // Allow text to wrap
  maxWidth: '100%',
}
```

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Polish Notes**:
<!-- Student: Document any adjustments made and why -->

---

### Step 11: Code Review and Cleanup

**Learning Goal**: Professional code quality, organization, and documentation standards.

**Background Knowledge**:
Code is read more often than it's written. You need to make your code easy for others (and future you) to understand. Good code:
- Has clear names
- Is well-organized
- Has comments explaining "why" (not "what")
- Follows consistent patterns
- Is properly typed

**Self-Code Review Checklist**:

#### TypeScript Quality
- [ ] All components have proper type annotations
- [ ] Props interfaces are exported (if reusable)
- [ ] No `any` types used (except for library props)
- [ ] Optional fields use `?` correctly
- [ ] Null checks for optional data

#### React Best Practices
- [ ] `useCallback` used for callback functions passed to children
- [ ] `useMemo` used for expensive computations
- [ ] `useRef` used correctly for bottom sheet reference
- [ ] No memory leaks (cleanup in useEffect if needed)
- [ ] Components are reasonably sized (not too large)

#### Code Organization
- [ ] RequestPopup is in `/components` directory
- [ ] Mock data is in `/services/mockData` directory
- [ ] Types are in `/types/models.ts`
- [ ] Styles use `StyleSheet.create`
- [ ] Imports are organized (React, React Native, third-party, local)

#### Comments & Documentation
- [ ] Complex logic has explanatory comments
- [ ] Props interfaces have JSDoc descriptions (optional but nice)
- [ ] Mock data file has usage instructions
- [ ] TODO comments for future improvements are clear

Example of good comments:
```typescript
// Show popup only when driver is online AND has a current request
isVisible={showPopup && isOnline}

// Automatically dismiss popup when driver goes offline
useEffect(() => {
  if (!isOnline && showPopup) {
    setShowPopup(false);
    setCurrentRequest(null);
  }
}, [isOnline, showPopup]);
```

#### Error Handling
- [ ] No crashes if request is null
- [ ] Graceful handling of missing optional fields
- [ ] No unhandled promise rejections
- [ ] Console logs are meaningful (keep for Phase 2)

#### Clean Up Debug Code
- [ ] Test button is clearly labeled "TEST" or "Test Request"
- [ ] Console logs are helpful (not excessive)
- [ ] No commented-out code blocks
- [ ] No unused imports
- [ ] No unused variables

#### Code Style Consistency
- [ ] Consistent indentation (2 spaces or 4 spaces)
- [ ] Consistent quote style (single or double)
- [ ] Consistent naming (camelCase for variables/functions)
- [ ] Consistent component structure across files

**Refactoring Opportunities**:

If your component is too large (>200 lines), consider extracting sections:
```typescript
// components/RequestPopup/CommmuterSection.tsx
export function CommuterSection({ request }: { request: Request }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>COMMUTER</Text>
      <Text style={styles.commuterName}>
        {request.commuterName || 'Unknown'}
      </Text>
    </View>
  );
}
```

If you have repeated styles, create constants:
```typescript
const COLORS = {
  primary: '#007AFF',
  success: '#34C759',
  danger: '#FF3B30',
  textPrimary: '#000',
  textSecondary: '#666',
};
```

**Final Verification**:
- [ ] Run `npx expo start` - no errors
- [ ] TypeScript checker passes (no red squiggles)
- [ ] ESLint passes (if configured)
- [ ] App works on both iOS and Android (if possible to test)
- [ ] All acceptance criteria from the story are met

**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Code Quality Notes**:
<!-- Student: Document any refactoring done or technical debt identified -->

---

## Completed Steps

<!-- As you complete each step, move it here with a checkmark and date -->

**Example format**:
- [x] Step 1: Install Bottom Sheet Library - Completed 2026-02-16
  - Installed `@gorhom/bottom-sheet` successfully
  - Verified in package.json
  - No dependency conflicts

---

## Current Step

<!-- Update this section with what you're actively working on -->

**Currently working on**: Step X - [Name]

**Started**: [Date]

**Progress notes**:
-

**Blockers/Questions**:
-

---

## Remaining Steps

<!-- This automatically updates as you progress -->

See Implementation Roadmap above.

---

## Acceptance Criteria Checklist

Track your progress against the original story requirements:

- [ ] Bottom sheet component created (slides up from bottom, Uber-style)
- [ ] Displays commuter info: name, pickup address, service type, car details
- [ ] "Accept" and "Decline" buttons present and functional
- [ ] Smooth animation when appearing/disappearing
- [ ] Pop-ups only show when driver is online
- [ ] Test button triggers popup with mock data
- [ ] All three mock requests work correctly
- [ ] Popup dismisses on backdrop tap
- [ ] Popup dismisses on swipe down
- [ ] Accept/Decline buttons show alerts and close popup
- [ ] Console logs work for debugging
- [ ] TypeScript compiles without errors
- [ ] Proper code organization and quality

---

## Learning Reflection

After completing this story, reflect on what you learned:

### What I Learned
<!-- Fill this out after completion -->

**Technical Skills**:
-

**React/React Native Patterns**:
-

**UI/UX Design**:
-

**Problem-Solving**:
-

### Challenges I Overcame
<!-- What was hard? How did you solve it? -->

**Challenge 1**:
- Problem:
- Solution:

**Challenge 2**:
- Problem:
- Solution:

### Questions I Still Have
<!-- It's okay to have questions! Document them for future learning -->

1.
2.

### What I'd Do Differently Next Time
<!-- Growth mindset - how would you improve? -->

-

---

## Decisions & Deviations from Spec

Document any decisions you made that differ from the original specification and WHY:

**Example**:
- **Decision**: Used snap points of ['40%', '80%'] instead of ['50%', '85%']
- **Reason**: Looked better on my device's screen size
- **Impact**: None, purely visual preference

<!-- Your decisions here -->

---

## Notes & Observations

### Implementation Notes
<!-- Any important details about how you implemented features -->

### Testing Notes
<!-- Bugs found, edge cases discovered, test results -->

### Performance Notes
<!-- Any performance observations or optimizations -->

---

## Resources & References

**Documentation Used**:
- [Bottom Sheet Library Docs](https://gorhom.github.io/react-native-bottom-sheet/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Expo Documentation](https://docs.expo.dev/)

**Helpful Articles/Tutorials**:
<!-- Add any helpful resources you found -->

**Team Discussions**:
<!-- Any coaching sessions or decisions made with mentors -->

---

## Ready for Review

When you've completed all steps and checked all acceptance criteria:

- [ ] All implementation steps completed
- [ ] All tests passing
- [ ] Code reviewed by myself
- [ ] Documentation updated
- [ ] Ready for `quality-reviewer` agent

**Completion Date**: ___________

**Time Spent**: _________ hours

---

## Next Steps (After This Story)

This story is UI-only (Phase 2). In future stories, you'll:
- **TOW-52**: Add request assignment and claiming logic
- **TOW-53**: Connect to real-time Firestore listeners for actual requests
- **TOW-54**: Implement the actual accept/decline backend logic
- **Phase 3**: Add distance calculation, ETA, and earnings estimates
- **Phase 4**: Add sound notifications, haptic feedback, and polish

The RequestPopup component you built here will be reused - you're building for the future!

---

_Good luck! Remember: learning is more important than speed. Take your time, ask questions, and understand each concept before moving on._

---

## 🎉 Story Completion Summary

**Date Completed**: 2026-02-16
**Total Time**: ~4 hours (including troubleshooting and pivoting)

### What We Built

✅ **RequestPopup Component** (`components/RequestPopup.tsx`)
- Full-screen modal using React Native's built-in Modal component
- 30-second countdown timer with auto-decline
- Progress bar that turns red when expiring soon (≤5 seconds)
- Displays all request details: commuter info, locations, service type, vehicle, customer notes
- ETA and distance info cards
- Professional styling matching design mockup
- Accept and Decline action buttons

✅ **Extended Request Interface** (`types/models.ts`)
- Added optional UI fields: `commuterName`, `commuterPhone`, `vehicleInfo`
- Added calculation fields: `estimatedPickupDistance`, `totalTripDistance`, `estimatedETA`, `estimatedPrice`, `customerNotes`
- All fields properly typed and optional for backward compatibility

✅ **Enhanced Mock Data** (`services/mockData/request.ts`)
- 3 diverse mock requests with realistic data
- Different scenarios: distances, ETAs, prices, customer notes
- Random selection function for testing variety

✅ **Driver Screen Integration** (`app/(driver)/index.tsx`)
- State management for popup visibility and current request
- Test trigger button (only shows when online)
- Accept/Decline handlers with alerts
- Clean integration with existing online/offline toggle

### Key Technical Decisions

1. **Pivoted from @gorhom/bottom-sheet to React Native Modal**
   - Reason: Library compatibility issues with Expo Router setup
   - Outcome: Simpler, more reliable solution with no dependencies

2. **30-second timer instead of 15**
   - Student's decision for better UX

3. **Optional fields for calculated data**
   - Allows for graceful degradation
   - Prepared for Phase 3 when real calculations happen in TOW-18

### Files Created/Modified

**Created:**
- `components/RequestPopup.tsx` (335 lines)
- `babel.config.js` (Reanimated plugin - not used but good to have)

**Modified:**
- `types/models.ts` - Extended Request interface
- `services/mockData/request.ts` - Enhanced with new fields
- `app/(driver)/index.tsx` - Integrated popup
- `app/_layout.tsx` - Added gesture handler support (not used but ready)

### Acceptance Criteria: ✅ ALL MET

- ✅ Modal popup component created
- ✅ Displays all required information
- ✅ Accept and Decline buttons functional
- ✅ Smooth animations
- ✅ Only shows when driver is online
- ✅ Test button triggers popup
- ✅ Mock data works correctly
- ✅ Auto-decline after timeout
- ✅ Professional styling
- ✅ TypeScript compiles without errors
- ✅ Clean code organization

### What's Next (TOW-18)

In TOW-18 "View Request Details", we'll replace the hardcoded mock values with real calculations:
- Calculate actual distance from driver to pickup location
- Calculate total trip distance using Google Maps Distance Matrix API
- Calculate realistic ETA based on current traffic
- Display real customer notes from Firebase

---

**Story Status**: ✅ **READY FOR QUALITY REVIEW**
