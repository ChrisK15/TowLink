# Technical Specification: TOW-77

## Story Reference

**Story**: Multi-Step Form - Location/Vehicle
**Epic**: EPIC 2: Commuter Request Flow (TOW-2)
**Sprint**: TOW Sprint 3 (Feb 25 - Mar 11, 2026)
**Story Points**: 5
**Jira**: https://chriskelamyan115.atlassian.net/browse/TOW-77
**Branch**: `TOW-77-multi-step-form-location-vehicle`

### Acceptance Criteria Summary

Add four new sections to the existing `RequestServiceSheet` component (inside the `ScrollView`, below the service type grid):

1. **Pickup Location** - "Detect My Location" button + address text input (required)
2. **Drop-off Location** - address text input (required)
3. **Vehicle Details** - Year, Make, and Model inputs in a row layout (all required)
4. **Additional Notes** - optional multi-line text area

No Firestore write in this story. All data stays in component state. TOW-78 handles submission.

---

## Design Reference

**File**: `.claude/design/screens/commuter_request_flow_2b.png`

### What the design shows (from the image)

The screenshot shows the sheet scrolled to the middle section. From top to bottom:

- Bottom of the service card grid (Lockout and Winch Out cards partially visible)
- **Pickup Location** section header (bold label)
  - "Detect My Location" button - outlined button (blue border, white background), pin icon on left, blue bold text
  - "Enter pickup address" text input below it (rounded, gray border, pin icon inside left)
- **Drop-off Location** section header (bold label)
  - "Enter destination address" text input (rounded, gray border, red arrow/navigation icon inside left)
- **Vehicle Details** section header (bold label)
  - Row of two inputs: "Year" | "Make" (side by side)
  - Below that: "Model" input (full width)
- **Additional Notes (Optional)** section header (bold label)
  - Multi-line text area with placeholder "e.g., Special instructions, parking details..."
  - Taller than a normal input (approximately 80-100px height)
- **"Request Service Now"** button pinned at the bottom (blue, white text, full width)

### Key visual design decisions from the image

- Section headers are **bold black labels** directly above the inputs, no separators between sections
- All inputs have **rounded corners** and a **light gray border**
- The "Detect My Location" button has a **blue border** (outlined style), NOT filled
- Input icons are positioned **inside the left side** of each input field
- The "Year" and "Make" inputs sit **side-by-side** in a row; "Model" is **full width** on the next row
- Background of the scroll content area is **light gray** (`#F5F5F5`), individual inputs are **white**
- No dividers or cards wrapping each section - sections flow directly in the scroll view

---

## Architecture Overview

TOW-77 extends `components/RequestServiceSheet.tsx`. No new files are created. The single file grows to include the new form sections.

### Current state of `RequestServiceSheet.tsx` (what TOW-76 built)

The component already has:
- `Modal` with `animationType="slide"` and `transparent={true}`
- Dark overlay `View`
- Sheet `View` at 90% screen height (`SHEET_HEIGHT = Dimensions.get('window').height * 0.9`)
- Drag handle `TouchableOpacity` at the top (outside `ScrollView`)
- `ScrollView` containing:
  - "Select Service Type" section title
  - `FlatList` (6 service cards, 2 columns, `scrollEnabled={false}`)
- Disabled "Request Service Now" footer button (outside `ScrollView`)
- State: `selectedService: ServiceType` (initialized to `'tow'`)

### What TOW-77 adds

New state variables inside `RequestServiceSheet`:
- `pickupAddress: string`
- `dropoffAddress: string`
- `vehicleYear: string`
- `vehicleMake: string`
- `vehicleModel: string`
- `additionalNotes: string`
- `isDetectingLocation: boolean` (loading state for GPS button)

New content inside the `ScrollView` (appended after the `FlatList`):
- Pickup Location section
- Drop-off Location section
- Vehicle Details section
- Additional Notes section

