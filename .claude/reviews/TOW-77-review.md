# Code Review: TOW-77

## Story: Multi-Step Form - Location/Vehicle

**Branch**: `TOW-77-multi-step-form-location-vehicle`
**Files Reviewed**:
- `/Users/chris/projects/towlink/components/RequestServiceSheet.tsx`
- `/Users/chris/projects/towlink/services/geoLocationUtils.ts`

---

## Acceptance Criteria Verification

- [x] "Detect My Location" button that uses GPS to fill the pickup field - PASSED
- [x] Manual address input field for pickup location - PASSED
- [x] Tapping "Detect" populates the input with location data - PASSED (goes further: uses reverse geocoding to produce a human-readable address)
- [x] Pickup field is required (state held, validation deferred to TOW-78) - PASSED
- [x] Drop-off address input field - PASSED
- [x] Drop-off field is required (state held, validation deferred to TOW-78) - PASSED
- [x] Vehicle Year input (numeric keyboard) - PASSED
- [x] Vehicle Make input (text) - PASSED
- [x] Vehicle Model input (text) - PASSED
- [x] Additional Notes optional text area (multi-line) - PASSED
- [x] All sections in one scrollable modal, user scrolls down - PASSED
- [x] Form data stored in component state - PASSED
- [x] No Firestore write (deferred to TOW-78) - PASSED
- [x] "Request Service Now" button remains disabled - PASSED
- [x] No new files created - changes are inside existing `RequestServiceSheet.tsx` only (with one justified addition to `geoLocationUtils.ts`) - PASSED

**All acceptance criteria: MET**

---

## Code Quality Assessment

### Strengths

**Clean, readable structure**: The four form sections follow a consistent pattern. Each is wrapped in `<View style={styles.formSection}>` with a bold header `<Text>`, then its inputs. A developer reading the JSX can immediately understand the layout.

**Correct controlled inputs**: Every `TextInput` has both `value={...}` and `onChangeText={...}`. State is the single source of truth - this is the correct React pattern.

**Solid async error handling**: `handleDetectLocation` uses `try/catch/finally` correctly. The `finally` block guarantees `isDetectingLocation` resets to `false` whether or not GPS succeeds. Without `finally`, a failed GPS call would leave the button permanently stuck on "Detecting...".

**Button protection against double-tap**: `disabled={isDetectingLocation}` on the Detect button prevents the user from firing multiple simultaneous GPS requests. This is a real-world edge case that was not overlooked.

**Keyboard avoidance implemented correctly**: `KeyboardAvoidingView` wraps the entire modal content with platform-appropriate behavior (`'padding'` for iOS, `'height'` for Android). `keyboardShouldPersistTaps="handled"` on the `ScrollView` prevents the scroll view from consuming taps when the keyboard is open. Both pieces are needed and both are present.

**`reverseGeocode` is a genuine improvement over the spec**: The spec said to display raw coordinates (`"Lat: 34.0522, Lng: -118.2437"`). The student instead added a `reverseGeocode()` function to `geoLocationUtils.ts` that calls `expo-location`'s `reverseGeocodeAsync` to produce a human-readable street address (e.g., "5432 Moorpark St, Los Angeles, CA"). This is a better user experience and the coordinate fallback for rural areas is well thought out.

**TypeScript is clean**: Zero diagnostics from the language server on both changed files. Imports are correctly typed.

**Styles are well-organized**: All new styles are added to the `StyleSheet.create` block (no inline style objects in JSX, aside from the intentional `style={{ flex: 1 }}` on `KeyboardAvoidingView`). Style names are descriptive and consistent.

**`gap: 10` on `vehicleRow`**: Correct use of the modern React Native gap property. The progress notes confirm RN 0.81.5 is in use, which supports `gap` without issue.

---

### Critical Issues

None found.

---

### Warnings

**`reverseGeocode` has no error boundary of its own**: The function is called inside `handleDetectLocation`'s `try` block, so any rejection from `reverseGeocodeAsync` is caught and shows the generic "Location Error" alert. This is functionally safe. However, the `reverseGeocode` function itself (`geoLocationUtils.ts`) does not handle the case where `reverseGeocodeAsync` returns an empty array (i.e., `place` is `undefined`). In that scenario the destructuring `const [place] = await ...` assigns `place` as `undefined`, the `if (place?.city && place?.region)` guard fails, and the coordinate fallback string is returned. This is actually handled correctly via the optional chaining on `place?.city`. No crash will occur. This is a warning only because the behaviour should be consciously understood, not a bug.

**Form state persists between sheet opens**: The spec noted this is acceptable for MVP and mentioned an optional `handleClose` wrapper. The implementation did not add the optional reset - which is fine for this story. It is worth noting for TOW-78 or a future polish story, because a user who closes the sheet after partially filling it out and reopens it will see their old data. This may or may not be desirable UX.

