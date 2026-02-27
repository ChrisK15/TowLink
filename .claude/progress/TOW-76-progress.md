# Implementation Progress: TOW-76

## Story Summary

Build a bottom sheet modal (`components/RequestServiceSheet.tsx`) that slides up when the commuter taps "Request Roadside Assistance". It shows service type cards - Towing is selected and enabled by default; Jump Start, Fuel Delivery, and Tire Change are visible but grayed out. A "Continue" button at the bottom advances to Step 2 (TOW-77). This is Step 1 of 3 in the multi-step request flow.

---

## Completed Steps

_(none yet)_

---

## Current Step

- [ ] Step 1: Define TypeScript types and data constants

---

## Remaining Steps

- [ ] Step 1: Define TypeScript types and data constants
- [ ] Step 2: Create the Modal shell with overlay and sheet container
- [ ] Step 3: Add the drag handle (tap to close)
- [ ] Step 4: Build the sheet header (step indicator + title + subtitle)
- [ ] Step 5: Build the `ServiceCard` sub-component with selected and disabled visual states
- [ ] Step 6: Add `selectedService` state and render the scrollable card list
- [ ] Step 7: Build the pinned "Continue" footer button
- [ ] Step 8: Add the complete `StyleSheet`
- [ ] Step 9: Integrate the new sheet into `app/(commuter)/index.tsx`
- [ ] Step 10: Manual test against acceptance criteria checklist

---

## Step-by-Step Lesson Plan

---

### Step 1 - TypeScript Types and Data Constants

**What you will do.**
Create the file `components/RequestServiceSheet.tsx`. Do NOT write any JSX yet. Only define:
- A `ServiceType` union type (the four service IDs as string literals)
- A `ServiceOption` interface (fields: id, label, icon, priceRange, description, isEnabled)
- A `RequestServiceSheetProps` interface (props the parent will pass in)
- A `SERVICE_OPTIONS` constant array with all four services filled in

**Concept this teaches.**
TypeScript union types and interfaces. Designing your data before your UI forces you to think about what information each card needs to display, rather than hardcoding values directly into JSX.

**Try it yourself first.**
Before reading the spec hints: can you write out a TypeScript interface for a single service card? What fields does each card need? What type should `isEnabled` be? What type should `id` be - a plain `string`, or something more specific?

**Spec reference.**
See "TypeScript Types" and "Data: Service Options Array" sections in `.claude/specs/TOW-76.md`.

---

### Step 2 - Modal Shell with Overlay and Sheet Container

**What you will do.**
Write the basic `RequestServiceSheet` function component. Import `Modal`, `View`, and `StyleSheet` from `react-native`. Set up:
- The outer `<Modal>` with `visible`, `animationType="slide"`, `transparent={true}`, and `onRequestClose`
- An overlay `<View>` that fills the screen with a semi-transparent black background
- An inner sheet `<View>` that sits at the bottom and takes up 95% of screen height

No content inside the sheet yet - just the structural shell.

**Concept this teaches.**
How React Native `Modal` works. The `transparent={true}` prop is the key insight: it lets the content behind the modal (the map) show through the dimmed overlay. Without it, the background would be solid white. The `animationType="slide"` gives the sheet its slide-up entrance.

**Try it yourself first.**
Look at how `RequestPopup.tsx` uses `<Modal>` in `components/RequestPopup.tsx` (lines 76-81). It uses `presentationStyle="pageSheet"` instead of `transparent={true}`. What is the difference in visual effect? Which approach does this story need, and why?

**Key values.**
```
overlay: flex 1, backgroundColor 'rgba(0,0,0,0.5)', justifyContent 'flex-end'
sheet: height = Dimensions.get('window').height * 0.95, borderTopLeftRadius 20, borderTopRightRadius 20
```

**Spec reference.**
See "Step 2: Set up the BottomSheet shell" in `.claude/specs/TOW-76.md`.

---

### Step 3 - Drag Handle (Tap to Close)

**What you will do.**
Inside the top of the sheet view, add a `<TouchableOpacity>` wrapping a small pill-shaped `<View>`. Pressing it should call `onClose`.

**Concept this teaches.**
The pattern of a "tap to dismiss" control that looks decorative (a gray pill) but is actually a pressable button. Also how `TouchableOpacity` wraps a non-interactive `View` to make it tappable. This exact pattern already exists in `ActiveTripSheet.tsx` (lines 168-170).