The footer button remains `disabled={true}` - TOW-78 adds the enable/disable logic and Firebase write.

---

## Technical Requirements

### File to Modify

**`/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`**

This is the only file that needs changes. `app/(commuter)/index.tsx` does NOT need changes - it already passes `visible` and `onClose` correctly with no `onContinue` prop.

---

## New TypeScript Types

No new types need to be added to `types/models.ts` for this story. The form data is held as plain strings in component state. When TOW-78 builds the submission, it will assemble the data into the `Request` interface (which already has all the fields needed: `pickupAddress`, `dropoffAddress`, `vehicleInfo`, `additionalNotes`).

However, it is good practice to define a local interface inside the component file for the form state shape. This makes the state structure explicit and readable:

```typescript
// Define this at the top of RequestServiceSheet.tsx, outside the component
interface LocationVehicleFormData {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  additionalNotes: string;
}
```

This is optional but recommended. The student can use separate `useState` calls for each field instead, which is also valid.

---

## GPS / Location Detection Implementation

The existing `app/(commuter)/index.tsx` already has working GPS code. TOW-77 reuses the same `expo-location` library - do not reinvent this logic.

### How the "Detect My Location" button works

1. User taps "Detect My Location"
2. Set `isDetectingLocation = true` (button shows loading text "Detecting...")
3. Call `Location.requestForegroundPermissionsAsync()` to request permission
4. If permission denied: show `Alert`, set `isDetectingLocation = false`, return
5. Call `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`
6. Format the result as a readable string: `"Lat: 34.0522, Lng: -118.2437"` (simple coordinate string for MVP - TOW-78 will handle reverse geocoding in a future enhancement)
7. Set `pickupAddress` to the formatted string
8. Set `isDetectingLocation = false`

### Why coordinates instead of a human-readable address?

The story says "Tapping 'Detect' populates the input with current GPS coordinates." Reverse geocoding (converting lat/lng to a street address) requires the Google Maps Geocoding API or `expo-location`'s `reverseGeocodeAsync`, which adds complexity and potential cost. For MVP, displaying raw coordinates satisfies the acceptance criteria. TOW-78 or a future story can add reverse geocoding.

### GPS permission note

`expo-location` is already installed (`"expo-location": "~19.0.8"` in package.json). No new package installation needed. The `info.plist` and `AndroidManifest.xml` permissions are already configured because `commuter/index.tsx` already uses location.

### Code pattern to follow

```typescript
// Add this import at the top of RequestServiceSheet.tsx
import * as Location from 'expo-location';

// Inside the component function:
const [isDetectingLocation, setIsDetectingLocation] = useState(false);

const handleDetectLocation = async () => {
  try {
    setIsDetectingLocation(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is needed to detect your position.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = `Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`;
    setPickupAddress(coords);

  } catch (error) {
    Alert.alert('Location Error', 'Could not detect location. Please type your address manually.');
  } finally {
    setIsDetectingLocation(false);
  }
};
```

---

## New Imports Needed

Add these to the existing import block at the top of `RequestServiceSheet.tsx`:

```typescript
import * as Location from 'expo-location';
import { Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
```

`Alert`, `TextInput`, `KeyboardAvoidingView`, and `Platform` come from `react-native` (same package already imported). Just add the missing names to the existing destructured import. `Location` is a new import from `expo-location`.

---

## Keyboard Handling

When a user taps on a `TextInput`, the keyboard slides up and can cover the lower inputs. This is a common React Native gotcha.

### Solution: Wrap the `Modal` content in `KeyboardAvoidingView`

```typescript
<Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* ... drag handle, ScrollView, footer ... */}
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
```

The `behavior` prop differs between iOS and Android:
- iOS: `'padding'` - adds padding to push content up
- Android: `'height'` - reduces the view height

### Also add `keyboardShouldPersistTaps="handled"` to the ScrollView

