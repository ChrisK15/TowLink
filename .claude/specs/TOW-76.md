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

## Design Review Notes (Updated 2026-02-27)

The Figma design file `commuter_request_flow_2a.png` was reviewed against the original spec. Below is the judgment call for each difference found.

### Difference 1: Screen vs. Bottom Sheet Modal

**Design shows**: A full-screen navigation page with a back arrow (`<`) in the top-left and "Request Service" as a nav bar title. No drag handle. No dark overlay over a map.

**Jira says**: "slides up a selection modal", "Tapping Drag Handle closes Modal", "Modal fills ~95%", "No Back Button"

**Decision: Keep spec (Jira takes precedence)**

The Jira acceptance criteria are explicit: bottom sheet modal with drag handle, 95% height, no back button. The design appears to show a future-state full-screen navigation variant (possibly for when the multi-step flow grows more complex). For MVP, implement as a bottom sheet modal as Jira specifies. The design is used as a visual reference for card layout and content only.

---

### Difference 2: Card Layout - 2-Column Grid vs. Vertical List

**Design shows**: A 2-column grid. Each card is roughly square, with the icon at top-left, label in the middle, and price at the bottom-left. No description text is visible on any card.

**Spec had**: Vertical list of full-width horizontal-row cards (icon left, label + description center, price right).

**Decision: Adopt - update to 2-column grid**

The 2-column grid is a better use of space for 6 service cards inside a 95% height sheet. It also removes the need for a description text field on the card, simplifying the component. The card layout becomes: icon top-left, label below icon, price below label.

The `ServiceOption` interface `description` field is removed from cards (it was never shown in the design). The field can be kept in the data for potential tooltips later but removed from the card `ServiceCard` render.

---

### Difference 3: Visual Step Progress Indicator

**Design shows**: A horizontal progress stepper with icons and labels: `(pin) Location --- (car) Service --- (wheel) Vehicle`. The "Service" step appears highlighted/active.

**Spec had**: Plain text "Step 1 of 3" label.

**Decision: Adopt - build a visual step indicator**

This is a better UX and the design is clear enough to implement. The step indicator is a horizontal row of three nodes connected by lines. The active step is visually distinct (highlighted icon + label). This replaces the plain text "Step 1 of 3".

The step indicator is simple enough to build with standard React Native Views and does not require a third-party library.

---

### Difference 4: Six Service Cards (not four)

**Design shows**: Six services: Towing, Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out.

**Spec had**: Four services: Towing, Jump Start, Fuel Delivery, Tire Change.

**Decision: Adopt - add Lockout and Winch Out**

Both additional services are shown in the design with real price ranges. Add them to `SERVICE_OPTIONS` as disabled (MVP constraint - only Towing is functional). Update `ServiceType` to include `'lockout'` and `'winch_out'`.

---

### Difference 5: Real Prices Shown on All Cards vs. "Coming Soon"

**Design shows**: All six cards display real prices (Jump Start $45-65, Fuel Delivery $35-50, etc.). No "Coming Soon" text anywhere.

**Jira says**: Other services are "disabled/grayed out". It does not specify what price text to show.

**Decision: Adopt real prices, keep disabled state**

Show real price ranges on all cards (as the design does) but keep the `isEnabled: false` behavior: the card is not pressable and is visually grayed out (reduced opacity). This is better UX than "Coming Soon" - the commuter can see what the service will cost when it launches. The Jira constraint about "disabled/grayed out" is about the interactivity, not the price text.

Updated price data:

- Towing: $75-120
- Jump Start: $45-65
- Fuel Delivery: $35-50
- Tire Change: $50-75
- Lockout: $55-80
- Winch Out: $85-140

---

### Difference 6: Title Text

**Design shows**: "Request Service" as the nav bar title, and "Select Service Type" as a section label above the grid.

**Spec had**: "Select a Service" as the sheet title.

**Decision: Adopt "Select Service Type"**

