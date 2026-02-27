# Technical Specification: TOW-76

## Story Reference

**Story**: Multi-Step Request Form - Service Selection
**Epic**: EPIC 2: Commuter Request Flow
**Sprint**: TOW Sprint 3 (Feb 25 - Mar 11, 2026)
**Story Points**: 3
**Jira**: https://chriskelamyan115.atlassian.net/browse/TOW-76

### Acceptance Criteria (from Jira)

- Tapping "Request Roadside Assistance" slides up a selection modal
- Modal shows "Towing" service card, highlighted/selected by default
- Towing card shows: tow truck icon, "Towing" label, price range "$75-120"
- Other service types (Jump Start, Fuel Delivery, Tire Change, etc.) shown as disabled/grayed out
- "Continue" button at bottom
- Tapping the Drag Handle at top closes the modal
- No back button
- Modal fills ~95% of screen height when open

---

## Architecture Overview

This feature introduces a **bottom sheet modal** that slides up over the map when the commuter taps "Request Roadside Assistance". It is **Step 1 of 3** in the multi-step request flow:

```
Step 1 (TOW-76): Service Selection  →  Step 2 (TOW-77): Location/Vehicle  →  Step 3 (TOW-78): Price Confirmation
```

The sheet is a **new component** at `components/RequestServiceSheet.tsx`. The parent screen (`app/(commuter)/index.tsx`) owns the visibility state and passes it down via props.

### Library Decision: `@gorhom/bottom-sheet`

`@gorhom/bottom-sheet` v5 is **already installed** in `package.json`. It is the right choice here because:

- It handles the drag-to-dismiss gesture natively
- The drag handle behavior (tap to close) is built in
- It integrates with the already-installed `react-native-reanimated` and `react-native-gesture-handler`
- It handles the 95% snap point requirement cleanly
- It is designed for exactly this pattern (modal sheets over maps)

The existing `ActiveTripSheet.tsx` uses a manual `Animated.View` approach for its expand/collapse behavior (a different pattern - it lives persistently at the bottom). The `RequestServiceSheet` has different needs: it must slide in from off-screen, cover 95% of the screen, and be dismissible via a drag handle. `@gorhom/bottom-sheet` handles this better.

---

## Component Breakdown

### Files to Create

**`components/RequestServiceSheet.tsx`** - The new bottom sheet component

This component is responsible for:
- Rendering the bottom sheet UI at 95% screen height
- Displaying the step header ("Step 1 of 3 - Select Service")
- Rendering the service type cards in a scrollable list
- Highlighting "Towing" as selected by default
- Showing other services as disabled/grayed out
- Rendering the "Continue" button at the bottom
- Calling `onClose` when the drag handle is tapped
- Calling `onContinue` when Continue is tapped

### Files to Modify

**`app/(commuter)/index.tsx`** - The commuter home screen

Changes needed:
- Add `showServiceSheet` boolean state variable
- Change `handleRequestAssistance` to set `showServiceSheet = true` (instead of directly creating a Firebase request)
- Render `<RequestServiceSheet>` with the appropriate props
- Remove the placeholder `serviceSelector` UI (the 4 small service icons at the bottom of the screen) since that logic moves into the sheet

---

## TypeScript Types

Add these to `types/models.ts` or define locally in the component. Defining locally is acceptable since these are UI-only types for now.

```typescript
// The service types available in the app
// Only 'tow' is functional for MVP
export type ServiceType = 'tow' | 'jump_start' | 'fuel_delivery' | 'tire_change';

// Describes a single service option card in the UI
export interface ServiceOption {
  id: ServiceType;
  label: string;
  icon: string;           // Emoji or icon name
  priceRange: string;     // e.g. "$75-120"
  description: string;    // Short description shown on card
  isEnabled: boolean;     // Only 'tow' is true for MVP
}
```

These types live inside `RequestServiceSheet.tsx` since they are UI-specific and not stored in Firestore.

---

## Component Props Interface

```typescript
interface RequestServiceSheetProps {
  visible: boolean;                          // Controls whether the sheet is shown
  onClose: () => void;                       // Called when drag handle is tapped
  onContinue: (serviceType: ServiceType) => void; // Called when Continue is tapped
}
```

---

## Data: Service Options Array

Define this as a constant inside the component file. This is the source of truth for what cards render:

```typescript
const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'tow',
    label: 'Towing',
    icon: '🚚',
    priceRange: '$75 - $120',
    description: 'Vehicle towed to your destination',
    isEnabled: true,
  },
  {
    id: 'jump_start',
    label: 'Jump Start',
    icon: '⚡',
    priceRange: 'Coming Soon',
    description: 'Battery jump start service',
    isEnabled: false,
  },
  {
    id: 'fuel_delivery',
    label: 'Fuel Delivery',
    icon: '⛽',
    priceRange: 'Coming Soon',
    description: 'Emergency fuel delivered to you',
    isEnabled: false,
  },
  {
    id: 'tire_change',
    label: 'Tire Change',
    icon: '🔧',
    priceRange: 'Coming Soon',
    description: 'Flat tire replacement',
    isEnabled: false,
  },
];
```

---

## Implementation Steps

### Step 1: Add TypeScript types to the component file

**File**: `components/RequestServiceSheet.tsx` (create new file)
**Action**: Create the file with the `ServiceType`, `ServiceOption`, and `RequestServiceSheetProps` type definitions, and the `SERVICE_OPTIONS` constant array. No JSX yet - just the data layer.

**Why**: Getting types right first prevents rework. The student should understand what data is flowing before building the UI.

---

### Step 2: Set up the BottomSheet shell

**File**: `components/RequestServiceSheet.tsx`
**Action**: Import `BottomSheet` and `BottomSheetView` from `@gorhom/bottom-sheet`. Set up the basic shell with:
- A `bottomSheetRef` using `useRef`
- A `snapPoints` array set to `['95%']`
- Wrap in a React Native `Modal` (to layer correctly over the map) OR use `BottomSheetModal` variant

**Important library note**: `@gorhom/bottom-sheet` v5 has two components:
- `BottomSheet` - always rendered, controlled by snap points
- `BottomSheetModal` - renders on demand like a modal, requires `BottomSheetModalProvider` in layout

**Recommended approach**: Use React Native's built-in `Modal` component as the outer wrapper (same pattern as `RequestPopup.tsx`), and put a styled `View` inside that represents the sheet. This keeps it simple and consistent with existing patterns in the codebase without requiring provider setup.

Alternatively, use `@gorhom/bottom-sheet`'s `BottomSheet` directly if the layout provider is configured.

**Code hint for the Modal approach** (simpler, consistent with codebase):

```typescript
import { Modal, View, ScrollView, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.95;

export function RequestServiceSheet({ visible, onClose, onContinue }: RequestServiceSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Content goes here */}
        </View>
      </View>
    </Modal>
  );
}
```

The `transparent={true}` on the Modal with an overlay `View` allows the map to show through the darkened background behind the sheet.

---

### Step 3: Build the drag handle

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add the drag handle UI at the top of the sheet. It should be a `TouchableOpacity` that calls `onClose`.

**Code hint**:

```typescript
<TouchableOpacity onPress={onClose} style={styles.handleContainer}>
  <View style={styles.dragHandle} />
</TouchableOpacity>
```

Style the `dragHandle` as a short, wide, rounded gray pill (copy from `ActiveTripSheet.tsx`'s existing `dragHandle` style - it's already well-designed).

**Why a TouchableOpacity and not a gesture?**: The story says "Tapping Drag Handle closes Modal". Touch is sufficient. Swipe-to-dismiss can be added later.

---

### Step 4: Build the sheet header

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add a header section below the drag handle with:
- Step indicator text: "Step 1 of 3"
- Title: "Select a Service"
- Subtitle: "Choose the type of assistance you need"

**Code hint**:

```typescript
<View style={styles.header}>
  <Text style={styles.stepIndicator}>Step 1 of 3</Text>
  <Text style={styles.title}>Select a Service</Text>
  <Text style={styles.subtitle}>Choose the type of assistance you need</Text>
</View>
```

---

### Step 5: Build the ServiceCard sub-component

**File**: `components/RequestServiceSheet.tsx`
**Action**: Create a `ServiceCard` component (can be defined in the same file, above the main export). It receives a `ServiceOption` and whether it is `selected`.

**Props interface**:

```typescript
interface ServiceCardProps {
  option: ServiceOption;
  selected: boolean;
  onPress: () => void;
}
```

**Visual states**:
- **Selected + enabled** (`option.id === 'tow'`, selected): Cyan border (`#00D9FF`), cyan-tinted background, full opacity
- **Disabled** (`option.isEnabled === false`): 40% opacity, no border highlight, not pressable