```typescript
<ScrollView
  style={styles.scrollView}
  keyboardShouldPersistTaps="handled"
>
```

This ensures tapping outside an input (on the scroll view) dismisses the keyboard without swallowing the tap.

---

## Form State Management

Use individual `useState` calls for each form field. This is the simplest approach for a student and matches the React Native patterns document.

```typescript
export function RequestServiceSheet({ visible, onClose }: RequestServiceSheetProps) {
  // Existing state (from TOW-76)
  const [selectedService, setSelectedService] = useState<ServiceType>('tow');

  // New state for TOW-77
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // ... rest of component
}
```

### State reset on sheet close

Currently, because the `Modal` component does NOT unmount when `visible={false}`, state persists between opens. This is acceptable for MVP. However, it would be a better user experience to reset the form when the sheet closes. The student can optionally add this:

```typescript
// Optional: Reset form when sheet closes
const handleClose = () => {
  setPickupAddress('');
  setDropoffAddress('');
  setVehicleYear('');
  setVehicleMake('');
  setVehicleModel('');
  setAdditionalNotes('');
  setSelectedService('tow');
  onClose();
};
```

Then use `handleClose` instead of `onClose` on the drag handle `TouchableOpacity` and on the `Modal`'s `onRequestClose` prop.

---

## JSX Structure to Add Inside the ScrollView

These sections go **after** the closing `</FlatList>` tag, still inside the `<ScrollView>`:

```
<ScrollView ...>
  <Text style={styles.sectionTitle}>Select Service Type</Text>
  <FlatList ... />              {/* existing - do not change */}

  {/* ---- NEW SECTIONS (TOW-77) ---- */}

  {/* Section: Pickup Location */}
  <View style={styles.formSection}>
    <Text style={styles.formSectionTitle}>Pickup Location</Text>
    <TouchableOpacity
      style={styles.detectButton}
      onPress={handleDetectLocation}
      disabled={isDetectingLocation}
    >
      <Text style={styles.detectButtonIcon}>📍</Text>
      <Text style={styles.detectButtonText}>
        {isDetectingLocation ? 'Detecting...' : 'Detect My Location'}
      </Text>
    </TouchableOpacity>
    <View style={styles.inputRow}>
      <Text style={styles.inputIcon}>📍</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter pickup address"
        placeholderTextColor="#999"
        value={pickupAddress}
        onChangeText={setPickupAddress}
        returnKeyType="next"
      />
    </View>
  </View>

  {/* Section: Drop-off Location */}
  <View style={styles.formSection}>
    <Text style={styles.formSectionTitle}>Drop-off Location</Text>
    <View style={styles.inputRow}>
      <Text style={styles.inputIcon}>🔴</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter destination address"
        placeholderTextColor="#999"
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
        returnKeyType="next"
      />
    </View>
  </View>

  {/* Section: Vehicle Details */}
  <View style={styles.formSection}>
    <Text style={styles.formSectionTitle}>Vehicle Details</Text>
    <View style={styles.vehicleRow}>
      <TextInput
        style={[styles.textInputStandalone, styles.vehicleInputHalf]}
        placeholder="Year"
        placeholderTextColor="#999"
        value={vehicleYear}
        onChangeText={setVehicleYear}
        keyboardType="numeric"
        maxLength={4}
        returnKeyType="next"
      />
      <TextInput
        style={[styles.textInputStandalone, styles.vehicleInputHalf]}
        placeholder="Make"
        placeholderTextColor="#999"
        value={vehicleMake}
        onChangeText={setVehicleMake}
        returnKeyType="next"
      />
    </View>
    <TextInput
      style={[styles.textInputStandalone, styles.vehicleInputFull]}
      placeholder="Model"
      placeholderTextColor="#999"
      value={vehicleModel}
      onChangeText={setVehicleModel}
      returnKeyType="done"
    />
  </View>

  {/* Section: Additional Notes */}
  <View style={styles.formSection}>
    <Text style={styles.formSectionTitle}>Additional Notes (Optional)</Text>
    <TextInput
      style={styles.notesInput}
      placeholder="e.g., Special instructions, parking details..."
      placeholderTextColor="#999"
      value={additionalNotes}
      onChangeText={setAdditionalNotes}
      multiline={true}
      numberOfLines={4}
      textAlignVertical="top"
    />
  </View>

</ScrollView>
```