Use "Select Service Type" as the section header above the grid. Since this is a bottom sheet (not a nav screen), the title sits inside the sheet body below the drag handle. Drop the subtitle ("Choose the type of assistance you need") since the design does not show it.

---

### Difference 7: "Pickup Location" + "Request Service Now" Sections in Design

**Design shows**: Below the 6 service cards, the same scrollable screen continues with a "Pickup Location" section (Detect My Location button + address input), "Drop-off Location", "Vehicle Details", "Additional Notes", and a "Request Service Now" button at the bottom.

**Decision: Defer - this is TOW-77 and TOW-78 scope**

TOW-76 covers only the service selection step. The location/vehicle fields and the final submit button belong to TOW-77 and TOW-78. The `ScrollView` layout used in this story should be architected to support these additions in later stories. The "Continue" button from Jira is TOW-76's action; the "Request Service Now" button will replace or follow it in later stories.

---

## Architecture Overview

This feature introduces a **bottom sheet modal** that slides up over the map when the commuter taps "Request Roadside Assistance". It is **Step 1 of 3** in the multi-step request flow:

```
Step 1 (TOW-76): Service Selection  →  Step 2 (TOW-77): Location/Vehicle  →  Step 3 (TOW-78): Price Confirmation
```

The sheet is a **new component** at `components/RequestServiceSheet.tsx`. The parent screen (`app/(commuter)/index.tsx`) owns the visibility state and passes it down via props.

### Library Decision: React Native Modal (not @gorhom/bottom-sheet)

Use React Native's built-in `Modal` component as the outer wrapper. This is consistent with the existing `RequestPopup.tsx` pattern in the codebase and avoids needing to configure `BottomSheetModalProvider` in the layout. `@gorhom/bottom-sheet` remains available for future use if swipe-to-dismiss gesture becomes a requirement.

---

## Component Breakdown

### Files to Create

**`components/RequestServiceSheet.tsx`** - The new bottom sheet component

This component is responsible for:

- Rendering the bottom sheet UI at 95% screen height using `Modal` + `Animated.View`
- Displaying the visual step progress indicator (Location, Service, Vehicle)
- Displaying the "Select Service Type" section header
- Rendering the service type cards in a 2-column grid layout
- Highlighting "Towing" as selected by default
- Showing all other services with real prices but disabled/grayed out (not pressable)
- Rendering the "Continue" button at the bottom
- Calling `onClose` when the drag handle is tapped
- Calling `onContinue(selectedService)` when Continue is tapped

### Files to Modify

**`app/(commuter)/index.tsx`** - The commuter home screen

Changes needed:

- Add `showServiceSheet` boolean state variable
- Change `handleRequestAssistance` to set `showServiceSheet = true` (instead of directly creating a Firebase request)
- Render `<RequestServiceSheet>` with the appropriate props
- Remove the placeholder `serviceSelector` UI (the 4 small service icon chips at the bottom of the screen) since that logic moves into the sheet

---

## TypeScript Types

Define these locally inside `components/RequestServiceSheet.tsx` since they are UI-only types not stored in Firestore.

```typescript
// All service types. Only 'tow' is functional for MVP.
export type ServiceType =
	| 'tow'
	| 'jump_start'
	| 'fuel_delivery'
	| 'tire_change'
	| 'lockout'
	| 'winch_out';

// Describes a single service option card in the UI
export interface ServiceOption {
	id: ServiceType;
	label: string;
	icon: string; // Emoji used as the card icon
	priceRange: string; // e.g. "$75-120"
	isEnabled: boolean; // Only 'tow' is true for MVP
}
```

---

## Component Props Interface

```typescript
interface RequestServiceSheetProps {
	visible: boolean; // Controls whether the sheet is shown
	onClose: () => void; // Called when drag handle is tapped
	onContinue: (serviceType: ServiceType) => void; // Called when Continue is tapped
}
```

---

## Data: Service Options Array

Define this as a constant inside the component file. Six services, matching the Figma design. All prices are real. Only Towing is enabled.