**Code hint**:

```typescript
function ServiceCard({ option, selected, onPress }: ServiceCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        !option.isEnabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={!option.isEnabled}
      activeOpacity={option.isEnabled ? 0.7 : 1}
    >
      <Text style={styles.cardIcon}>{option.icon}</Text>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>{option.label}</Text>
        <Text style={styles.cardDescription}>{option.description}</Text>
      </View>
      <View style={styles.cardPriceContainer}>
        <Text style={[styles.cardPrice, !option.isEnabled && styles.cardPriceDisabled]}>
          {option.priceRange}
        </Text>
        {selected && <Text style={styles.selectedCheckmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}
```

---

### Step 6: Build the scrollable service list

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add state for `selectedService` (default `'tow'`). Render `SERVICE_OPTIONS.map(...)` inside a `ScrollView`, passing each option to `ServiceCard`.

**Code hint**:

```typescript
const [selectedService, setSelectedService] = useState<ServiceType>('tow');

// In JSX:
<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
  {SERVICE_OPTIONS.map((option) => (
    <ServiceCard
      key={option.id}
      option={option}
      selected={selectedService === option.id}
      onPress={() => setSelectedService(option.id)}
    />
  ))}
</ScrollView>
```

---

### Step 7: Build the Continue button

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add a "Continue" button below the ScrollView (not inside it - it should be pinned to the bottom). It calls `onContinue(selectedService)`.

**Code hint**:

```typescript
<View style={styles.footer}>
  <TouchableOpacity
    style={styles.continueButton}
    onPress={() => onContinue(selectedService)}
  >
    <Text style={styles.continueButtonText}>Continue</Text>
  </TouchableOpacity>
</View>
```

The footer should have a top border (`borderTopWidth: 1, borderTopColor: '#E0E0E0'`) and white background, padding of 16, with `paddingBottom` set generously (32+) to account for iPhone home indicator.

---

### Step 8: Apply StyleSheet

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add the complete `StyleSheet.create({})` with all styles. Key values to target:

```typescript
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    paddingTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#00D9FF',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
  },
  cardPriceContainer: {
    alignItems: 'flex-end',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D9FF',
  },
  cardPriceDisabled: {
    color: '#999',
  },
  selectedCheckmark: {
    fontSize: 16,
    color: '#00D9FF',
    fontWeight: '700',
    marginTop: 4,
  },
  footer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    paddingBottom: 32,
  },
  continueButton: {
    backgroundColor: '#00D9FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

---

### Step 9: Integrate into the commuter home screen

**File**: `app/(commuter)/index.tsx`
**Action**: Wire the sheet into the existing screen.

**Changes**:

1. Import the new component:
```typescript
import { RequestServiceSheet } from '@/components/RequestServiceSheet';
import { ServiceType } from '@/components/RequestServiceSheet'; // if types exported from there
```

2. Add state:
```typescript
const [showServiceSheet, setShowServiceSheet] = useState(false);
```

3. Change `handleRequestAssistance` to show the sheet instead of creating a request directly:
```typescript
async function handleRequestAssistance() {
  if (!userLocation) {
    Alert.alert('Location required', 'Please wait for your location to load');
    return;
  }
  // Show the service selection sheet (Step 1 of 3)
  setShowServiceSheet(true);
}
```

4. Add a handler for when the user taps Continue in the sheet:
```typescript
function handleServiceSelected(serviceType: ServiceType) {
  setShowServiceSheet(false);
  // TODO (TOW-77): Navigate to Step 2 - Location/Vehicle form
  console.log('Service selected:', serviceType);
}
```

5. Remove the `serviceSelector` View (the four small icons at the bottom of the screen) since this functionality now lives inside the sheet.

6. Render the sheet in JSX (inside the `<View style={styles.container}>`, after the map):
```typescript
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
  onContinue={handleServiceSelected}
