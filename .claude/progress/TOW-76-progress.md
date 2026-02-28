# Implementation Progress: TOW-76

## Story Summary

Build the shell of a single bottom sheet (`components/RequestServiceSheet.tsx`) that will grow across three stories. TOW-76 contributes: the Modal shell, drag handle, a ScrollView containing the step indicator + service type grid, and a pinned "Request Service Now" footer button (disabled for now). TOW-77 and TOW-78 will add their sections into the same ScrollView later.

---

## Completed Steps

- [x] Step 1: Defined TypeScript types and data constants
  - `ServiceType` union type with all six values (`'tow'`, `'jump_start'`, `'fuel_delivery'`, `'tire_change'`, `'lockout'`, `'winch_out'`)
  - `ServiceOption` interface (no `description` field)
  - `SERVICE_OPTIONS` array with all six entries including Lockout and Winch Out
  - `ServiceType` imported from `@/types/models` (not redefined locally)

- [x] Step 2: Created the Modal shell with overlay and sheet container
  - `Modal` with `animationType="slide"` and `transparent={true}`
  - Overlay `View` with semi-transparent black background
  - Sheet `View` at 95% screen height with rounded top corners

- [x] Step 3: Added the drag handle (tap to close)
  - `TouchableOpacity` wrapping a gray pill `View`
  - Calls `onClose` on press

- [x] Step 4: Built the `StepIndicator` sub-component
  - All three nodes (Location, Service, Vehicle) render with the same blue-tinted circle style
  - No active/inactive distinction - the indicator is purely decorative context for the user

- [x] Step 5: Added the "Select Service Type" section header
  - `<Text>` element with the label "Select Service Type" rendered below `StepIndicator`

---

## Current Step

All steps complete. ✅

---

## Completed (continued)

- [x] Step 6: Removed `onContinue`, wrapped FlatList in ScrollView with `scrollEnabled={false}`
- [x] Step 7: Added "Request Service Now" footer button (`disabled={true}`)
- [x] Step 8: StyleSheet complete
- [x] Step 9: Updated `app/(commuter)/index.tsx` — opens sheet on button press, no Firebase call
- [x] Step 10: Manual testing passed on iOS simulator

---

## Step-by-Step Lesson Plan

---

### Steps 1-5 - Completed

Types, `SERVICE_OPTIONS`, Modal shell, drag handle, `StepIndicator`, and "Select Service Type" header are all built. Move on to Step 6.

---

### Step 6 - Correct the Grid and Sheet Structure (IN PROGRESS)

**What you will do.**
Three targeted fixes to the existing `RequestServiceSheet.tsx`:

**Fix A: Remove `onContinue`.**

Open `RequestServiceSheetProps`. Delete the `onContinue` line. Then look at the function signature - delete `onContinue` from the destructured props there too. Do a quick search in the file for any remaining reference to `onContinue` and remove those as well.

**Fix B: Wrap content in `ScrollView`.**

Currently the JSX inside the sheet `View` probably looks something like this (in some form):

```
<View style={styles.sheet}>
  <TouchableOpacity ...>  {/* drag handle */}
  <FlatList ... />         {/* grid */}
</View>
```

You need to restructure it to:

```
<View style={styles.sheet}>
  <TouchableOpacity ...>   {/* drag handle - stays OUTSIDE ScrollView */}
  <ScrollView ...>         {/* new wrapper for all section content */}
    <StepIndicator />
    <Text ...>Select Service Type</Text>
    <FlatList scrollEnabled={false} ... />  {/* grid - INSIDE ScrollView */}
    {/* TOW-77 will add more sections here */}
  </ScrollView>
  {/* footer will go here in Step 7 - also OUTSIDE ScrollView */}
</View>
```

The key rule: the drag handle and the footer button are siblings of the `ScrollView`, not children of it. The step indicator, section header, and grid are children of the `ScrollView`.

**Fix C: Add `scrollEnabled={false}` to `FlatList`.**

Once the `FlatList` is inside the `ScrollView`, you must add `scrollEnabled={false}` to the `FlatList` props. Without this, React Native will log a warning about nested scroll views and scrolling behavior will be unpredictable.