```typescript
const SERVICE_OPTIONS: ServiceOption[] = [
	{
		id: 'tow',
		label: 'Towing',
		icon: '🚗',
		priceRange: '$75-120',
		isEnabled: true,
	},
	{
		id: 'jump_start',
		label: 'Jump Start',
		icon: '🔋',
		priceRange: '$45-65',
		isEnabled: false,
	},
	{
		id: 'fuel_delivery',
		label: 'Fuel Delivery',
		icon: '⛽',
		priceRange: '$35-50',
		isEnabled: false,
	},
	{
		id: 'tire_change',
		label: 'Tire Change',
		icon: '🔧',
		priceRange: '$50-75',
		isEnabled: false,
	},
	{
		id: 'lockout',
		label: 'Lockout',
		icon: '🔑',
		priceRange: '$55-80',
		isEnabled: false,
	},
	{
		id: 'winch_out',
		label: 'Winch Out',
		icon: '⚙️',
		priceRange: '$85-140',
		isEnabled: false,
	},
];
```

---

## Visual Design Reference

From `commuter_request_flow_2a.png` (the authoritative design source):

### Step Progress Indicator

A horizontal row near the top of the sheet with three nodes connected by lines:

```
(pin icon)  ----  (car icon)  ----  (wheel icon)
 Location          Service            Vehicle
```

- The active step (Service) has a blue-tinted circle background on its icon
- The inactive steps (Location, Vehicle) have a light gray circle background
- Connecting lines between nodes are gray
- Labels below each icon in small text

### Service Card (2-Column Grid)

Each card is a square-ish tile. Layout inside the card (top to bottom, left-aligned):

- Icon (emoji, large) - top section
- Label (bold text) - middle
- Price (regular text, gray/dark) - bottom

The selected card (Towing) has a blue border and light blue background fill.
Disabled cards have no colored border and reduced opacity (~40%).

### Sheet Structure (top to bottom)

```
[ Drag Handle ]
[ Step Progress Indicator ]
[ "Select Service Type" section label ]
[ 2-column grid of 6 service cards ]
[ (scroll continues - future: location/vehicle fields for TOW-77) ]
[ Continue Button - pinned to bottom ]
```

---

## Implementation Steps

### Step 1: Add TypeScript types and data to the component file

**File**: `components/RequestServiceSheet.tsx` (create new file)
**Action**: Create the file with the `ServiceType`, `ServiceOption`, and `RequestServiceSheetProps` type definitions, and the `SERVICE_OPTIONS` constant array. No JSX yet.

**Why**: Getting types right first prevents rework. Six services, all with real prices, only `isEnabled: true` for towing.

---

### Step 2: Set up the Modal shell

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add the Modal shell. Use React Native `Modal` with `animationType="slide"` and `transparent={true}`.

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

The `transparent={true}` with an overlay `View` lets the map show through the darkened background.

---

### Step 3: Build the drag handle

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add the drag handle at the very top of the sheet. It is a `TouchableOpacity` wrapping a short gray pill `View`.

```typescript
<TouchableOpacity onPress={onClose} style={styles.handleContainer}>
  <View style={styles.dragHandle} />
</TouchableOpacity>
```

Style: `dragHandle` is 40px wide, 4px tall, gray (`#CCCCCC`), border radius 2. Same approach as `ActiveTripSheet.tsx`.

---

### Step 4: Build the step progress indicator

**File**: `components/RequestServiceSheet.tsx`
**Action**: Create a `StepIndicator` sub-component (defined in the same file, above the main export).

The component renders three steps in a horizontal row. Each step has an icon circle and a label. Steps are connected by horizontal lines. The active step has a highlighted icon circle.

```typescript
interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { label: 'Location', icon: '📍' },
    { label: 'Service',  icon: '🚗' },
    { label: 'Vehicle',  icon: '🚘' },
  ];

  return (
    <View style={styles.stepRow}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.label} style={styles.stepItem}>
            <View style={[styles.stepIconCircle, isActive && styles.stepIconCircleActive]}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
              {step.label}
            </Text>
            {!isLast && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );
}
```

