# Technical Specification: TOW-76]

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
- Modal fills ~95% of screen height when open (implemented at 90% — intentional decision by developer, preferred visually)

---

## INTENTIONAL DESIGN DEVIATIONS (Updated 2026-02-28)

- **Sheet height**: Implemented at `0.9` (90%) instead of `0.95`. Developer preference — looks better on device.
- **StepIndicator**: Omitted intentionally. The Location → Service → Vehicle progress indicator was evaluated and deemed unnecessary visual complexity for MVP. Deferred to a future polish sprint.

---

## ARCHITECTURE CORRECTION (Updated 2026-02-28)

**The original spec assumed a multi-sheet flow where TOW-76 rendered one sheet, TOW-77 rendered a second sheet, and TOW-78 rendered a third.** This was wrong.

The design (commuter_request_flow_2a.png, 2b.png, 2c.png) shows ONE single bottom sheet with a single ScrollView containing all content stacked vertically. The "Request Service Now" button is pinned outside the ScrollView at the bottom of the sheet at all times.

### What the three screenshots actually show

All three screenshots are the same component, scrolled to different positions:

- **2a**: Top of the sheet - step indicator + service type grid (6 cards) + start of Pickup Location section
- **2b**: Middle of the sheet - bottom of service grid + Pickup Location + Drop-off Location + Vehicle Details + Additional Notes
- **2c**: Bottom of the sheet - Drop-off Location + Vehicle Details + Additional Notes + Price Breakdown card

The "Request Service Now" button appears pinned at the bottom in all three screenshots. It is NOT inside the ScrollView.

### How the three stories divide the work

| Story  | Responsibility                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------- |
| TOW-76 | Sheet shell (Modal, drag handle, ScrollView, footer button stub) + service type grid section              |
| TOW-77 | Adds Pickup Location, Drop-off Location, Vehicle Details, Additional Notes sections to the existing sheet |
| TOW-78 | Adds Price Breakdown section and wires "Request Service Now" to Firebase                                  |

TOW-77 and TOW-78 **extend `components/RequestServiceSheet.tsx`** - they do not create new sheet components.

---

## Architecture Overview

`RequestServiceSheet` is a single bottom sheet component that grows across three stories. The parent screen (`app/(commuter)/index.tsx`) controls visibility via a `visible` prop and an `onClose` callback. The submit action (Firebase write) happens entirely inside the component in TOW-78 - the parent does not need an `onContinue` callback.

```
app/(commuter)/index.tsx
  └─ <RequestServiceSheet visible={showSheet} onClose={...} />
       ├─ Modal (animationType="slide", transparent)
       │    └─ overlay View
       │         └─ sheet View (95% height)
       │              ├─ drag handle (TouchableOpacity → onClose)
       │              ├─ ScrollView  ← all sections go here
       │              │    ├─ [TOW-76] Step indicator
       │              │    ├─ [TOW-76] "Select Service Type" header
       │              │    ├─ [TOW-76] Service grid (FlatList, numColumns=2)
       │              │    ├─ [TOW-77] Pickup Location section (placeholder)
       │              │    ├─ [TOW-77] Drop-off Location section (placeholder)
       │              │    ├─ [TOW-77] Vehicle Details section (placeholder)
       │              │    ├─ [TOW-77] Additional Notes section (placeholder)
       │              │    └─ [TOW-78] Price Breakdown section (placeholder)
       │              └─ footer View (outside ScrollView)
       │                   └─ [TOW-78] "Request Service Now" button (disabled stub in TOW-76)
```

---

## Design Review Notes

### Difference 1: Screen vs. Bottom Sheet Modal

**Design shows**: A full-screen navigation page with a back arrow in the top-left and "Request Service" as a nav bar title. No drag handle. No dark overlay.

**Jira says**: "slides up a selection modal", "Tapping Drag Handle closes Modal", "Modal fills ~95%", "No Back Button"

**Decision: Keep Jira spec (bottom sheet modal)**

Implement as a bottom sheet modal with drag handle and dark overlay. The design is used as a visual reference for section content and layout only.

---

### Difference 2: Card Layout - 2-Column Grid