/>
```

---

### Step 10: Test the implementation

**Action**: Run the app on iOS simulator or device and verify each acceptance criterion manually.

Test checklist:
- [ ] Tapping "Request Roadside Assistance" slides up the sheet
- [ ] Sheet covers ~95% of the screen
- [ ] Map is visible behind the dark overlay
- [ ] Drag handle is visible at the top of the sheet
- [ ] Tapping the drag handle dismisses the sheet
- [ ] "Towing" card is highlighted/selected by default
- [ ] Towing card shows tow truck icon, "Towing" label, "$75 - $120"
- [ ] Jump Start, Fuel Delivery, Tire Change cards are visible but grayed out (opacity ~40%)
- [ ] Tapping disabled cards does nothing
- [ ] "Continue" button is visible and tappable
- [ ] Tapping "Continue" calls the handler (check console.log for now)
- [ ] Sheet closes after Continue is tapped

---

## Integration Points with Existing Code

### What stays in `app/(commuter)/index.tsx`

- Map rendering (unchanged)
- GPS location logic (unchanged)
- Location button (unchanged)
- "Request Roadside Assistance" button (unchanged visual, changed `onPress` behavior)
- Sign out button (unchanged, temporary)
- `showServiceSheet` state (new)

### What moves out

- The `serviceSelector` View with the four small icon chips at the bottom of the screen is removed. That UI is being replaced by the full-screen sheet's service cards.
- The `selectedService` state variable in `index.tsx` can also be removed (it moves into `RequestServiceSheet.tsx`).

### What connects to TOW-77

When the student implements TOW-77, `handleServiceSelected` in `index.tsx` will be updated to show the Step 2 sheet, passing along the selected `serviceType`. The `ServiceType` value is all that needs to be passed between steps.

---

## Edge Cases

1. **User taps request button before GPS loads** - The existing guard in `handleRequestAssistance` (`if (!userLocation)`) already handles this and shows an alert. The sheet will not open. This behavior is preserved.

2. **User closes the sheet mid-flow** - Since no Firebase write happens in Step 1, closing is harmless. State resets cleanly. No cleanup needed.

3. **Back button on Android** - The `Modal` component's `onRequestClose` prop handles the Android hardware back button. Wire it to `onClose` to dismiss the sheet (this is already in the code hint for Step 2).

4. **Sheet content overflow** - The `ScrollView` inside the sheet prevents overflow if future steps add more content (TOW-77 will add vehicle fields inside this same flow pattern).

5. **Safe area / iPhone home indicator** - The `footer` style uses `paddingBottom: 32` to clear the home indicator. If this is insufficient on certain devices, the student can increase this value or use `useSafeAreaInsets` from `react-native-safe-area-context` (already installed).

---

## Testing Strategy

For this story (MVP phase), testing is manual. The student should:

1. Run `npx expo start` and open on iOS simulator
2. Walk through the acceptance criteria checklist from Step 10 above
3. Test on Android if available (back button behavior especially)
4. Verify that the commuter home screen map is not broken (no regressions)

Automated tests are deferred to Phase 4 per the project testing strategy.

---

## Dependencies

### Libraries (all already installed)

- `react-native` - `Modal`, `View`, `ScrollView`, `TouchableOpacity`, `Text`, `StyleSheet`, `Dimensions`
- `@expo/vector-icons` - Optional, emoji icons are used instead for simplicity
- No new packages required

### Code dependencies

- `types/models.ts` - `ServiceType` can optionally be added here, or kept local to the component
- `app/(commuter)/index.tsx` - Must be modified to integrate the sheet

### Story dependencies

- **TOW-79** (Update Request Data Model) - Already Done. The `Request` interface in `types/models.ts` already has `serviceType: 'tow'` defined. This confirms the data model is ready for when Step 3 (TOW-78) creates the actual Firestore document.
- **TOW-77** (Step 2 - Location/Vehicle) - Blocked by this story. The `handleServiceSelected` stub in Step 9 prepares the handoff point.

---

## Acceptance Criteria Checklist

These map directly to the Jira story criteria:

- [ ] Tapping "Request Roadside Assistance" slides up the selection sheet
- [ ] Sheet uses `animationType="slide"` and covers 95% of screen height
- [ ] "Towing" card is shown and highlighted/selected by default
- [ ] Towing card displays: tow truck icon (🚚), "Towing" label, "$75 - $120" price range
- [ ] Jump Start, Fuel Delivery, and Tire Change cards are visible but disabled (grayed out, not pressable)
- [ ] "Continue" button appears at the bottom of the sheet
- [ ] Tapping the drag handle at the top closes/dismisses the sheet
- [ ] No back button is rendered on the sheet
- [ ] Map remains visible behind the dark overlay when sheet is open
- [ ] Tapping "Continue" logs the selected service type (placeholder for TOW-77 handoff)
