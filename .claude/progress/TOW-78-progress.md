# Implementation Progress: TOW-78

## Story Summary

Add price calculation and request submission to `RequestServiceSheet.tsx`. When the user has filled in both addresses and vehicle details, a price breakdown card appears dynamically below the form showing the fare (Base Fare + Distance Charge + Subtotal + Total). The "Request Service Now" button becomes enabled only when all required fields pass validation. Tapping it writes the full request to Firestore, resets the form, and closes the sheet. A helper function `geocodeAddress()` is added to `services/geoLocationUtils.ts` to convert a typed address string into lat/lng coordinates so distance can be calculated.

---

## Completed Steps

- [x] Step 1: Add `geocodeAddress()` helper to `services/geoLocationUtils.ts`
- [x] Step 2: Add new state variables to `RequestServiceSheet`
- [x] Step 3: Update `handleDetectLocation` to save `pickupCoords`
- [x] Step 4: Add `handleDropoffEndEditing` and wire it to the dropoff TextInput
- [x] Step 5: Add `isFormValid` computed value
- [ ] Step 6: Add price breakdown card UI
- [ ] Step 7: Update submit button (style + enabled state)
- [ ] Step 8: Write `handleSubmit` function
- [ ] Step 9: Write `handleClose` reset wrapper
- [ ] Step 10: Manual test checklist

---

## Current Step

- [ ] Step 2: Add new state variables to `RequestServiceSheet`

---

## Remaining Steps

- [ ] Step 3: Update `handleDetectLocation` to save `pickupCoords`
- [ ] Step 3: Update `handleDetectLocation` to save `pickupCoords`
- [ ] Step 4: Add `handleDropoffEndEditing` and wire it to the dropoff TextInput
- [ ] Step 5: Add `isFormValid` computed value
- [ ] Step 6: Add price breakdown card UI
- [ ] Step 7: Update submit button (style + enabled state)
- [ ] Step 8: Write `handleSubmit` function
- [ ] Step 9: Write `handleClose` reset wrapper
- [ ] Step 10: Manual test checklist

---

## Additional Changes (beyond original spec)

_TBD_

---

## Step Details

### Step 1 - Add `geocodeAddress()` to `geoLocationUtils.ts`

**Learning objective**: Understand geocoding — converting a human-readable address into lat/lng coordinates — and learn how to extend an existing utility file with a new exported function.

**Concept (WHY)**: You already know how to go from GPS coordinates to an address — that's what `reverseGeocode()` does (it uses `reverseGeocodeAsync`). This step goes the other direction: the user types a drop-off address as text, and you need coordinates so you can calculate the distance to the pickup location. `expo-location` provides `geocodeAsync(address)` for exactly this. It uses the device's native geocoding (Apple Maps on iOS, Google on Android) and requires no extra API key — it's already available since you added `expo-location` in TOW-77.

**What to do**:
1. Open `services/geoLocationUtils.ts` and read it to understand the existing structure
2. Add a new exported async function called `geocodeAddress` that:
   - Takes a single `address: string` parameter
   - Returns `Promise<{ latitude: number; longitude: number } | null>`
   - Calls `ExpoLocation.geocodeAsync(address)`
   - Returns `null` if the results array is empty (address not found)
   - Otherwise returns an object with `latitude` and `longitude` from `results[0]`

**Hint — the function signature:**
```ts
export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  // your implementation here
}
```

**Question to think about**: Why do we return `null` instead of throwing an error when the address isn't found? How will the calling code need to handle that `null` case?

---

### Step 2 - Add new state variables to `RequestServiceSheet`

**Learning objective**: Practice adding multiple related state variables at once and understand why each piece of state needs to exist.

**Concept (WHY)**: In TOW-77 you added state for the form fields (strings the user types). This story needs additional state for the *results* of async operations — coordinates and calculated values — and for *UI status flags* that control loading indicators. Keeping these as separate `useState` calls (rather than one big object) means each piece of state can update independently without triggering unnecessary re-renders of unrelated parts.

**What to do**: Open `components/RequestServiceSheet.tsx`. After the last existing `useState` line (the `isDetectingLocation` one), add six new state variables:

