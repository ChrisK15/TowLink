# Implementation Progress: TOW-77

## Story Summary

Add four new form sections to `RequestServiceSheet.tsx` below the service type grid:
1. Pickup Location (with GPS "Detect My Location" button)
2. Drop-off Location
3. Vehicle Details (Year + Make side-by-side, Model full-width)
4. Additional Notes (optional, multi-line)

No Firestore write happens here - all data stays in component state. TOW-78 handles submission.

---

## Completed Steps

- [x] Step 1: Read and understand the existing component
- [x] Step 2: Update imports (TextInput, Alert, KeyboardAvoidingView, Platform + expo-location)
- [x] Step 3: Add new state variables for the form fields
- [x] Step 4: Write the `handleDetectLocation` async function
- [x] Step 5: Wrap the Modal content in `KeyboardAvoidingView` and update `ScrollView`
- [x] Step 6: Add the Pickup Location section inside the ScrollView
- [x] Step 7: Add the Drop-off Location section
- [x] Step 8: Add the Vehicle Details section (with side-by-side Year/Make row)
- [x] Step 9: Add the Additional Notes section
- [x] Step 10: Add all new styles to the StyleSheet
- [x] Step 11: Manual test checklist on simulator ✅

---

## Current Step

_All steps complete_

---

## Remaining Steps

_None_

---

## Additional Changes (beyond original spec)

- Reordered sections: Drop-off now appears before Vehicle Details (matches UX intent)
- Added `reverseGeocode()` to `services/geoLocationUtils.ts` — converts GPS coordinates to a human-readable street address (e.g. "5432 Moorpark St, Los Angeles, CA") with a coordinate fallback for rural areas
- `handleDetectLocation` now calls `reverseGeocode` instead of formatting raw coordinates inline

---

## Step Details

### Step 1 - Read and understand the existing component

**Learning objective**: Before adding to a file, always read and understand what is already there. You need to know the existing structure before you can extend it.

**What to do**: Open `components/RequestServiceSheet.tsx` and read it. Notice:
- The imports at the top
- The `SHEET_HEIGHT` and `CARD_WIDTH` constants
- The `SERVICE_OPTIONS` array
- The `ServiceCard` sub-component
- The `RequestServiceSheet` function component: its props, its one state variable, and its JSX
- The `StyleSheet.create({})` block at the bottom

**Question to think about**: Where exactly inside the JSX would you add the new form sections? (Hint: look at the `ScrollView` - what is already inside it, and what would come after?)

**No code changes in this step** - just read and understand.

---

### Step 2 - Update imports

**Learning objective**: Understand how to extend an existing import block and add a new import from a different package.

**Concept (WHY)**: React Native's `TextInput` is the component used for text input fields. `Alert` shows native dialog boxes. `KeyboardAvoidingView` is a layout container that automatically shifts content upward when the software keyboard appears - without this, the keyboard will cover the bottom form fields and the user won't be able to see what they are typing. `Platform` lets you detect whether the app is running on iOS or Android so you can apply platform-specific behavior. `expo-location` is the library that accesses the device's GPS.

**What to do**:
1. Find the existing `import { ... } from 'react-native';` block
2. Add `Alert`, `KeyboardAvoidingView`, `Platform`, and `TextInput` to that list (keep alphabetical order as convention)
3. Add a second new import line after it: `import * as Location from 'expo-location';`

**Hint**: The existing import looks like this:
```typescript
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
```

You need to add four more names to that list.

---

### Step 3 - Add new state variables

**Learning objective**: Understand why controlled form inputs require individual state variables, and how to add multiple `useState` calls to an existing component.

**Concept (WHY)**: In React, a "controlled input" means the `TextInput`'s displayed value is always read from state, and any character the user types immediately updates that state. This makes the form data easy to read later (when you need to submit it). Each field needs its own state variable because they are independent - changing the Year field should not affect the Make field.

**What to do**: Inside the `RequestServiceSheet` function body, directly below the existing `const [selectedService, ...]` line, add seven new state variables:
- `pickupAddress` (string, starts empty)
- `dropoffAddress` (string, starts empty)
- `vehicleYear` (string, starts empty)
- `vehicleMake` (string, starts empty)
- `vehicleModel` (string, starts empty)
- `additionalNotes` (string, starts empty)
- `isDetectingLocation` (boolean, starts `false`)

**Question to think about**: Why is `vehicleYear` stored as a `string` rather than a `number`, even though a year is a number?

---

### Step 4 - Write the `handleDetectLocation` function