**Design shows**: A 2-column grid. Each card is roughly square, with the icon at top-left, label in the middle, and price at the bottom-left.

**Decision: Adopt - 2-column grid**

Six cards, two columns, three rows. No description text on cards.

---

### Difference 3: Step Progress Indicator

**Design shows**: A horizontal row with three icon+label nodes (Location, Service, Vehicle) connected by lines. All three nodes appear filled/active with blue-tinted circles in every screenshot.

**Decision: Adopt the visual indicator, render all steps as active**

The step indicator is decorative context for the user ("this sheet covers all three of these things"). It does not track which section the user has scrolled to. Render all three nodes with the blue-tinted icon circle style. This is simpler and matches the design more accurately than a stateful active-step tracker.

---

### Difference 4: Six Service Cards

**Design shows**: Towing, Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out.

**Decision: Adopt - six cards**

All six are shown. Only Towing is `isEnabled: true`. The other five are grayed out and not pressable. All show real price ranges.

---

### Difference 5: No "Continue" Button

**Design shows**: "Request Service Now" is the only CTA button. There is no "Continue" button anywhere in the three screenshots.

**Jira says**: "Continue button at bottom"

**Decision: Build "Request Service Now" footer now, disable it until TOW-78**

The Jira AC was written before the full design was reviewed. The design is definitive: there is one button, "Request Service Now", pinned at the bottom. It will be disabled (grayed out, not pressable) in TOW-76 since it cannot submit to Firebase yet. TOW-78 enables it and wires up the Firebase write. Remove all references to a "Continue" button.

---

### Difference 6: Title Text

**Design shows**: "Select Service Type" as a section label above the grid.

**Decision: Adopt - use "Select Service Type" as section header**

---

## Component Props Interface

The `onContinue` prop is removed. The sheet is self-contained. The parent only controls visibility.

```typescript
interface RequestServiceSheetProps {
	visible: boolean; // Controls whether the sheet is shown
	onClose: () => void; // Called when drag handle is tapped
}
```

There is no `onContinue` callback. The "Request Service Now" button lives inside the component and in TOW-78 it will call a Firebase function directly.

---

## TypeScript Types

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

`ServiceType` is imported from `@/types/models` (already defined there from TOW-79). Do not redefine it locally.

---

## Data: Service Options Array

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

### Step Progress Indicator

A horizontal row near the top of the sheet with three nodes connected by lines:

```
(pin icon)  ----  (car icon)  ----  (wheel icon)
 Location          Service            Vehicle
```

All three nodes use the blue-tinted circle style. Connecting lines between nodes are gray. Labels below each icon in small text. The indicator is purely decorative - it has no active/inactive state logic.

### Service Card (2-Column Grid)

Each card is a square-ish tile. Layout inside the card (top to bottom, left-aligned):

- Icon (emoji, large) - top section
- Label (bold text) - middle
- Price (regular text, gray) - bottom

The selected card (Towing by default): blue border (`#1565C0`), light blue background fill.
Disabled cards: `opacity: 0.4`, not pressable.

### Sheet Structure (top to bottom)

```
[ Drag Handle ]
[ ScrollView ]
  [ Step Progress Indicator (all three nodes blue) ]
  [ "Select Service Type" section label ]
  [ 2-column grid of 6 service cards ]
  [ --- placeholder gap for TOW-77 sections --- ]
[ Footer (outside ScrollView) ]
  [ "Request Service Now" button - DISABLED in TOW-76 ]
```

### "Request Service Now" Button - Disabled State

In TOW-76 the button exists but is always disabled. Use a visually distinct disabled style (reduced opacity, no shadow) so the user can see it is not yet actionable. TOW-78 enables it once all required fields are filled.

---

## What Needs to Change in the Already-Built Code

The student completed Steps 1-6 of the old spec. The built code in `components/RequestServiceSheet.tsx` has the following issues that must be corrected:

### Issue 1: `onContinue` prop must be removed

**Current code**:

```typescript
interface RequestServiceSheetProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (serviceType: ServiceType) => void; // REMOVE THIS
}

export function RequestServiceSheet({
  visible,
  onClose,
  onContinue, // REMOVE THIS
}: RequestServiceSheetProps) {
```

