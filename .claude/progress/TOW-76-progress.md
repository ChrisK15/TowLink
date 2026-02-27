# Implementation Progress: TOW-76

## Story Summary

Build a bottom sheet modal (`components/RequestServiceSheet.tsx`) that slides up when the commuter taps "Request Roadside Assistance". It shows 6 service type cards in a 2-column grid - Towing is selected and enabled by default; the other 5 (Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out) are visible but grayed out. A visual step progress indicator (Location -> Service -> Vehicle) sits at the top. A "Continue" button at the bottom advances to Step 2 (TOW-77). This is Step 1 of 3 in the multi-step request flow.

---

## Completed Steps

- [x] Step 1: Defined TypeScript types and data constants
  - `ServiceType` union type added (4 services - needs `'lockout'` and `'winch_out'` added, see note below)
  - `ServiceOption` interface created (without `description` field per updated spec)
  - `RequestServiceSheetProps` interface created
  - `SERVICE_OPTIONS` array built with 4 entries (needs Lockout and Winch Out added, see note below)

- [x] Step 2: Created the Modal shell with overlay and sheet container
  - `Modal` with `animationType="slide"` and `transparent={true}`
  - Overlay View with semi-transparent black background
  - Sheet View at 95% screen height with rounded top corners

- [x] Step 3: Added the drag handle (tap to close)
  - `TouchableOpacity` wrapping a gray pill `View`
  - Calls `onClose` on press

---

## Current Step

- [ ] Step 4: Build the `StepIndicator` sub-component

---

## Remaining Steps

- [ ] Step 4: Build the `StepIndicator` sub-component
- [ ] Step 5: Add the "Select Service Type" section header
- [ ] Step 6: Build the `ServiceCard` sub-component (square card: icon top, label middle, price bottom)
- [ ] Step 7: Add `selectedService` state and render the 2-column grid with `FlatList`
- [ ] Step 8: Build the pinned "Continue" footer button
- [ ] Step 9: Add the complete `StyleSheet`
- [ ] Step 10: Integrate the new sheet into `app/(commuter)/index.tsx`
- [ ] Step 11: Manual test against acceptance criteria checklist

---

## Step-by-Step Lesson Plan

---

### Step 1 - TypeScript Types and Data Constants (Completed - needs two additions)

**What was built.**
The file `components/RequestServiceSheet.tsx` was created with `ServiceType`, `ServiceOption`, `RequestServiceSheetProps`, and a `SERVICE_OPTIONS` array.

**Two things still need to be updated before this is fully done.**

1. `ServiceType` in the component file needs two new string literals: `'lockout'` and `'winch_out'`. Also check `types/models.ts` - if `ServiceType` is defined there too, it needs the same additions.

2. `SERVICE_OPTIONS` needs two new entries appended:
   - Lockout: icon `'🔑'`, price `'$55-80'`, `isEnabled: false`
   - Winch Out: icon `'⚙️'`, price `'$85-140'`, `isEnabled: false`

Also note: the updated spec removes the `description` field from `ServiceOption`. If your interface still has it, you can leave it in (the spec keeps it for potential future use) - just do not render it on the card.

**Try it yourself first.**
Open your `ServiceType` type and add the two new IDs. Then scroll down to `SERVICE_OPTIONS` and add the two new objects following the same shape as the existing entries. Can you do this without looking at the spec?

**Spec reference.**
See "TypeScript Types" and "Data: Service Options Array" in `.claude/specs/TOW-76.md`.

---

### Step 4 - StepIndicator Sub-Component

**What you will do.**
Above the `RequestServiceSheet` function (but in the same file), define a `StepIndicator` function component. It takes a single prop: `currentStep: 1 | 2 | 3`.

Inside, define an array of three step objects (each with a `label` and an `icon` emoji). Map over them to render a horizontal row. Each step renders:
- An icon circle (a `View` with a rounded border radius)
- A text label below the icon
- A connecting line between this step and the next (except after the last step)

The active step (where `index + 1 === currentStep`) gets a different circle background color and a bolder label color.

In `RequestServiceSheet`, render `<StepIndicator currentStep={1} />` below the drag handle.

**Concept this teaches.**
Building a self-contained sub-component in the same file as the parent component. Conditional styling based on computed state (`isActive`). The `index + 1 === currentStep` pattern is a common way to derive "am I the active item?" from an index.

**Try it yourself first.**
Before looking at the spec hint: sketch the JSX structure on paper or in a comment. You have three steps. Each step needs a container View, an icon circle View, and a label Text. What flex direction does the row need? What flex direction does each individual step item need? Try to write the outer structure before adding styles.

**Key insight on the connector line.**
The connector between steps is tricky. One approach: render it as a `View` with `position: 'absolute'` inside the step item container. A simpler alternative: make each `stepItem` use `flex: 1` and put the connector as a sibling `View` between step items directly in the row (using `flex: 1` to stretch). Either works - pick the one you can reason about more easily.

**Spec reference.**
See "Step 4: Build the step progress indicator" in `.claude/specs/TOW-76.md`. The stylesheet section in Step 9 of the spec also has style values for `stepRow`, `stepItem`, `stepIconCircle`, `stepIconCircleActive`, `stepIcon`, `stepLabel`, `stepLabelActive`, and `stepConnector`.