**Concept this teaches.**
`FlatList` is itself a scroll container. When you nest it inside another scroll container (`ScrollView`), they compete for touch events. The rule: only ONE scroll container should be active. Setting `scrollEnabled={false}` on the `FlatList` tells it "don't try to scroll, just render." The outer `ScrollView` handles all scrolling for the whole sheet.

This pattern - one outer `ScrollView` with inner `FlatList` set to `scrollEnabled={false}` - is the standard React Native approach for a complex form that has a list in the middle.

**Try it yourself first.**
Before writing code, draw the new JSX tree on paper (or in a comment block). Label each node: is it inside or outside the `ScrollView`? Once you have the structure clear in your head, translating it to JSX is straightforward. The most common mistake is accidentally putting the footer button inside the `ScrollView` - double-check this after you write it.

**Spec reference.**
See "Issue 3: FlatList is not inside a ScrollView" and the structural fix code block in `.claude/specs/TOW-76.md`.

---

### Step 7 - "Request Service Now" Footer Button (Disabled Stub)

**What you will do.**
After the closing `</ScrollView>` tag but still inside the sheet `View`, add:

```typescript
<View style={styles.footer}>
  <TouchableOpacity
    style={[styles.submitButton, styles.submitButtonDisabled]}
    disabled={true}
  >
    <Text style={styles.submitButtonText}>Request Service Now</Text>
  </TouchableOpacity>
</View>
```

This button does nothing when tapped. The `disabled={true}` prop makes `TouchableOpacity` ignore all touch events. The visual disabled style (added in Step 8) makes it look grayed out so the user understands it is not yet actionable.

**Why "Request Service Now" and not "Continue"?**
The Jira acceptance criteria said "Continue button at bottom". The design shows "Request Service Now" as the only action button. This was a documentation lag - the design is definitive. There is no multi-step Continue flow here; everything lives in one sheet, and the single action is submitting the request.

**Concept this teaches.**
The layout distinction between scrollable content and fixed UI chrome. Pinning the action button outside the scroll area means the user can always reach it regardless of how far they have scrolled. This is a standard mobile UI pattern - nearly every form-style screen in a professional app uses it.

**Try it yourself first.**
Before adding the footer, think about where the user's thumb naturally rests when holding a phone one-handed. Why does pinning the button at the bottom of the screen (not the bottom of the scroll content) matter for usability?

**Spec reference.**
See "Step 4: Add the 'Request Service Now' footer button (disabled stub)" in `.claude/specs/TOW-76.md`.

---

### Step 8 - StyleSheet Cleanup and Additions

**What you will do.**
Your `StyleSheet.create({})` needs several additions to cover the new elements. Add these style objects:

- `scrollView` - for the `ScrollView` wrapper (`flex: 1`)
- `scrollContent` - for the `ScrollView`'s `contentContainerStyle` (`paddingBottom: 8`)
- `footer` - white background, top border, padding
- `submitButton` - blue background, full-width, rounded corners
- `submitButtonDisabled` - gray background, reduced opacity
- `submitButtonText` - white text, bold

You may also need to adjust any existing styles that were written assuming the `FlatList` was the direct child of the sheet (for example, a `flex: 1` that now belongs on the `ScrollView` instead).

**On the step connector line.**
If `stepConnector` uses `position: 'absolute'` and the lines are not rendering correctly in the simulator (not visible, or clipping), this is a known tricky point in React Native flex rows. The alternative approach: insert a plain `<View style={styles.stepConnector} />` between each step node in the row (as a flex sibling, not inside the step item), and give it `flex: 1` with a fixed height and background color. Try your current approach first; switch if it looks wrong.

**Concept this teaches.**
`StyleSheet.create()` runs validation once at startup rather than on every render. This is a small performance optimization, but more importantly it catches style property typos at development time rather than silently rendering incorrectly. Keeping your style names in the same order as the component's visual hierarchy (top to bottom) makes the file much easier to navigate.

**Try it yourself first.**
Write the new style values without looking at the spec first. Pick numbers that look reasonable to you, run the simulator, and adjust by eye. Then compare to the spec values if something looks off. Your eye is the final judge - the spec values are starting points, not absolutes.

**Spec reference.**
See "Step 5: Add styles for new elements" in `.claude/specs/TOW-76.md`. Complete style values for all new style names are listed there.

---

### Step 9 - Update `app/(commuter)/index.tsx`