**Fix**: Remove `onContinue` from the interface and destructuring. The parent (`index.tsx`) must also have its `onContinue` handler removed and the prop removed from the JSX.

### Issue 2: No footer button exists in the current build

The current component has no "Continue" button and no "Request Service Now" button. The sheet ends after the `FlatList`. The footer with the pinned button must be added.

**What to add**:

```typescript
// Outside the ScrollView, inside the sheet View:
<View style={styles.footer}>
  <TouchableOpacity
    style={[styles.submitButton, styles.submitButtonDisabled]}
    disabled={true}
  >
    <Text style={styles.submitButtonText}>Request Service Now</Text>
  </TouchableOpacity>
</View>
```

The button is always `disabled={true}` in TOW-76. TOW-78 will add the enable logic.

### Issue 3: FlatList is not inside a ScrollView

The current build uses a bare `FlatList` that occupies the full sheet height. This will conflict with adding more sections in TOW-77. The `FlatList` must be wrapped in a `ScrollView` with `scrollEnabled={false}` set on the `FlatList`.

**Structural fix**:

```typescript
<View style={styles.sheet}>
  {/* Drag handle - stays outside ScrollView */}
  <TouchableOpacity onPress={onClose} style={styles.handleContainer}>
    <View style={styles.dragHandle} />
  </TouchableOpacity>

  {/* All section content scrolls together */}
  <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
    <StepIndicator />
    <Text style={styles.sectionTitle}>Select Service Type</Text>
    <FlatList
      data={SERVICE_OPTIONS}
      numColumns={2}
      scrollEnabled={false}
      keyExtractor={(item) => item.id}
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
    {/* TOW-77 sections will be added below the FlatList here */}
  </ScrollView>

  {/* Footer pinned outside ScrollView */}
  <View style={styles.footer}>
    <TouchableOpacity
      style={[styles.submitButton, styles.submitButtonDisabled]}
      disabled={true}
    >
      <Text style={styles.submitButtonText}>Request Service Now</Text>
    </TouchableOpacity>
  </View>
</View>
```

### Issue 4: Step indicator is missing

The current build skips the step progress indicator. It must be added above the "Select Service Type" title inside the `ScrollView`. All three nodes should render with the blue-tinted circle style (no active/inactive distinction).

### Issue 5: `onContinue` usage in `app/(commuter)/index.tsx`

The parent screen currently passes `onContinue` to the sheet. Once the prop is removed from the component, the parent call site must also be updated:

```typescript
// BEFORE (remove this):
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
  onContinue={handleServiceSelected}
/>

// AFTER:
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
/>
```

The `handleServiceSelected` function and `ServiceType` import in `index.tsx` can be removed entirely.

---

## Implementation Steps

### Step 1: Remove `onContinue` from the component props and interface

**File**: `components/RequestServiceSheet.tsx`
**Action**: Delete `onContinue` from `RequestServiceSheetProps` and from the function destructuring.

---

### Step 2: Add the `StepIndicator` sub-component

**File**: `components/RequestServiceSheet.tsx`
**Action**: Define `StepIndicator` above the main export. All three nodes use the same blue-tinted active style.

```typescript
function StepIndicator() {
  const steps = [
    { label: 'Location', icon: '📍' },
    { label: 'Service',  icon: '🚗' },
    { label: 'Vehicle',  icon: '🚘' },
  ];

  return (
    <View style={styles.stepRow}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View key={step.label} style={styles.stepItem}>
            <View style={styles.stepIconCircleActive}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
            </View>
            <Text style={styles.stepLabelActive}>{step.label}</Text>
            {!isLast && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );
}
```

---

### Step 3: Wrap content in ScrollView and restructure the sheet layout

**File**: `components/RequestServiceSheet.tsx`
**Action**: Restructure the returned JSX so that:

- The drag handle is outside the `ScrollView` (at the top of the sheet `View`)
- A `ScrollView` wraps all section content
- The `FlatList` is inside the `ScrollView` with `scrollEnabled={false}`
- The footer `View` is outside the `ScrollView` (at the bottom of the sheet `View`)

This is the critical structural change that allows TOW-77 and TOW-78 to add their sections by appending inside the `ScrollView`.