---

### Step 5 - "Select Service Type" Section Header

**What you will do.**
Below the `<StepIndicator />`, add a single `<Text>` element with the label "Select Service Type".

This replaces the three-line header from the original plan ("Step 1 of 3" + title + subtitle). The step indicator now handles the progress communication visually, so the section header just needs to name the task.

**Concept this teaches.**
How a visual component (the step indicator) can communicate information that used to require text, reducing visual clutter. Less text on screen often makes an interface feel cleaner.

**Try it yourself first.**
Just write the `<Text>` element and give it a style name (`sectionHeader`). Add the style values in Step 9. For now, even unstyled text is fine - verify the structure works before polishing.

**Spec reference.**
See "Step 5: Build the 'Select Service Type' header" in `.claude/specs/TOW-76.md`.

---

### Step 6 - ServiceCard Sub-Component (Square Layout)

**What you will do.**
Above `RequestServiceSheet` (but below `StepIndicator`), define a `ServiceCard` function component. It accepts `option: ServiceOption`, `selected: boolean`, and `onPress: () => void`.

The card layout is vertical (top to bottom):
1. Icon (`<Text>` with emoji, large font)
2. Label (`<Text>`, bold)
3. Price range (`<Text>`, smaller gray text)

Visual states to implement:
- **Normal enabled**: white background, transparent border
- **Selected**: blue border, light blue background fill
- **Disabled**: the entire card at ~40% opacity, `disabled={true}` on the `TouchableOpacity`

**Concept this teaches.**
This card layout is fundamentally different from a horizontal row - the icon sits at the top rather than the left. The `justifyContent: 'space-between'` on the card style spreads the three text elements vertically, giving each card a consistent visual weight. Conditional styling using the array style syntax (`style={[styles.card, selected && styles.cardSelected]}`).

**Try it yourself first.**
Before looking at the spec hint: what flex direction does the card's inner layout need? (The icon is at the top, label in the middle, price at the bottom.) What `TouchableOpacity` prop makes a button completely non-pressable? Try to write the JSX structure before adding styles.

**Spec reference.**
See "Step 6: Build the ServiceCard sub-component (2-column grid card)" in `.claude/specs/TOW-76.md`.

---

### Step 7 - 2-Column Grid with State

**What you will do.**
Back inside `RequestServiceSheet`, add `useState` to track which service is selected (default `'tow'`). Inside the sheet's `ScrollView`, render a `FlatList` with `numColumns={2}`. The `FlatList` renders a `ServiceCard` for each item in `SERVICE_OPTIONS`.

```
numColumns={2}
scrollEnabled={false}   // outer ScrollView handles scrolling
keyExtractor={(item) => item.id}
```

Pass `selected={selectedService === item.id}` and `onPress={() => setSelectedService(item.id)}` to each `ServiceCard`.

**Concept this teaches.**
`FlatList` with `numColumns` is the standard React Native way to build a grid - it handles the row-wrapping automatically. Setting `scrollEnabled={false}` on a `FlatList` nested inside a `ScrollView` is important: two nested scroll views conflict. The outer one handles all scrolling; the inner `FlatList` just handles rendering.

**Try it yourself first.**
Before writing the `FlatList`, think: previously the plan used `ScrollView` with `.map()`. Now you are switching to `FlatList` with `numColumns`. What import do you need to add? What is the `FlatList` equivalent of `key` in a `.map()`? (Hint: look at the `keyExtractor` prop.)

**Spec reference.**
See "Step 7: Build the 2-column service grid" in `.claude/specs/TOW-76.md`.

---

### Step 8 - Pinned "Continue" Footer Button

**What you will do.**
Below the `ScrollView` (but still inside the sheet), add a `<View>` with a `footer` style containing a `<TouchableOpacity>` styled as a full-width blue button with the label "Continue". On press it calls `onContinue(selectedService)`.

Important: this button must be OUTSIDE the `ScrollView` so it stays pinned to the bottom of the sheet and does not scroll away.

**Concept this teaches.**
The layout distinction between scrollable content and fixed UI chrome. In almost every real app, action buttons are pinned outside the scroll area so users can always reach them. This is a best practice pattern you will use in TOW-77 and TOW-78 as well.

**Try it yourself first.**
Look at `components/RequestPopup.tsx` lines 215-233. The `buttonContainer` View is outside the `ScrollView` but inside the same parent `View`. This is the same pattern you need here.

**Spec reference.**
See "Step 8: Build the Continue button (pinned footer)" in `.claude/specs/TOW-76.md`.

---

### Step 9 - Complete StyleSheet

**What you will do.**
Write the full `StyleSheet.create({})` at the bottom of the file. All the style names referenced in previous steps should now be defined with actual values.

**Key colors for this component:**
- Blue accent (selected state): `#1565C0`
- Selected card background fill: `#EFF6FF`
- Active step indicator circle: `#DBEAFE`
- Active step label color: `#1565C0`
- Sheet background: `#F5F5F5`
- Card background: `white`
- Disabled opacity: `0.4`
- Footer border: `#E0E0E0`