**Try it yourself first.**
Open `components/ActiveTripSheet.tsx` and find the `dragHandle` and `handleContainer` styles (around line 263-273). The pill is just a `View` with a specific width, height, and borderRadius. Can you recreate that style by reading the existing code? You should not need to guess the numbers.

**Spec reference.**
See "Step 3: Build the drag handle" in `.claude/specs/TOW-76.md`.

---

### Step 4 - Sheet Header

**What you will do.**
Below the drag handle, add a header section with three `<Text>` elements:
1. Step indicator: "Step 1 of 3" (small, cyan, uppercase)
2. Title: "Select a Service" (large, bold)
3. Subtitle: "Choose the type of assistance you need" (small, gray)

**Concept this teaches.**
Visual hierarchy through typography. Using `fontSize`, `fontWeight`, `color`, and `letterSpacing` together to make text feel like a proper app header rather than a plain list of strings.

**Try it yourself first.**
Before styling, just render the three `<Text>` elements. Then add styles one at a time and preview in the simulator to see the effect of each style property. This is the best way to understand what each property does.

**Spec reference.**
See "Step 4: Build the sheet header" in `.claude/specs/TOW-76.md`.

---

### Step 5 - ServiceCard Sub-Component

**What you will do.**
Above the main `RequestServiceSheet` function (but in the same file), define a `ServiceCard` function component. It accepts `option: ServiceOption`, `selected: boolean`, and `onPress: () => void`.

Visual states to implement:
- **Normal enabled**: white background, transparent border
- **Selected**: cyan border (`#00D9FF`), very light cyan background tint
- **Disabled**: the entire card at 40% opacity, not pressable

Use the array style syntax `style={[styles.card, selected && styles.cardSelected, !option.isEnabled && styles.cardDisabled]}` to combine styles conditionally.

**Concept this teaches.**
Conditional styling in React Native using array styles. The `disabled` prop on `TouchableOpacity`. The key insight: `!option.isEnabled && styles.cardDisabled` only applies the disabled style when `isEnabled` is false - falsy values in a style array are simply ignored by React Native.

**Try it yourself first.**
Before looking at the spec hint: how would you make a `TouchableOpacity` completely non-pressable? There is a prop for this. Look at the `TouchableOpacity` docs or think about what prop might control interactivity.

**Spec reference.**
See "Step 5: Build the ServiceCard sub-component" in `.claude/specs/TOW-76.md`.

---

### Step 6 - Scrollable Service List with State

**What you will do.**
Back inside `RequestServiceSheet`, add `useState` to track which service is selected (default `'tow'`). Inside the sheet, add a `<ScrollView>` that maps over `SERVICE_OPTIONS` and renders a `<ServiceCard>` for each one. Pass `selected={selectedService === option.id}` and `onPress={() => setSelectedService(option.id)}` to each card.

**Concept this teaches.**
The `.map()` pattern to render lists from data arrays - a fundamental React skill. Also `useState` with a TypeScript type annotation. The `key` prop and why React requires it for lists.

**Try it yourself first.**
Before writing the map, think: what value should `key` be set to on each `ServiceCard`? React needs keys to track which list items changed. What field on `ServiceOption` would be a good unique key?

**Spec reference.**
See "Step 6: Build the scrollable service list" in `.claude/specs/TOW-76.md`.

---

### Step 7 - Pinned "Continue" Footer Button

**What you will do.**
Below the `ScrollView` (but still inside the sheet), add a `<View>` with style `footer` containing a `<TouchableOpacity>` styled as a full-width cyan button with the label "Continue". On press it calls `onContinue(selectedService)`.

Important: this button must be OUTSIDE the `ScrollView` so it stays pinned to the bottom of the sheet and does not scroll away.

**Concept this teaches.**
The layout distinction between scrollable content and fixed UI chrome. In almost every real app, action buttons are pinned outside the scroll area so users can always reach them. This is a best practice pattern you will use in TOW-77 and TOW-78 as well.

**Try it yourself first.**
Look at `RequestPopup.tsx` lines 215-233. The `buttonContainer` View is outside the `<ScrollView>` but inside the same parent `<View>`. This is the same pattern you need here.