---

### Step 4: Add the "Request Service Now" footer button (disabled stub)

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add the pinned footer `View` containing the disabled button. Place it after the closing `</ScrollView>` tag, still inside the sheet `View`.

The button text must say "Request Service Now" (not "Continue"). It is `disabled={true}` and uses a muted visual style.

---

### Step 5: Add styles for new elements

**File**: `components/RequestServiceSheet.tsx`
**Action**: Add to the `StyleSheet.create({})` block:

```typescript
scrollView: {
  flex: 1,
},
scrollContent: {
  paddingBottom: 8,
},
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
stepIconCircleActive: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#DBEAFE',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
},
stepIcon: {
  fontSize: 18,
},
stepLabelActive: {
  fontSize: 12,
  color: '#1565C0',
  fontWeight: '600',
},
stepConnector: {
  position: 'absolute',
  top: 20,
  left: '60%',
  right: '-60%',
  height: 2,
  backgroundColor: '#CCCCCC',
  zIndex: -1,
},
footer: {
  backgroundColor: 'white',
  borderTopWidth: 1,
  borderTopColor: '#E0E0E0',
  padding: 16,
  paddingBottom: 32,
},
submitButton: {
  backgroundColor: '#1565C0',
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: 'center',
},
submitButtonDisabled: {
  backgroundColor: '#9E9E9E',
  opacity: 0.6,
},
submitButtonText: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: 'bold',
},
```

Note on the connector line: the `position: 'absolute'` approach for `stepConnector` may need adjustment depending on how the flex row renders. If the lines do not appear correctly, replace with inline `View` spacers between step nodes using `flex: 1` - this is a known layout tricky point in React Native.

---

### Step 6: Update `app/(commuter)/index.tsx`

**File**: `app/(commuter)/index.tsx`
**Action**:

1. Remove `onContinue={handleServiceSelected}` from the `<RequestServiceSheet>` JSX
2. Remove the `handleServiceSelected` function
3. Remove the `ServiceType` import if it is only used in `handleServiceSelected`
4. Leave everything else unchanged (the `showServiceSheet` state, `handleRequestAssistance`, `onClose` remain)

---

### Step 7: Test the implementation

**Action**: Run `npx expo start` and verify manually.

Test checklist:

- [ ] Tapping "Request Roadside Assistance" slides up the sheet
- [ ] Sheet covers ~95% of screen height
- [ ] Map is visible behind the dark overlay
- [ ] Drag handle is visible at the top of the sheet
- [ ] Tapping the drag handle dismisses the sheet
- [ ] Step indicator shows Location, Service, Vehicle - all three with blue circles
- [ ] "Select Service Type" section header is visible below the step indicator
- [ ] Six cards displayed in a 2-column grid (Towing, Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out)
- [ ] "Towing" card is highlighted/selected by default (blue border + blue background tint)
- [ ] All 6 cards show icon, label, and price range
- [ ] Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out are grayed out (opacity ~40%)
- [ ] Tapping a disabled card does nothing
- [ ] "Request Service Now" button is visible at the bottom, outside the scroll area
- [ ] "Request Service Now" button is visually disabled (gray/muted)
- [ ] Tapping "Request Service Now" does nothing (disabled)
- [ ] Scrolling inside the sheet works (drag up to reveal space below grid)
- [ ] No back button appears on the sheet
- [ ] Commuter home screen map is not broken (no regressions)

---

## How TOW-77 Extends This Component

When TOW-77 is implemented, the developer will:

1. Add `pickupAddress`, `dropoffAddress`, `vehicleYear`, `vehicleMake`, `vehicleModel`, `additionalNotes` state variables inside `RequestServiceSheet`
2. Add the Pickup Location section (Detect My Location button + text input) inside the `ScrollView`, below the `FlatList`
3. Add the Drop-off Location section (text input) below Pickup Location
4. Add the Vehicle Details section (Year, Make, Model inputs in a row + Model below) below Drop-off
5. Add the Additional Notes textarea below Vehicle Details
6. The footer button remains disabled - TOW-78 enables it

The component file grows, but the structure established in TOW-76 (ScrollView + pinned footer) does not change.