---

## Styles to Add

Add these to the existing `StyleSheet.create({})` block in `RequestServiceSheet.tsx`. These go alongside the existing styles - do not replace them.

```typescript
// Form section wrapper
formSection: {
  backgroundColor: 'white',
  marginTop: 8,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 20,
},

// Section header label (bold, e.g. "Pickup Location")
formSectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#000',
  marginBottom: 12,
},

// "Detect My Location" outlined button
detectButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: '#1565C0',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginBottom: 10,
  backgroundColor: 'white',
},
detectButtonIcon: {
  fontSize: 18,
  marginRight: 8,
},
detectButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#1565C0',
},

// Wrapper for inputs that have an icon on the left
inputRow: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#D0D0D0',
  borderRadius: 12,
  backgroundColor: 'white',
  paddingHorizontal: 12,
},
inputIcon: {
  fontSize: 16,
  marginRight: 8,
},
// The TextInput inside an inputRow - takes up remaining width
textInput: {
  flex: 1,
  fontSize: 15,
  color: '#000',
  paddingVertical: 12,
},

// Standalone inputs (no icon wrapper needed for vehicle fields)
textInputStandalone: {
  borderWidth: 1,
  borderColor: '#D0D0D0',
  borderRadius: 12,
  backgroundColor: 'white',
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: '#000',
},

// Vehicle year+make side by side
vehicleRow: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 10,
},
vehicleInputHalf: {
  flex: 1,
},
// Vehicle model full width
vehicleInputFull: {
  width: '100%',
},

// Multi-line notes textarea
notesInput: {
  borderWidth: 1,
  borderColor: '#D0D0D0',
  borderRadius: 12,
  backgroundColor: 'white',
  paddingHorizontal: 14,
  paddingTop: 12,
  paddingBottom: 12,
  fontSize: 15,
  color: '#000',
  minHeight: 90,
  textAlignVertical: 'top',
},
```

---

## Implementation Steps

### Step 1: Add new imports

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: Find the existing `react-native` import line at the top of the file. Add `Alert`, `TextInput`, `KeyboardAvoidingView`, and `Platform` to the destructured list.

Also add a new import line directly after it:

```typescript
import * as Location from 'expo-location';
```

**Why**: `TextInput` is the core React Native input component. `KeyboardAvoidingView` pushes the sheet up when the keyboard appears. `Platform` detects iOS vs Android so we can use the right keyboard avoidance behavior. `Location` is from expo and handles GPS.

**Code hint**: Your existing import looks like:

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

Add `Alert`, `TextInput`, `KeyboardAvoidingView`, `Platform` to that list (alphabetical order is convention).

---

### Step 2: Add the new state variables inside the component

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: Inside the `RequestServiceSheet` function body, directly below the existing `const [selectedService, setSelectedService] = useState<ServiceType>('tow');` line, add:

```typescript
const [pickupAddress, setPickupAddress] = useState('');
const [dropoffAddress, setDropoffAddress] = useState('');
const [vehicleYear, setVehicleYear] = useState('');
const [vehicleMake, setVehicleMake] = useState('');
const [vehicleModel, setVehicleModel] = useState('');
const [additionalNotes, setAdditionalNotes] = useState('');
const [isDetectingLocation, setIsDetectingLocation] = useState(false);
```

**Why**: React's `useState` hook is how we store and update form field values. Each field needs its own state variable because they are independent - changing the year should not affect the make field.