**Spec reference.**
See "Step 7: Build the Continue button" in `.claude/specs/TOW-76.md`.

---

### Step 8 - Complete StyleSheet

**What you will do.**
Write the full `StyleSheet.create({})` at the bottom of the file. All the style names referenced in previous steps should now be defined with actual values.

**Key colors for this component:**
- Cyan accent: `#00D9FF`
- Sheet background: `#F5F5F5`
- Card background: `white`
- Selected card border/tint: `#00D9FF` / `rgba(0, 217, 255, 0.05)`
- Disabled opacity: `0.4`
- Footer border: `#E0E0E0`

**Concept this teaches.**
The `StyleSheet.create()` performance optimization (React Native validates styles at creation time). Organizing styles in a logical order matching the visual hierarchy of the component.

**Try it yourself first.**
Write your own values first, then compare to the spec's style values. If something looks off in the simulator, adjust. The spec values are suggestions - your eye is the final judge.

**Spec reference.**
See "Step 8: Apply StyleSheet" in `.claude/specs/TOW-76.md`.

---

### Step 9 - Integration into `app/(commuter)/index.tsx`

**What you will do.**
Modify the commuter home screen to wire up the sheet. Four specific changes:

1. Import `RequestServiceSheet` and the `ServiceType` type from your new component
2. Add `const [showServiceSheet, setShowServiceSheet] = useState(false)`
3. Rewrite `handleRequestAssistance` - remove the `createRequest` Firebase call, just set `showServiceSheet(true)` (keep the location guards)
4. Add a `handleServiceSelected(serviceType: ServiceType)` function that closes the sheet and logs to console (placeholder for TOW-77)
5. Remove the `serviceSelector` View and `selectedService` state (lines 159-185 and line 15 in the current file - that UI moves into the sheet)
6. Render `<RequestServiceSheet>` in the JSX after the MapView

**Concept this teaches.**
Parent-child component communication via props. The parent (`index.tsx`) owns the visibility state (`showServiceSheet`) and passes down both a value (`visible`) and two callbacks (`onClose`, `onContinue`). The child never manages its own visibility - it just calls the callbacks and the parent decides what to do.

**Try it yourself first.**
Before writing the `<RequestServiceSheet>` JSX, think about what the three props need to be. `visible` is straightforward. What function should `onClose` call? What should `onContinue` call? Write out the prop values in plain English before writing code.

**Spec reference.**
See "Step 9: Integrate into the commuter home screen" in `.claude/specs/TOW-76.md`.

---

### Step 10 - Manual Testing Against Acceptance Criteria

**What you will do.**
Run `npx expo start` and open on your iOS simulator. Walk through every item in this checklist:

- [ ] Tapping "Request Roadside Assistance" slides up the sheet
- [ ] Sheet covers roughly 95% of the screen height
- [ ] The map and dark overlay are visible behind/around the sheet
- [ ] Drag handle pill is visible at the top of the sheet
- [ ] Tapping the drag handle dismisses the sheet
- [ ] "Towing" card is highlighted with cyan border by default
- [ ] Towing card shows the tow truck icon, "Towing" label, and "$75 - $120"
- [ ] Jump Start, Fuel Delivery, and Tire Change cards are visible but grayed out
- [ ] Tapping a grayed-out card does nothing
- [ ] "Continue" button is visible and stays pinned at the bottom
- [ ] Tapping "Continue" logs the service type to the console and closes the sheet
- [ ] The commuter home screen map still works correctly (no regression)
- [ ] Android back button closes the sheet (if Android device/emulator available)

**Concept this teaches.**
Manual acceptance testing against written criteria. Every professional feature goes through this before it is considered done.

---

## Notes

- The existing `serviceSelector` View in `index.tsx` (the four small icon chips) should be completely removed in Step 9. That functionality is being replaced by the full sheet.
- The `selectedService` useState in `index.tsx` (line 15) should also be removed - it moves into `RequestServiceSheet.tsx`.
- No Firebase writes happen in this story. `handleRequestAssistance` will no longer call `createRequest` - that moves to TOW-78 (Step 3 of the flow).
- The `handleServiceSelected` function in `index.tsx` is a stub. TOW-77 will replace the `console.log` with logic to show the Step 2 sheet.
- `paddingBottom: 32` in the footer style handles the iPhone home indicator. If it looks clipped on your device, increase this value.