- `pickupCoords` — stores `{ latitude: number; longitude: number }` from GPS, or `null` if the user typed manually. TypeScript type: `{ latitude: number; longitude: number } | null`, initial value: `null`
- `dropoffCoords` — same shape as `pickupCoords`, filled when the drop-off field loses focus. Initial value: `null`
- `distanceMiles` — a `number | null` for the calculated straight-line distance. Initial value: `null`
- `estimatedPrice` — a `number | null` for the fare in dollars. Initial value: `null`
- `isCalculatingPrice` — a `boolean` flag while geocoding + calculating. Initial value: `false`
- `isSubmitting` — a `boolean` flag while writing to Firestore. Initial value: `false`

**Question to think about**: `distanceMiles` and `estimatedPrice` could technically be derived from `pickupCoords` and `dropoffCoords` without being stored in state at all (just compute them when rendering). Why might storing them in state be more practical here?

---

### Step 3 - Update `handleDetectLocation` to save `pickupCoords`

**Learning objective**: Understand how to extend an existing async function to do more work, and see the difference between storing data "for display" vs. storing it "for later use."

**Concept (WHY)**: In TOW-77, `handleDetectLocation` captured GPS coordinates only to reverse-geocode them into a display string. The lat/lng was then discarded. Now you need those coordinates again later — to calculate distance when the user enters a drop-off address. The fix is simple: save the coords to state at the same time you save the address string.

**What to do**:
1. Find `handleDetectLocation` in `RequestServiceSheet.tsx`
2. After the line that calls `Location.getCurrentPositionAsync(...)` and gets back a `location` result, add a call to `setPickupCoords` with an object containing `latitude` and `longitude` from `location.coords`
3. The rest of the function (reverse geocode, set address, etc.) stays the same — you're just adding one extra `setPickupCoords(...)` call alongside the existing work

**Important**: Place the `setPickupCoords` call *before* the reverse geocode call so the coordinates are saved even if the reverse geocode step were to fail.