In `RequestServiceSheet`, render `<StepIndicator currentStep={1} />` inside the sheet, below the drag handle.

Note: the connector line positioning requires some care with absolute positioning or flex layout. See the stylesheet section below for guidance.

---

### Step 5: Build the "Select Service Type" header

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add a section label below the step indicator.

```typescript
<Text style={styles.sectionHeader}>Select Service Type</Text>
```

This replaces the previous multi-line header block ("Step 1 of 3" + title + subtitle).

---

### Step 6: Build the ServiceCard sub-component (2-column grid card)

**File**: `components/RequestServiceSheet.tsx`
**Action**: Create a `ServiceCard` component for the new card layout. The card is vertical (icon top, label middle, price bottom) rather than horizontal.

```typescript
interface ServiceCardProps {
  option: ServiceOption;
  selected: boolean;
  onPress: () => void;
}

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
      <Text style={styles.cardLabel}>{option.label}</Text>
      <Text style={styles.cardPrice}>{option.priceRange}</Text>
    </TouchableOpacity>
  );
}
```

Visual states:

- **Selected** (Towing by default): Blue border (`#1565C0` or similar blue matching the design), light blue background fill
- **Disabled**: `opacity: 0.4`, card is not pressable (`disabled={true}`)

---

### Step 7: Build the 2-column service grid

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add `selectedService` state (default `'tow'`). Render `SERVICE_OPTIONS` in a 2-column grid inside a `ScrollView`.

The 2-column grid is built with a `FlatList` or a manual pair-of-rows approach. The simplest approach for 6 items is `FlatList` with `numColumns={2}`:

```typescript
const [selectedService, setSelectedService] = useState<ServiceType>('tow');

// In JSX (inside the sheet, below the section header, inside the ScrollView):
<FlatList
  data={SERVICE_OPTIONS}
  keyExtractor={(item) => item.id}
  numColumns={2}
  scrollEnabled={false}       // ScrollView handles scrolling
  renderItem={({ item }) => (
    <ServiceCard
      option={item}
      selected={selectedService === item.id}
      onPress={() => setSelectedService(item.id)}
    />
  )}
  columnWrapperStyle={styles.gridRow}
  contentContainerStyle={styles.grid}
/>
```

Because `FlatList` is inside a `ScrollView`, set `scrollEnabled={false}` on the `FlatList` to prevent scroll conflicts.

Alternatively, the grid can be rendered with plain `View` rows (map SERVICE_OPTIONS into pairs) - either approach works. The `FlatList` with `numColumns={2}` is cleaner.

---

### Step 8: Build the Continue button (pinned footer)

**File**: `components/RequestServiceSheet.tsx`
**Action**: The Continue button sits below the `ScrollView`, pinned to the bottom of the sheet. It must NOT be inside the `ScrollView`.

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

The design shows the final CTA as "Request Service Now" but that is the TOW-78 button. For TOW-76, the Jira AC specifies a "Continue" button as the step-forward action. Use "Continue" here.

---

### Step 9: Apply StyleSheet

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add `StyleSheet.create({})` with all styles. Key values:

```typescript
const CARD_SIZE = (Dimensions.get('window').width - 16 * 3) / 2; // 2 columns, 3 gaps (left, middle, right)

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
	// Step indicator
	stepRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: 'white',
	},
	stepItem: {
		alignItems: 'center',
		flex: 1,
	},
	stepIconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#E8E8E8',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	stepIconCircleActive: {
		backgroundColor: '#DBEAFE', // light blue matching design
	},
	stepIcon: {
		fontSize: 18,
	},
	stepLabel: {
		fontSize: 12,
		color: '#999',
	},
	stepLabelActive: {
		color: '#1565C0',
		fontWeight: '600',
	},
	stepConnector: {
		position: 'absolute',
		top: 20, // vertically centered on the icon circles
		left: '60%', // starts after this step's icon
		right: '-60%', // ends before next step's icon
		height: 2,
		backgroundColor: '#CCCCCC',
		zIndex: -1,
	},
	// Section header
	sectionHeader: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	// Grid
	grid: {
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	gridRow: {
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	// Card
	card: {
		width: CARD_SIZE,
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 14,
		borderWidth: 2,
		borderColor: 'transparent',
		minHeight: 120,
		justifyContent: 'space-between',
	},
	cardSelected: {
		borderColor: '#1565C0',
		backgroundColor: '#EFF6FF',
	},
	cardDisabled: {
		opacity: 0.4,
	},
	cardIcon: {
		fontSize: 28,
		marginBottom: 8,
	},
	cardLabel: {
		fontSize: 15,
		fontWeight: '600',
		color: '#000',
		marginBottom: 4,
	},
	cardPrice: {
		fontSize: 13,
		color: '#555',
	},
	// Scroll content
	scrollView: {
		flex: 1,
	},
	// Footer
	footer: {
		backgroundColor: 'white',
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
		padding: 16,
		paddingBottom: 32,
	},
	continueButton: {
		backgroundColor: '#1565C0',
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	continueButtonText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: 'bold',
	},
});
```

Note: the `stepConnector` line positioning with `position: 'absolute'` is tricky inside a flex row. If it does not render correctly, an alternative is to render the connector lines as sibling `View`s between the step items in the `stepRow` container, using `flex: 1` on the connectors to fill the space between nodes. Adjust in practice.

---

### Step 10: Integrate into the commuter home screen

**File**: `app/(commuter)/index.tsx`
**Action**: Wire the sheet into the existing screen.

1. Import the new component:

```typescript
import { RequestServiceSheet } from '@/components/RequestServiceSheet';
import type { ServiceType } from '@/components/RequestServiceSheet';
```

2. Add state:

```typescript
const [showServiceSheet, setShowServiceSheet] = useState(false);
```

3. Update `handleRequestAssistance` to show the sheet:

```typescript
async function handleRequestAssistance() {
	if (!userLocation) {
		Alert.alert('Location required', 'Please wait for your location to load');
		return;
	}
	setShowServiceSheet(true);
}
```

4. Add a handler for when the user taps Continue:

```typescript
function handleServiceSelected(serviceType: ServiceType) {
	setShowServiceSheet(false);
	// TODO (TOW-77): Navigate to Step 2 - Location/Vehicle form
	console.log('Service selected:', serviceType);
}
```

5. Remove the `serviceSelector` View (the four small icon chips at the bottom of the screen).

6. Remove the `selectedService` state from `index.tsx` (it now lives inside `RequestServiceSheet.tsx`).

7. Render the sheet in JSX (after the map, inside the container):

```typescript
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
  onContinue={handleServiceSelected}
/>
```

---

### Step 11: Test the implementation

**Action**: Run the app and verify each acceptance criterion manually.

Test checklist:

- [ ] Tapping "Request Roadside Assistance" slides up the sheet
- [ ] Sheet covers ~95% of screen height
- [ ] Map is visible behind the dark overlay
- [ ] Drag handle is visible at the top of the sheet
- [ ] Tapping the drag handle dismisses the sheet
- [ ] Step indicator shows Location, Service, Vehicle with Service highlighted
- [ ] "Select Service Type" section header is visible
- [ ] Cards are displayed in a 2-column grid
- [ ] "Towing" card is highlighted/selected by default (blue border + blue background)
- [ ] All 6 cards show: icon, label, price range
- [ ] Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out are grayed out (opacity ~40%)
- [ ] Tapping a disabled card does nothing
- [ ] "Continue" button is pinned at the bottom outside the scroll area
- [ ] Tapping "Continue" calls the handler (check console.log for now)
- [ ] Sheet closes after Continue is tapped
- [ ] No back button appears on the sheet
- [ ] Commuter home screen map is not broken (no regressions)

---

## Integration Points with Existing Code

### What stays in `app/(commuter)/index.tsx`