**Card sizing for the 2-column grid:**
```
const CARD_SIZE = (Dimensions.get('window').width - 16 * 3) / 2;
// 2 columns, 3 gaps: left edge + middle gap + right edge
```

**Concept this teaches.**
The `StyleSheet.create()` performance optimization (React Native validates styles at creation time). Organizing styles in the same top-to-bottom order as the component's visual hierarchy makes the file easier to navigate.

**Try it yourself first.**
Write your own values first, then compare to the spec's stylesheet. If something looks off in the simulator, adjust. The spec values are starting points - your eye is the final judge. Pay particular attention to the `stepConnector` positioning - it may need adjustment after you see how it actually renders.

**Spec reference.**
See "Step 9: Apply StyleSheet" in `.claude/specs/TOW-76.md`. The spec has complete style values for every named style in the component.

---

### Step 10 - Integration into `app/(commuter)/index.tsx`

**What you will do.**
Modify the commuter home screen to wire up the sheet. Four specific changes:

1. Import `RequestServiceSheet` and the `ServiceType` type from your new component
2. Add `const [showServiceSheet, setShowServiceSheet] = useState(false)`
3. Rewrite `handleRequestAssistance` - remove the `createRequest` Firebase call, just set `showServiceSheet(true)` (keep the location guards)
4. Add a `handleServiceSelected(serviceType: ServiceType)` function that closes the sheet and logs to console (placeholder for TOW-77)
5. Remove the `serviceSelector` View and `selectedService` state (the old four-chip UI - that functionality now lives inside the sheet)
6. Render `<RequestServiceSheet>` in the JSX after the MapView

**Concept this teaches.**
Parent-child component communication via props. The parent (`index.tsx`) owns the visibility state (`showServiceSheet`) and passes down both a value (`visible`) and two callbacks (`onClose`, `onContinue`). The child never manages its own visibility - it just calls the callbacks and the parent decides what to do.

**Try it yourself first.**
Before writing the `<RequestServiceSheet>` JSX, think about what the three props need to be. `visible` is straightforward. What function should `onClose` call? What should `onContinue` call? Write out the prop values in plain English before writing code.

**Spec reference.**
See "Step 10: Integrate into the commuter home screen" in `.claude/specs/TOW-76.md`.

---

### Step 11 - Manual Testing Against Acceptance Criteria

**What you will do.**
Run `npx expo start` and open on your iOS simulator. Walk through every item in this checklist:

- [ ] Tapping "Request Roadside Assistance" slides up the sheet
- [ ] Sheet covers roughly 95% of the screen height
- [ ] The map and dark overlay are visible behind/around the sheet
- [ ] Drag handle pill is visible at the top of the sheet
- [ ] Tapping the drag handle dismisses the sheet
- [ ] Step indicator shows Location, Service, Vehicle - with Service highlighted
- [ ] "Select Service Type" section header is visible below the step indicator
- [ ] Cards are displayed in a 2-column grid (3 rows of 2)
- [ ] "Towing" card is highlighted with blue border and blue background fill by default
- [ ] All 6 cards show: icon, label, price range
- [ ] Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out cards are visible but grayed out (~40% opacity)
- [ ] Tapping a grayed-out card does nothing
- [ ] "Continue" button is visible and stays pinned at the bottom
- [ ] Tapping "Continue" logs the service type to the console and closes the sheet
- [ ] The commuter home screen map still works correctly (no regression)
- [ ] Android back button closes the sheet (if Android device/emulator available)

**Concept this teaches.**
Manual acceptance testing against written criteria. Every professional feature goes through this before it is considered done.

---

## Notes

- Steps 1-3 are marked complete but Step 1 needs two small additions before moving on: add `'lockout'` and `'winch_out'` to `ServiceType`, and add the Lockout and Winch Out entries to `SERVICE_OPTIONS`. Do this before starting Step 4.
- The spec was updated on 2026-02-27 after a Figma design review. The key changes from the original plan: 2-column FlatList grid instead of ScrollView list, square cards instead of horizontal rows, visual StepIndicator instead of plain "Step 1 of 3" text, 6 services instead of 4, real prices on all cards, title changed to "Select Service Type".
- The original plan had 10 steps. The updated plan has 11 steps because the StepIndicator and the section header are now separate steps (4 and 5).
- The existing `serviceSelector` View in `index.tsx` (the four small icon chips) should be completely removed in Step 10. That functionality is being replaced by the full sheet.
- The `selectedService` useState in `index.tsx` should also be removed in Step 10 - it moves into `RequestServiceSheet.tsx`.
- No Firebase writes happen in this story. `handleRequestAssistance` will no longer call `createRequest` - that moves to TOW-78 (Step 3 of the flow).
- `paddingBottom: 32` in the footer style handles the iPhone home indicator. If it looks clipped on your device, increase this value or use `useSafeAreaInsets`.
- The `stepConnector` line in the `StepIndicator` may need positioning adjustments after seeing how it renders. The spec notes two approaches: absolute positioning inside the step item, or inline connector Views between step nodes. Use whichever renders correctly on your device.