---

### Step 3: Add the `handleDetectLocation` function

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: After the state variable declarations (still inside the function body), add the location detection handler:

```typescript
const handleDetectLocation = async () => {
  try {
    setIsDetectingLocation(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is needed to detect your position.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = `Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`;
    setPickupAddress(coords);

  } catch (error) {
    Alert.alert('Location Error', 'Could not detect location. Please enter your address manually.');
  } finally {
    setIsDetectingLocation(false);
  }
};
```

**Why this works**: `Location.requestForegroundPermissionsAsync()` asks the user for GPS permission. `Location.getCurrentPositionAsync()` returns the current GPS coordinates. We format them as a readable string and put them into the `pickupAddress` field. The `finally` block always runs (even if there is an error), so `isDetectingLocation` always gets set back to `false`.

**Learning point**: The pattern `try / catch / finally` is important in async functions. The `finally` block is guaranteed to execute regardless of whether the `try` succeeded or the `catch` caught an error.

---

### Step 4: Wrap the Modal content in KeyboardAvoidingView

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: In the JSX returned by the component, wrap the `<View style={styles.overlay}>` (and everything inside it) with a `KeyboardAvoidingView`.

**Before**:
```typescript
<Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
  <View style={styles.overlay}>
    ...
  </View>
</Modal>
```

**After**:
```typescript
<Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    <View style={styles.overlay}>
      ...
    </View>
  </KeyboardAvoidingView>
</Modal>
```

**Also add** `keyboardShouldPersistTaps="handled"` to the existing `<ScrollView>` element.

**Why**: Without `KeyboardAvoidingView`, when the user taps a text input near the bottom of the sheet (like the Notes field), the keyboard covers it and the user cannot see what they are typing. `KeyboardAvoidingView` automatically pushes the layout up.

---

### Step 5: Add the Pickup Location section inside the ScrollView

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: Inside the `<ScrollView>`, after the closing `</FlatList>` tag, add the Pickup Location section:

```typescript
<View style={styles.formSection}>
  <Text style={styles.formSectionTitle}>Pickup Location</Text>
  <TouchableOpacity
    style={styles.detectButton}
    onPress={handleDetectLocation}
    disabled={isDetectingLocation}
  >
    <Text style={styles.detectButtonIcon}>📍</Text>
    <Text style={styles.detectButtonText}>
      {isDetectingLocation ? 'Detecting...' : 'Detect My Location'}
    </Text>
  </TouchableOpacity>
  <View style={styles.inputRow}>
    <Text style={styles.inputIcon}>📍</Text>
    <TextInput
      style={styles.textInput}
      placeholder="Enter pickup address"
      placeholderTextColor="#999"
      value={pickupAddress}
      onChangeText={setPickupAddress}
      returnKeyType="next"
    />
  </View>
</View>
```

**Learning point**: `value={pickupAddress}` and `onChangeText={setPickupAddress}` make this a **controlled input**. The input always shows what is in state, and any typed character immediately updates the state. This is the standard React way to handle form inputs.

---

### Step 6: Add the Drop-off Location section

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: Directly after the closing `</View>` of the Pickup Location section, add:

```typescript
<View style={styles.formSection}>
  <Text style={styles.formSectionTitle}>Drop-off Location</Text>
  <View style={styles.inputRow}>
    <Text style={styles.inputIcon}>🔴</Text>
    <TextInput
      style={styles.textInput}
      placeholder="Enter destination address"
      placeholderTextColor="#999"
      value={dropoffAddress}
      onChangeText={setDropoffAddress}
      returnKeyType="next"
    />
  </View>
</View>
```

---

### Step 7: Add the Vehicle Details section

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: After the Drop-off section, add:

```typescript
<View style={styles.formSection}>
  <Text style={styles.formSectionTitle}>Vehicle Details</Text>
  <View style={styles.vehicleRow}>
    <TextInput
      style={[styles.textInputStandalone, styles.vehicleInputHalf]}
      placeholder="Year"
      placeholderTextColor="#999"
      value={vehicleYear}
      onChangeText={setVehicleYear}
      keyboardType="numeric"
      maxLength={4}
      returnKeyType="next"
    />
    <TextInput
      style={[styles.textInputStandalone, styles.vehicleInputHalf]}
      placeholder="Make"
      placeholderTextColor="#999"
      value={vehicleMake}
      onChangeText={setVehicleMake}
      returnKeyType="next"
    />
  </View>
  <TextInput
    style={[styles.textInputStandalone, styles.vehicleInputFull]}
    placeholder="Model"
    placeholderTextColor="#999"
    value={vehicleModel}
    onChangeText={setVehicleModel}
    returnKeyType="done"
  />
</View>
```

**Learning point**: `keyboardType="numeric"` on the Year field opens a number-only keyboard on the device - a small UX improvement that prevents users from entering letters in a year field. `maxLength={4}` prevents entering more than 4 characters (e.g., "2024").

**Learning point**: `style={[styles.textInputStandalone, styles.vehicleInputHalf]}` shows how React Native handles multiple styles - pass an array and they are merged left-to-right. This lets you compose styles from multiple rules.

---

### Step 8: Add the Additional Notes section

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: After the Vehicle Details section, add:

```typescript
<View style={styles.formSection}>
  <Text style={styles.formSectionTitle}>Additional Notes (Optional)</Text>
  <TextInput
    style={styles.notesInput}
    placeholder="e.g., Special instructions, parking details..."
    placeholderTextColor="#999"
    value={additionalNotes}
    onChangeText={setAdditionalNotes}
    multiline={true}
    numberOfLines={4}
    textAlignVertical="top"
  />
</View>
```

**Learning point**: `multiline={true}` makes the `TextInput` grow vertically as the user types. `textAlignVertical="top"` (Android-specific but harmless on iOS) ensures the cursor starts at the top of the text area, not vertically centered.

---

### Step 9: Add all new styles to the StyleSheet

**File**: `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`

**Action**: Inside the `StyleSheet.create({})` block at the bottom of the file, append all the new style definitions listed in the "Styles to Add" section above. Add them after the existing `submitButtonText` style.

---

### Step 10: Test the implementation

**Action**: Run `npx expo start` and test on the iOS simulator (or device).

Manual test checklist:

- [ ] Open the service sheet by tapping "Request Roadside Assistance"
- [ ] Scroll down past the service cards - all four new sections should appear
- [ ] "Pickup Location" section header is visible and bold
- [ ] "Detect My Location" button is visible with a blue outline and pin icon
- [ ] Tapping "Detect My Location" shows "Detecting..." while loading
- [ ] After detection completes, the pickup address field is filled with coordinates
- [ ] Denying location permission shows an Alert and leaves the field empty
- [ ] The pickup address text input can be edited manually
- [ ] "Drop-off Location" section is visible below pickup
- [ ] Drop-off address field accepts text input
- [ ] "Vehicle Details" section is visible with Year and Make side by side
- [ ] Year field only accepts numbers (numeric keyboard opens)
- [ ] Make and Model fields accept text
- [ ] "Additional Notes (Optional)" section is visible
- [ ] Notes field is taller than other inputs and accepts multi-line text
- [ ] Tapping a text input scrolls the view so the input is visible above the keyboard
- [ ] Tapping the drag handle still closes the sheet
- [ ] "Request Service Now" button is still disabled and gray (no change from TOW-76)
- [ ] No crashes or console errors

---

## Edge Cases

1. **Location permission denied** - `handleDetectLocation` catches the denied status and shows an Alert. The pickup address field remains empty. The user can still type an address manually, which satisfies the requirement.