**Question to think about**: What should happen to `pickupCoords` if the user clears the pickup address field and types a manual address instead? (You don't need to fix this now — just think about it and note any edge case you spot.)

---

### Step 4 - Add `handleDropoffEndEditing` and wire it to the dropoff TextInput

**Learning objective**: Understand the `onEndEditing` event (fires when a TextInput loses focus) and practice chaining multiple async steps — geocode → calculate distance → calculate price — all within one handler.

**Concept (WHY)**: You don't want to geocode on every keystroke — that would fire dozens of API calls while the user is still typing. `onEndEditing` fires once, when the user taps away from the field or presses the keyboard's return key. That's the right moment to do the async work. This pattern — "do the expensive thing only when the user is done, not while they type" — is extremely common in form UIs.

**What to do**: Add a new async function called `handleDropoffEndEditing` inside the component body. It should:
1. Return early (do nothing) if `dropoffAddress` is empty after trimming, or if `pickupCoords` is `null`
2. Set `isCalculatingPrice` to `true`
3. Inside a `try` block:
   - Call `geocodeAddress(dropoffAddress)` — you'll need to import this from `geoLocationUtils`
   - If the result is `null`, return early (can't calculate without coords)
   - Call `setDropoffCoords` with the result
   - Call `calculateDistanceMiles(pickupCoords, result)` — already exported from `services/requestCalculations.ts`
   - Call `setDistanceMiles` with the result
   - Call `calculateFare(miles)` — also from `requestCalculations.ts`
   - Call `setEstimatedPrice` with the result
4. Catch any errors with `console.error`
5. Set `isCalculatingPrice` to `false` in a `finally` block

Then, find the dropoff `TextInput` in the JSX and add the prop `onEndEditing={handleDropoffEndEditing}`.

**Hint — imports to add at the top of the file:**
```ts
import { geocodeAddress } from '@/services/geoLocationUtils';
import { calculateDistanceMiles, calculateFare } from '@/services/requestCalculations';
```

**Question to think about**: What happens if the user has typed an address with a GPS pickup, the price card shows, and then they *change* the drop-off address? Does `handleDropoffEndEditing` handle that correctly?

---

### Step 5 - Add `isFormValid` computed value

**Learning objective**: Understand "derived state" — a value you calculate from existing state rather than storing separately — and learn why computing it inline is better than adding yet another `useState`.

**Concept (WHY)**: Some values are *derived* from other state rather than being independent. `isFormValid` is a perfect example: it's just `true` or `false` based on whether all the form fields pass their checks. There is no reason to store it in `useState` because it automatically recalculates every time the component re-renders (which happens whenever any state changes). Storing it in `useState` would mean you'd have to remember to update it manually every time any field changes — error-prone and redundant.

A regex check is used for `vehicleYear` rather than just checking `.length === 4` because `keyboardType="numeric"` on Android can be bypassed by pasting text. The regex `^\d{4}$` guarantees exactly four digits regardless of how the user got the value in there.

**What to do**: Inside the component body (between the state declarations and the `return` statement), add these two lines:

```ts
const yearIsValid =
  vehicleYear.trim().length === 4 && /^\d{4}$/.test(vehicleYear.trim());

const isFormValid =
  pickupAddress.trim() !== '' &&
  dropoffAddress.trim() !== '' &&
  yearIsValid &&
  vehicleMake.trim() !== '' &&
  vehicleModel.trim() !== '';
```

These are plain `const` declarations — not `useState`. They recalculate automatically on every render.

**Question to think about**: The `additionalNotes` field is intentionally NOT included in `isFormValid`. Why is that correct?

---

### Step 6 - Add price breakdown card UI

**Learning objective**: Practice conditional rendering (`{condition && <Component />}`) and build a multi-row layout using flexbox `justifyContent: 'space-between'`.

**Concept (WHY)**: The price card should only appear when there is a price to show — before the user fills in addresses, there's nothing to display. `{estimatedPrice !== null && (...)}` is the standard React pattern for this: if the condition is falsy, React renders nothing. This keeps the UI clean and avoids showing "$0.00" or placeholder prices before the calculation has run.

**What to do**: In the JSX `ScrollView`, after the Additional Notes section and before the footer `View`, add the price breakdown block. It should only render when `estimatedPrice !== null && distanceMiles !== null`.

The card contains four rows:
- Row 1: "Base Fare" label + "$50.00" value
- Row 2: "Distance Charge (X.X mi)" label + calculated value (miles × $5)
- Row 3 (with a top border to act as a divider): "Subtotal" label + calculated value ($50 + miles × $5)
- Row 4: "Total Price" label (bold) + total in large blue text

**Formatting tips:**
- Use `distanceMiles.toFixed(1)` to show one decimal place in the label
- Use `(distanceMiles * 5).toFixed(2)` for the distance charge dollar amount
- `estimatedPrice` is already a whole number (from `calculateFare`), so `${estimatedPrice}.00` works fine

**Styles to add to the StyleSheet** (add these after the existing styles):
```ts
priceCard: {
  backgroundColor: 'white',
  marginTop: 8,
  marginHorizontal: 16,
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: '#E0E0E0',
},
priceCardTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#000',
  marginBottom: 12,
},
priceRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 6,
},
subtotalRow: {
  borderTopWidth: 1,
  borderTopColor: '#E0E0E0',
  marginTop: 4,
  paddingTop: 10,
},
priceLabel: { fontSize: 15, color: '#555' },
priceValue: { fontSize: 15, color: '#000' },
priceTotalLabel: { fontSize: 17, fontWeight: 'bold', color: '#000' },
priceTotalValue: { fontSize: 22, fontWeight: 'bold', color: '#1565C0' },
```

**Question to think about**: The Total row uses `styles.priceTotalLabel` and `styles.priceTotalValue` instead of `styles.priceLabel` / `styles.priceValue`. What's the visual difference this produces?

---

### Step 7 - Update submit button (style + enabled state)

**Learning objective**: Understand how to apply styles conditionally and how `disabled` interacts with both visual appearance and user interaction.

**Concept (WHY)**: In TOW-77 the button was hardcoded to `disabled={true}` because there was no validation logic yet. Now you have `isFormValid`. The button should be grey and untappable when the form is incomplete, and blue and tappable when it's valid. React Native does not automatically change the visual appearance based on `disabled` — you have to do that yourself by applying an additional style conditionally. Using an array of styles (`style={[base, conditional]}`) is the standard React Native way to do this: the second style in the array overrides the first when the condition is true.

**What to do**: Find the "Request Service Now" `TouchableOpacity` in the footer section. Make these changes:

1. Change `disabled={true}` to `disabled={!isFormValid || isSubmitting}`
2. Change `onPress` (currently does nothing or is missing) to `onPress={handleSubmit}`
3. Change the `style` prop from `styles.submitButton` to `[styles.submitButton, isFormValid && styles.submitButtonEnabled]`
4. Change the button label text to show `'Requesting...'` when `isSubmitting` is true, and `'Request Service Now'` otherwise

**Style to add:**
```ts
submitButtonEnabled: {
  backgroundColor: '#1565C0',
},
```

**Question to think about**: The existing `submitButton` style presumably sets a grey background. Why does placing `submitButtonEnabled` second in the style array make it override that grey? What would happen if you put it first?

---

### Step 8 - Write `handleSubmit` function

**Learning objective**: Bring together everything from this story — validation, geocoding, distance calculation, and Firestore writing — into one async function. Practice building a data object from state before saving it.

**Concept (WHY)**: `handleSubmit` is the "final mile" of the commuter request flow. It has to handle an edge case: if the user typed their pickup address manually (instead of using GPS), `pickupCoords` is still `null` even though `pickupAddress` has a value. The function geocodes the pickup address on-the-fly in that case. Similarly, if the user didn't trigger `handleDropoffEndEditing` (e.g. they tapped the submit button while the drop-off field still had focus), `dropoffCoords` might also be `null`. The function geocodes it now if needed. This "geocode-on-submit if not already done" fallback makes the app more robust.

**What to do**: Add an async function called `handleSubmit` inside the component body. Walk through these steps:

1. Guard: `if (!isFormValid) return;`
2. Set `isSubmitting` to `true`
3. Inside a `try` block:
   a. Resolve `pickupCoords`: use the stored value if it exists, otherwise call `geocodeAddress(pickupAddress)`. If the result is still `null`, show an `Alert` telling the user to use the detect button or enter a more specific address, and `return`
   b. Resolve `dropoffCoords`: same pattern — use stored, or geocode now, or `Alert` + `return`
   c. Calculate `miles` using `calculateDistanceMiles` and `price` using `calculateFare`
   d. Build a `vehicleInfo` object with `year: parseInt(vehicleYear, 10)`, `make`, `model`, `licensePlate: ''`, `towingCapacity: ''`
   e. Get the commuter ID from `useAuth()` — import `useAuth` from `@/context/auth-context`, call it at the top of the component, and use `user?.id` here. For now use a placeholder string `'PLACEHOLDER_USER_ID'` if auth is not yet wired up.
   f. Call `createRequest(...)` — import it from `@/services/firebase/firestore`. Pass all required arguments (check the function signature in `firestore.ts`)
   g. Call `handleClose()` to reset state and close the sheet
   h. Show an `Alert` with title `'Request Submitted!'` and message `'Looking for a driver near you...'`. Add a comment: `// TODO TOW-16: Replace with FindingDriverModal navigation`
4. `catch` any errors: `console.error` + `Alert` telling the user to try again
5. `finally`: set `isSubmitting` to `false`

**Note on `vehicleInfo`**: `createRequest` in `firestore.ts` currently accepts `vehicleInfo` as a string. Pass `JSON.stringify(vehicleInfo)` for now. This is a known mismatch to clean up in a future story.

**Question to think about**: Why do we call `handleClose()` *before* the TOW-16 navigation alert rather than after? (Think about what `handleClose()` does to state.)

---

### Step 9 - Write `handleClose` reset wrapper

**Learning objective**: Understand why a "reset on close" wrapper is important for modals that can be reopened, and practice calling a prop function (`onClose`) from within your own wrapper function.

**Concept (WHY)**: A modal can be opened, partially filled, closed, and reopened. Without a reset, the second time the user opens the sheet, all their previous entries are still there. This is almost never desirable — users expect a fresh form each time. The pattern is simple: write a `handleClose` function that resets all state variables back to their initial values, then calls the `onClose` prop to actually close the modal. Every place in the component that currently calls `onClose` directly should be updated to call `handleClose` instead.

**What to do**:
1. Add a `handleClose` function inside the component body (before `handleSubmit` is fine). It should call `setPickupAddress('')`, `setDropoffAddress('')`, `setVehicleYear('')`, `setVehicleMake('')`, `setVehicleModel('')`, `setAdditionalNotes('')`, `setPickupCoords(null)`, `setDropoffCoords(null)`, `setDistanceMiles(null)`, `setEstimatedPrice(null)`, `setIsSubmitting(false)`, and finally `onClose()`
2. Find every place in the JSX that calls `onClose` (the drag handle `onPress`, and `onRequestClose` on the `Modal`) and replace them with `handleClose`

**Hint**: You do NOT need to reset `isCalculatingPrice` or `isDetectingLocation` in `handleClose` — by the time the user closes the sheet, those async operations have already completed (or if they haven't, resetting state mid-flight is fine since the finally block will reset them anyway).

---

### Step 10 - Manual test checklist

**Learning objective**: Systematically verify the full end-to-end flow works before marking the story done.

**What to do**: Run `npx expo start` and open the app on the iOS Simulator. Open the request sheet and verify:

**Price calculation:**
- [ ] Tap "Detect My Location" — GPS resolves to an address in the pickup field
- [ ] Type a nearby address in the drop-off field (e.g. "123 Main St, Los Angeles, CA"), then tap elsewhere to trigger `onEndEditing`
- [ ] Price breakdown card appears below the Additional Notes section
- [ ] Card shows Base Fare ($50.00), a Distance Charge row with miles shown, a Subtotal, and a Total Price in large blue text
- [ ] Total Price is never less than $65
- [ ] If pickup was GPS-detected and drop-off is within a mile, the minimum $65 should apply

**Form validation:**
- [ ] "Request Service Now" button is grey/disabled when any required field is empty
- [ ] Fill in all fields (pickup, dropoff, year as 4 digits, make, model) — button turns blue
- [ ] Clear the vehicle year field — button goes grey again
- [ ] Enter a 3-digit year — button stays grey (validation rejects it)
- [ ] Re-fill the year correctly — button turns blue

**Submission:**
- [ ] With all fields filled and price visible, tap "Request Service Now"
- [ ] Button text changes to "Requesting..." briefly
- [ ] Alert appears saying "Request Submitted! Looking for a driver near you..."
- [ ] Sheet closes after dismissing the alert
- [ ] Reopening the sheet shows a completely blank form (all state reset)
- [ ] Open Firebase Console > Firestore > `requests` collection — a new document exists with the correct data

**Edge cases:**
- [ ] Close the sheet mid-fill (drag down or tap handle) — reopening shows blank form
- [ ] No TypeScript errors or red underlines in the editor
- [ ] No runtime crashes or red error screens in the simulator

---

## Notes

- Two files change in this story: `components/RequestServiceSheet.tsx` (main work) and `services/geoLocationUtils.ts` (new helper)
- No new npm packages to install — `expo-location` geocoding is already available
- The Figma design (`commuter_request_flow_2c.png`) shows a 7-row price breakdown (with time charge, platform fee, and tax). The Jira acceptance criteria specifies a simpler 4-row version. Implement the 4-row AC version — the design is aspirational for a future iteration.
- `createRequest` in `firestore.ts` currently takes `vehicleInfo: string`. Pass `JSON.stringify(vehicleInfo)` for now — this is a known mismatch to clean up later.
- `FindingDriverModal` (TOW-16) is not yet built. The submit handler stubs navigation with an `Alert` and a `// TODO TOW-16` comment.
- Distance is calculated as straight-line (using `calculateDistanceMiles` from `requestCalculations.ts`), not driving distance. The Distance Matrix API mentioned in Jira is a future enhancement.
- `useAuth` from `@/context/auth-context` provides the commuter's user ID. If auth is not yet wired into this component, use `'PLACEHOLDER_USER_ID'` temporarily and note it as a TODO.