- Map rendering (unchanged)
- GPS location logic (unchanged)
- Location button (unchanged)
- "Request Roadside Assistance" button (visual unchanged, `onPress` behavior changes)
- Sign out button (unchanged, temporary)
- `showServiceSheet` state (new)

### What moves out of `index.tsx`

- The `serviceSelector` View with four small icon chips is removed
- The `selectedService` state variable in `index.tsx` is removed (moves into `RequestServiceSheet.tsx`)

### What connects to TOW-77

When implementing TOW-77, `handleServiceSelected` in `index.tsx` will show the Step 2 sheet, passing along the `serviceType`. The `ServiceType` value is the only thing that needs to be passed between steps. The `RequestServiceSheet` component may be extended (or TOW-77 will add a new sheet component) to include the location/vehicle fields shown in `commuter_request_flow_2b.png`.

---

## Edge Cases

1. **User taps request button before GPS loads** - The existing guard (`if (!userLocation)`) already handles this. Sheet will not open. Behavior preserved.

2. **User closes the sheet mid-flow** - No Firebase write happens in Step 1. Closing is harmless. State resets cleanly.

3. **Back button on Android** - The `Modal`'s `onRequestClose` prop handles the Android hardware back button. Wire it to `onClose`.

4. **Sheet content overflow** - The `ScrollView` inside the sheet prevents overflow. The `FlatList` inside must have `scrollEnabled={false}` to avoid scroll conflicts.

5. **Safe area / iPhone home indicator** - The `footer` style uses `paddingBottom: 32`. If insufficient on certain devices, increase this value or use `useSafeAreaInsets` from `react-native-safe-area-context` (already installed).

6. **Step connector line positioning** - Absolute positioning for the connector lines may need adjustment based on actual render. If the `position: 'absolute'` approach causes z-index or clipping issues, switch to inline connector `View`s between step nodes in the flex row.

7. **FlatList inside ScrollView** - React Native warns about nested scroll views. Setting `scrollEnabled={false}` on the inner `FlatList` suppresses the warning and ensures correct behavior. The outer `ScrollView` handles all scrolling.

---

## Testing Strategy

Manual testing for MVP (automated tests deferred to Phase 4):

1. Run `npx expo start` and open on iOS simulator
2. Walk through the acceptance criteria checklist from Step 11
3. Test on Android if available (back button behavior especially)
4. Verify the commuter home screen map renders correctly before and after sheet interactions

---

## Dependencies

### Libraries (all already installed)

- `react-native` - `Modal`, `View`, `FlatList`, `ScrollView`, `TouchableOpacity`, `Text`, `StyleSheet`, `Dimensions`
- No new packages required

### Code dependencies

- `app/(commuter)/index.tsx` - Must be modified to integrate the sheet

### Story dependencies

- **TOW-79** (Update Request Data Model) - Already Done. `serviceType` field is ready in `types/models.ts`.
- **TOW-77** (Step 2 - Location/Vehicle) - Blocked by this story. The `handleServiceSelected` stub prepares the handoff point.

---

## Acceptance Criteria Checklist

These map directly to the Jira story criteria:

- [ ] Tapping "Request Roadside Assistance" slides up the selection sheet
- [ ] Sheet uses `animationType="slide"` and covers 95% of screen height
- [ ] "Towing" card is shown and highlighted/selected by default (blue border + fill)
- [ ] Towing card displays: icon, "Towing" label, "$75-120" price range
- [ ] All 6 services are shown in a 2-column grid (Towing, Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out)
- [ ] Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out are visible but disabled (grayed out, not pressable)
- [ ] Disabled cards show real price ranges (not "Coming Soon")
- [ ] Visual step progress indicator is shown (Location, Service, Vehicle with Service highlighted)
- [ ] "Select Service Type" section header is shown
- [ ] "Continue" button appears pinned at the bottom of the sheet
- [ ] Tapping the drag handle at the top closes/dismisses the sheet
- [ ] No back button is rendered on the sheet
- [ ] Map remains visible behind the dark overlay when sheet is open
- [ ] Tapping "Continue" logs the selected service type (placeholder for TOW-77 handoff)