**What you will do.**
This step is simpler than the original plan because `onContinue` is gone. Make these targeted changes to `index.tsx`:

1. Remove `onContinue={handleServiceSelected}` from the `<RequestServiceSheet>` JSX
2. Remove the `handleServiceSelected` function entirely
3. Remove the `ServiceType` import if it is only used in `handleServiceSelected` (check carefully - do not remove it if it is used elsewhere)
4. Leave everything else unchanged: `showServiceSheet` state, `handleRequestAssistance`, `onClose`, and the `<RequestServiceSheet visible={...} onClose={...} />` JSX remain

After your changes the component usage should look like:

```typescript
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
/>
```

**Concept this teaches.**
Parent-child component communication via props. The parent (`index.tsx`) owns the visibility state and passes it down. The child handles all its own internal logic. Because the "Request Service Now" button now lives inside the component, the parent does not need to know when it is tapped - that communication is fully internal to the component. This is the principle of encapsulation.

**Try it yourself first.**
Before editing, read the current `index.tsx` and identify every line that references `onContinue` or `handleServiceSelected`. List them in a comment. Then delete them one by one and verify the TypeScript compiler does not complain.

**Spec reference.**
See "Step 6: Update `app/(commuter)/index.tsx`" in `.claude/specs/TOW-76.md`.

---

### Step 10 - Manual Testing Against Acceptance Criteria

**What you will do.**
Run `npx expo start` and open on your iOS simulator. Walk through this checklist item by item:

- [ ] Tapping "Request Roadside Assistance" slides up the sheet
- [ ] Sheet covers roughly 95% of screen height
- [ ] Map and dark overlay are visible behind the sheet
- [ ] Drag handle pill is visible at the top of the sheet
- [ ] Tapping the drag handle dismisses the sheet
- [ ] Step indicator shows Location, Service, Vehicle - all three with blue-tinted circles
- [ ] "Select Service Type" section header is visible below the step indicator
- [ ] Six cards are displayed in a 2-column grid (three rows of two)
- [ ] "Towing" card is highlighted with blue border and blue background fill by default
- [ ] All 6 cards show: icon, label, price range
- [ ] Jump Start, Fuel Delivery, Tire Change, Lockout, Winch Out cards are visually grayed out (~40% opacity)
- [ ] Tapping a grayed-out card does nothing
- [ ] "Request Service Now" button is visible and stays pinned at the bottom (does not scroll away)
- [ ] "Request Service Now" button is visually disabled (gray/muted, not the blue active style)
- [ ] Tapping "Request Service Now" does nothing (disabled)
- [ ] Scrolling inside the sheet works - drag up to confirm the scroll area is live
- [ ] No TypeScript errors in the terminal
- [ ] Commuter home screen map still works correctly (no regressions from your `index.tsx` changes)
- [ ] Android back button closes the sheet (if Android device or emulator is available)

**Concept this teaches.**
Manual acceptance testing against written criteria. Every professional feature goes through a structured test pass before it is considered done. Walking through a checklist is also a good habit for catching regressions - things you broke that used to work.

---

## Notes

- Steps 1-5 were completed under the old spec. The types, `SERVICE_OPTIONS`, Modal shell, drag handle, `StepIndicator`, and section header are all correct and do not need to change.
- The significant architectural change in the revised spec (2026-02-28): this is ONE single sheet with one `ScrollView`. TOW-77 and TOW-78 will add sections into the same `ScrollView`, not create new sheet components.
- `onContinue` is gone entirely. The "Request Service Now" button lives inside the component and will be wired to Firebase in TOW-78. The parent only needs `visible` and `onClose`.
- `FlatList` inside `ScrollView` requires `scrollEnabled={false}` on the `FlatList`. Without it you will get a React Native warning and unpredictable scroll behavior.
- The `stepConnector` absolute positioning in the step indicator is a known tricky point. If the lines do not render correctly, the fallback is to place connector `View` elements as flex siblings between step nodes (not inside them) with `flex: 1`.
- `paddingBottom: 32` in the footer style covers the iPhone home indicator on most devices. Use `useSafeAreaInsets` from `react-native-safe-area-context` if it looks clipped on your specific device.
- No Firebase writes happen in this story. TOW-78 handles the `createRequest` call.