---

## How TOW-78 Extends This Component

When TOW-78 is implemented, the developer will:

1. Add the Price Breakdown card section inside the `ScrollView`, below Additional Notes
2. Add form validation logic: the submit button is enabled only when required fields are filled (service selected, pickup address entered, vehicle year/make/model entered)
3. Wire the "Request Service Now" `onPress` to call the Firebase `createRequest` function with all collected form data
4. Handle loading state (button shows spinner while Firebase call is in progress)
5. Handle success (close sheet, show confirmation) and error (show Alert) cases

---

## Edge Cases

1. **User taps request button before GPS loads** - Existing guard in `index.tsx` (`if (!userLocation)`) prevents sheet from opening. Behavior preserved.

2. **User closes the sheet mid-flow** - No Firebase write happens in TOW-76. Closing is harmless. The `selectedService` state resets to `'tow'` the next time the sheet opens because `useState` initializes fresh on mount - but since this is a `Modal` (not unmounted), the state persists while the app is running. This is acceptable for MVP.

3. **Android hardware back button** - The `Modal`'s `onRequestClose` prop calls `onClose`. Already handled in the current build.

4. **FlatList inside ScrollView warning** - React Native logs a warning about nested scroll views. Setting `scrollEnabled={false}` on the `FlatList` suppresses it. Already noted.

5. **Safe area / iPhone home indicator** - `paddingBottom: 32` in the footer style covers most devices. If insufficient on specific devices, `useSafeAreaInsets` from `react-native-safe-area-context` (already installed) can be used to set `paddingBottom` dynamically.

6. **Step connector line rendering** - The `position: 'absolute'` connector approach is fragile in flex rows. If it renders incorrectly (lines not visible, clipping), switch to inserting a `<View style={styles.stepConnector} />` as a flex sibling between step nodes, using `flex: 1` to fill the gap. Adjust the style accordingly.

---

## Testing Strategy

Manual testing only for MVP (automated tests deferred to Phase 4):

1. Run `npx expo start`, open on iOS simulator
2. Walk through the Step 7 checklist above
3. Test on Android if available (back button behavior)
4. Verify the commuter home screen renders correctly before and after sheet interactions

---

## Dependencies

### Libraries (all already installed)

- `react-native` - `Modal`, `View`, `FlatList`, `ScrollView`, `TouchableOpacity`, `Text`, `StyleSheet`, `Dimensions`
- No new packages required

### Code dependencies

- `app/(commuter)/index.tsx` - Must be modified to remove `onContinue` prop usage
- `types/models.ts` - `ServiceType` is already defined here (TOW-79 done)

### Story dependencies

- **TOW-79** (Update Request Data Model) - Done. `ServiceType` and related fields are ready.
- **TOW-77** (Location/Vehicle) - Blocked by TOW-76. Will extend this same component.
- **TOW-78** (Price Breakdown & Submit) - Blocked by TOW-77. Will extend this same component.

---

## Acceptance Criteria Checklist

Mapping Jira AC to the revised implementation:

| Jira AC                                                           | How it is met                                                                                                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tapping "Request Roadside Assistance" slides up a selection modal | `handleRequestAssistance` sets `showServiceSheet = true`, Modal slides up                                            |
| Modal shows "Towing" service card highlighted/selected by default | `selectedService` state initialized to `'tow'`, card renders with `cardSelected` style                               |
| Towing card shows: icon, "Towing" label, "$75-120"                | `SERVICE_OPTIONS[0]` has all three fields, rendered by `ServiceCard`                                                 |
| Other service types shown as disabled/grayed out                  | `isEnabled: false` on five cards, `cardDisabled` style applies `opacity: 0.4`, `disabled={true}` on TouchableOpacity |
| "Continue" button at bottom                                       | Replaced by "Request Service Now" disabled stub - the design supersedes this Jira AC                                 |
| Tapping Drag Handle closes Modal                                  | `handleContainer` `onPress` calls `onClose`                                                                          |
| No back button                                                    | No back button rendered anywhere in the component                                                                    |
| Modal fills ~95% of screen height                                 | `SHEET_HEIGHT = Dimensions.get('window').height * 0.95`                                                              |