**Learning objective**: Understand async/await, try/catch/finally, and how to use the `expo-location` library.

**Concept (WHY)**: Requesting GPS coordinates is an async operation - it takes time and can fail. The `try/catch/finally` pattern ensures that:
- `try`: the happy path runs
- `catch`: errors are handled gracefully (user sees a message, app doesn't crash)
- `finally`: cleanup always runs (the loading state always resets, even if something went wrong)

The function also needs to ask for location permission first. On both iOS and Android, the user must grant the app permission to access GPS - you cannot just read coordinates without asking.

**What to do**: After the state variable declarations (still inside the function body, before the `return`), write an async function called `handleDetectLocation` that:
1. Sets `isDetectingLocation` to `true`
2. Requests foreground location permission using `Location.requestForegroundPermissionsAsync()`
3. If permission is not granted, shows an `Alert` and returns early
4. Calls `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`
5. Formats the result as a string like `"Lat: 34.0522, Lng: -118.2437"` (use `.toFixed(4)` for 4 decimal places)
6. Sets `pickupAddress` to that formatted string
7. Handles any errors with an `Alert`
8. Always sets `isDetectingLocation` back to `false` in the `finally` block

**Key learning point**: The `finally` block runs regardless of whether `try` succeeded or `catch` caught an error. This is how you guarantee cleanup code runs.

---

### Step 5 - Wrap Modal content in KeyboardAvoidingView and update ScrollView

**Learning objective**: Understand keyboard avoidance in React Native and how platform detection works.

**Concept (WHY)**: When a user taps on a `TextInput` near the bottom of the screen, the software keyboard slides up from the bottom. Without any handling, the keyboard covers the input and the user cannot see what they are typing. `KeyboardAvoidingView` solves this by shrinking or padding the content area when the keyboard appears.

iOS and Android handle this differently:
- iOS: `behavior="padding"` adds padding to the bottom, pushing content upward
- Android: `behavior="height"` reduces the height of the view
That is why we use `Platform.OS === 'ios' ? 'padding' : 'height'`.

**What to do**:
1. In the JSX, find `<Modal visible={visible} ...>`. The next line inside it is `<View style={styles.overlay}>`. Wrap that `View` (and everything inside the Modal) in a `KeyboardAvoidingView` with:
   - `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
   - `style={{ flex: 1 }}`
2. Find the `<ScrollView style={styles.scrollView}>` line and add the prop `keyboardShouldPersistTaps="handled"` to it

**Hint**: The structure should go `Modal > KeyboardAvoidingView > View(overlay) > View(sheet) > ...`

---

### Step 6 - Add the Pickup Location section

**Learning objective**: Build a controlled `TextInput`, understand `value` and `onChangeText`, and connect a button to an async handler.

**Concept (WHY)**: `value={pickupAddress}` makes the input show whatever is in state. `onChangeText={setPickupAddress}` updates state every time the user types. Together they create a "controlled component" - state is the single source of truth.

The "Detect My Location" button uses `disabled={isDetectingLocation}` so that if GPS is already running, the user cannot tap it again and start a second GPS request at the same time.

**What to do**: Inside the `<ScrollView>`, after the closing `</FlatList>` tag, add a `<View style={styles.formSection}>` that contains:
- A `<Text>` with "Pickup Location" as the section header (style: `formSectionTitle`)
- A `<TouchableOpacity>` for the "Detect My Location" button:
  - Blue outlined button (style: `detectButton`)
  - Shows "Detecting..." when `isDetectingLocation` is true, otherwise "Detect My Location"
  - `disabled={isDetectingLocation}`
  - `onPress={handleDetectLocation}`
  - Has a pin emoji icon inside
- A `<View style={styles.inputRow}>` containing:
  - A pin emoji `<Text>` (the icon)
  - A `<TextInput>` with `placeholder="Enter pickup address"`, `value={pickupAddress}`, `onChangeText={setPickupAddress}`

---

### Step 7 - Add the Drop-off Location section

**Learning objective**: Reinforce the controlled input pattern with a simpler section.

**What to do**: After the Pickup Location section's closing `</View>`, add another `<View style={styles.formSection}>` containing:
- A section header `<Text>` saying "Drop-off Location"
- An `<View style={styles.inputRow}>` with a red circle emoji icon and a `TextInput` for `dropoffAddress`

This follows the same pattern as pickup but without the detect button.

---

### Step 8 - Add the Vehicle Details section

**Learning objective**: Understand how to create side-by-side inputs using `flexDirection: 'row'`, how to apply multiple styles to one component, and `keyboardType` / `maxLength` props.

**Concept (WHY)**: React Native's flexbox works similarly to CSS flexbox. A `View` with `flexDirection: 'row'` lays its children left-to-right. Giving each child `flex: 1` makes them share the available space equally. This is how you create a two-column input row.

The `keyboardType="numeric"` prop on the Year field makes the device show a number pad instead of a full keyboard. `maxLength={4}` prevents entering more than 4 characters.

`style={[styles.textInputStandalone, styles.vehicleInputHalf]}` is an array of styles - React Native merges them, with later entries overriding earlier ones if there are conflicts. This is the React Native way to compose styles.

**What to do**: After the Drop-off section, add a `<View style={styles.formSection}>` containing:
- A section header "Vehicle Details"
- A `<View style={styles.vehicleRow}>` containing:
  - Year `TextInput` (half width, numeric keyboard, maxLength 4)
  - Make `TextInput` (half width)
- A Model `TextInput` below the row (full width)

---

### Step 9 - Add the Additional Notes section

**Learning objective**: Understand multi-line text inputs and `textAlignVertical`.

**Concept (WHY)**: `multiline={true}` transforms a `TextInput` from a single-line field into a text area that grows with content. `textAlignVertical="top"` is an Android-specific prop that positions the cursor at the top-left of the text area (otherwise Android vertically centers it, which looks odd for a tall field). It is safe to include on iOS - it is simply ignored.

**What to do**: After the Vehicle Details section, add a `<View style={styles.formSection}>` containing:
- A section header "Additional Notes (Optional)"
- A `TextInput` with `multiline={true}`, `numberOfLines={4}`, `textAlignVertical="top"`, and the placeholder text

---

### Step 10 - Add all new styles to the StyleSheet

**Learning objective**: Understand how to extend an existing StyleSheet and organize styles by component.

**What to do**: At the bottom of the file, inside `StyleSheet.create({})`, after the existing `submitButtonText` style entry, add all the new style rules needed:
- `formSection` - white background wrapper with padding
- `formSectionTitle` - bold black section header label
- `detectButton` - blue outlined button (border, no fill)
- `detectButtonIcon` - emoji size for the pin icon
- `detectButtonText` - bold blue text
- `inputRow` - row container with icon + input, gray border, rounded
- `inputIcon` - emoji size for the inline icon
- `textInput` - the input inside an inputRow (flex: 1)
- `textInputStandalone` - input without an icon wrapper
- `vehicleRow` - flexDirection row with gap for year+make
- `vehicleInputHalf` - flex: 1 for side-by-side inputs
- `vehicleInputFull` - width 100% for model
- `notesInput` - multi-line textarea with minHeight

**Hint**: See the "Styles to Add" section in the technical spec (`.claude/specs/TOW-77.md`) for the exact values to use.

---

### Step 11 - Manual test checklist

**Learning objective**: Systematically verify your implementation works end-to-end before considering a story done.

**What to do**: Run `npx expo start` and open the app on the iOS Simulator. Tap "Request Roadside Assistance" to open the sheet, then scroll down and verify:

- [ ] All four new sections appear below the service cards when scrolling
- [ ] Section headers are bold and readable
- [ ] "Detect My Location" button has a blue outline (not filled blue)
- [ ] Tapping "Detect My Location" changes button text to "Detecting..." while loading
- [ ] After detection, the pickup address field fills with coordinates
- [ ] The pickup address field can also be edited manually
- [ ] Drop-off address field accepts text
- [ ] Year and Make inputs appear side-by-side
- [ ] Year field opens numeric keyboard
- [ ] Year field does not accept more than 4 characters
- [ ] Model input is full width on the next row
- [ ] Notes textarea is taller than other inputs and accepts multiple lines
- [ ] Tapping a text input near the bottom (Notes) does not get covered by the keyboard
- [ ] Tapping the drag handle still closes the sheet
- [ ] "Request Service Now" button is still disabled/gray (no change from TOW-76)
- [ ] No TypeScript errors or red underlines in the editor
- [ ] No runtime crashes or red error screens

---

## Notes

- Only one file changes in this story: `components/RequestServiceSheet.tsx`
- No new packages to install - `expo-location` is already in the project
- The "Request Service Now" button remains `disabled={true}` - TOW-78 adds enable/disable logic
- Vehicle year is stored as a `string` (not `number`) because `TextInput` always gives you a string, and validation happens in TOW-78
- `gap: 10` on `vehicleRow` requires React Native 0.71+ - this project uses 0.81.5, so it is safe