2. **GPS unavailable or timeout** - The `try/catch` around `getCurrentPositionAsync` catches any error (including timeout) and shows an Alert. The `finally` block ensures `isDetectingLocation` resets to `false` so the button is no longer stuck showing "Detecting...".

3. **User taps "Detect" multiple times rapidly** - The `disabled={isDetectingLocation}` prop on the button prevents multiple simultaneous GPS calls. While one is in progress, the button cannot be tapped again.

4. **Vehicle year input** - `keyboardType="numeric"` and `maxLength={4}` provide basic input constraints. However, `TextInput` with `keyboardType="numeric"` does not strictly prevent non-numeric characters on all platforms (Android allows paste of text). Full validation happens in TOW-78 when the submit button is pressed.

5. **Keyboard covers bottom inputs** - `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` handles this. The Additional Notes field is the most likely to be covered. The `ScrollView` allows manual scrolling if the automatic adjustment is not sufficient.

6. **Form state persists between sheet opens** - Because the `Modal` does not unmount when `visible={false}`, state persists. If the user opens the sheet, fills in some fields, closes it, and reopens it, their entries will still be there. This is acceptable for MVP but could confuse users. The optional `handleClose` pattern described in the State Management section above solves this if the student wants to add it.

7. **`gap` style property** - The `vehicleRow` style uses `gap: 10` for spacing between the Year and Make inputs. `gap` is supported in React Native since version 0.71. Since this project uses React Native 0.81.5, this is safe.

8. **Android-specific `textAlignVertical`** - This prop is ignored on iOS (iOS always aligns text at top in multiline inputs). It is not harmful to include it for both platforms.

---

## Testing Strategy

Manual testing only for MVP (automated tests deferred to Phase 4).

1. Run `npx expo start` in terminal from the project root
2. Open on iOS Simulator (Command-I in Expo Go, or `npm run ios`)
3. Work through the Step 10 checklist
4. If Android device is available, also test there (keyboard behavior and `textAlignVertical` differ)
5. Specifically test the keyboard avoidance by tapping the Notes field on a small phone simulator (iPhone SE size)

---

## Dependencies

### Libraries (all already installed - no new packages needed)

- `expo-location` (`~19.0.8`) - GPS detection for "Detect My Location" button
- `react-native` - `TextInput`, `KeyboardAvoidingView`, `Alert`, `Platform` - all built in
- `react-native-safe-area-context` - already installed, no changes needed

### Story dependencies

- **TOW-76** is Done. `RequestServiceSheet` exists with the correct structure (Modal, ScrollView, footer button). This story extends it.
- **TOW-78** is blocked by this story. Once TOW-77 is done, TOW-78 will add the Price Breakdown section and wire the submit button to Firebase. TOW-78 will read the form state that TOW-77 establishes - but it will do so from inside the same component (no prop passing needed).

### No changes needed to

- `app/(commuter)/index.tsx` - Already correct. Passes `visible` and `onClose` only.
- `types/models.ts` - `Request` interface already has `pickupAddress`, `dropoffAddress`, `vehicleInfo`, `additionalNotes` fields that match what this form collects.
- Firebase / Firestore - No writes in this story.
- Any other files.

---

## Summary of All Changes

Only one file changes in this story:

**`/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`**

| Change | What |
|--------|------|
| New imports | `Alert`, `TextInput`, `KeyboardAvoidingView`, `Platform` from `react-native`; `* as Location` from `expo-location` |
| New state vars | `pickupAddress`, `dropoffAddress`, `vehicleYear`, `vehicleMake`, `vehicleModel`, `additionalNotes`, `isDetectingLocation` |
| New function | `handleDetectLocation` (async GPS handler) |
| JSX change | Wrap Modal content in `KeyboardAvoidingView` |
| JSX change | Add `keyboardShouldPersistTaps="handled"` to ScrollView |
| JSX additions | 4 new sections inside ScrollView after FlatList |
| Style additions | 12 new style rules in StyleSheet.create block |