**`returnKeyType="next"` on the Year field is missing**: The Make field has `returnKeyType="next"` but the Year field does not specify a `returnKeyType`. The spec did include it in the JSX example. This is a minor UX gap - the keyboard will show its default return key ("return" or "go" depending on the platform) instead of "Next". Not a blocker, but easy to add.

**`vehicleInputFull: { width: '100%' }` is redundant**: Inside a `formSection` that uses `paddingHorizontal: 16`, a full-width child already fills the available space by default (block-level flex child). The `width: '100%'` does not cause a problem but adds no value and could theoretically cause layout issues if the parent ever changes to a row container. A `flex: 1` or simply removing the style would be cleaner. Very minor.

---

### Suggestions

**Consider adding `accessibilityLabel` props to inputs**: For screen reader accessibility, each `TextInput` should have an `accessibilityLabel`. Example: `accessibilityLabel="Pickup address"`. This is a nice-to-have for production quality and good practice to develop early.

**The `additionalNotes` field has no `returnKeyType`**: For a multiline input this is fine (return creates a new line), but `returnKeyType="done"` with `blurOnSubmit={true}` would let users dismiss the keyboard from the Notes field without scrolling away. Low priority.

**`vehicleYear` is validated by `maxLength={4}` only**: On Android, paste operations can bypass `keyboardType="numeric"` and insert non-numeric characters (e.g., "abcd"). TOW-78 should include a validation pass that checks `vehicleYear` is a valid 4-digit number before allowing submission. The spec already notes this, so it is just a reminder for TOW-78.

**`reverseGeocode` only uses the first result**: `reverseGeocodeAsync` returns an array. The implementation takes the first element with `const [place] = await ...`. This is standard practice - the first result is always the most accurate match. No change needed, but it is worth the student understanding why.

---

## Testing Results

Manual test checklist from the progress file is marked complete. TypeScript compilation passes with zero errors. No runtime issues are apparent from static analysis. The implementation follows all patterns established in the project's existing codebase.

Key behaviours verified through code inspection:
- GPS permission denial path: `status !== 'granted'` guard shows alert and returns (note: `isDetectingLocation` is reset in `finally` even after an early `return`, because `finally` always runs - this is correct)
- GPS error path: `catch` block shows alert, `finally` resets loading state
- Detect button cannot be double-tapped: `disabled={isDetectingLocation}` prevents it
- Keyboard avoidance: `KeyboardAvoidingView` + `keyboardShouldPersistTaps` both present
- Footer button still disabled: confirmed at line 285

---

## Final Verdict

- [x] Ready for production
- [ ] Needs revisions (see critical issues)
- [ ] Needs major rework

The implementation is solid. All acceptance criteria are met. The student went beyond the spec by implementing reverse geocoding for a better user experience. Code quality is high - controlled inputs, proper async error handling, keyboard avoidance, and no TypeScript errors. The warnings noted are minor and do not block moving forward.

---

## Notes for TOW-78

TOW-78 (Price Breakdown and Request Confirmation) will need to:

1. **Read form state**: All six form fields (`pickupAddress`, `dropoffAddress`, `vehicleYear`, `vehicleMake`, `vehicleModel`, `additionalNotes`) plus `selectedService` are already in `RequestServiceSheet`'s local state. TOW-78 extends the same component, so they are directly accessible.

2. **Add form validation**: Before enabling the "Request Service Now" button, TOW-78 should validate:
   - `pickupAddress` is not empty
   - `dropoffAddress` is not empty
   - `vehicleYear` is not empty, is 4 digits, and is a valid year (numeric)
   - `vehicleMake` is not empty
   - `vehicleModel` is not empty
   - The button should become active (blue, not gray) only when all required fields pass validation

3. **Map `vehicleYear` string to number**: The `VehicleInfo` interface in `types/models.ts` defines `year: number`. When TOW-78 builds the `VehicleInfo` object, it must parse `vehicleYear` with `parseInt(vehicleYear, 10)`.

4. **Map `additionalNotes` to the correct field**: The `Request` interface has `additionalNotes?: string` which matches directly.

5. **Coordinate collection for Firestore**: The current `handleDetectLocation` stores a human-readable address string but does not store the raw `latitude`/`longitude`. The `Request` interface requires both `location: Location` (pickup coordinates) and `dropoffLocation: Location` (drop-off coordinates). TOW-78 will need to either (a) also save the raw coordinates when GPS is used, or (b) geocode the address string back to coordinates. Option (a) is simpler - save both when GPS is used, require manual address entry for drop-off (no coordinates needed until a future story adds map-based drop-off selection).

6. **Reset form on close**: Consider adding the optional `handleClose` wrapper described in the spec to reset all state when the sheet closes.
