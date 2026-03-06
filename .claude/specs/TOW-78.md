# Technical Spec: TOW-78 — Price Breakdown & Request Confirmation

**Story**: As a commuter, I want to see the price before confirming my request, so that I know what I'll pay.
**Branch**: `TOW-78-price-breakdown-request-confirmation`
**Design ref**: `.claude/design/screens/commuter_request_flow_2c.png`

---

## Current State (after TOW-77)

`RequestServiceSheet.tsx` already has:
- All form fields: pickup address, dropoff address, vehicle year/make/model, additional notes
- GPS "Detect My Location" → reverse-geocodes to address string only (no coords stored)
- "Request Service Now" button permanently disabled (`disabled={true}`)
- No price calculation, no form validation, no Firestore call

---

## What This Story Adds

1. **Store pickup lat/lng** alongside the address when GPS is used
2. **Geocode dropoff address** to get lat/lng for distance calculation
3. **Form validation** — enable submit button only when all required fields pass
4. **Price calculation** using existing `calculateFare()` in `requestCalculations.ts`
5. **Price breakdown card** — appears dynamically once form is complete
6. **"Request Service Now"** — creates Firestore request, closes sheet, stubs FindingDriverModal
7. **Form state reset** when sheet closes

---

## Design vs. Jira Discrepancy — IMPORTANT

The Figma design (`commuter_request_flow_2c.png`) shows a 7-row breakdown:
- Base Fare, Distance Charge, **Time Charge**, Subtotal, **Platform Fee (5%)**, **Tax (8.5%)**, Total

The Jira acceptance criteria specifies a simpler 4-row breakdown:
- Base Fare: $50.00
- Distance Charge: miles × $5/mile
- Subtotal
- **Total Price** (large blue text, minimum $65)

**The existing `calculateFare(miles)` already implements the Jira formula:**
```ts
Math.max(65, Math.round(50 + 5 * miles))  // services/requestCalculations.ts:16
```

**Recommendation**: Implement the Jira 4-row version. The Figma design is aspirational — the AC takes precedence. You can note to your instructor that the design shows a more complex breakdown for a future iteration.

---

## Files to Modify

| File | Change |
|------|--------|
| `components/RequestServiceSheet.tsx` | Main work — validation, price UI, submit |
| `services/geoLocationUtils.ts` | Add `geocodeAddress()` helper |

**No other files need to change.** The `createRequest()` function in `firestore.ts` already accepts all necessary parameters.

---

## Step-by-Step Implementation Plan

### Step 1 — Store pickup coordinates from GPS

**Problem**: `handleDetectLocation` currently saves the reverse-geocoded address but discards the lat/lng. We need those coords to calculate distance.

**Add new state:**
```ts
const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
```

**Update `handleDetectLocation`** — after getting `location`, save both:
```ts
setPickupCoords({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
});
// then reverse geocode and setPickupAddress(...) as before
```

**Key insight**: If the user types their pickup address manually, `pickupCoords` stays `null`. That means distance can't be calculated until submit time. We'll handle this in Step 4.

---

### Step 2 — Geocode dropoff address

The drop-off field is text-only. To calculate distance, we need to convert that address to lat/lng.

**Add a helper in `services/geoLocationUtils.ts`:**
```ts
import * as ExpoLocation from 'expo-location';

export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const results = await ExpoLocation.geocodeAsync(address);
  if (results.length === 0) return null;
  return {
    latitude: results[0].latitude,
    longitude: results[0].longitude,
  };
}
```

`ExpoLocation.geocodeAsync` uses the device's native geocoding (Apple Maps on iOS, Google on Android). It's free and requires no extra API key.

> **Note on "Google Distance Matrix API"**: The Jira story mentions this API for driving distance. For MVP, we're using straight-line distance (geofire-common already in the project). Driving distance via Distance Matrix API can be a future enhancement. The pricing formula doesn't change either way.

---

### Step 3 — Form validation

Add a computed `isFormValid` boolean (no new state needed — derive it from existing state):

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

**Why regex on year?** Android's `keyboardType="numeric"` can be bypassed by paste. The regex check ensures exactly 4 digits regardless of how the user enters it.

---

### Step 4 — Price calculation trigger

Add state for the calculated values:
```ts
const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null);
const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
```

**Trigger**: Geocode the dropoff and calculate price when the dropoff `TextInput` loses focus (`onEndEditing`):

```ts
const handleDropoffEndEditing = async () => {
  if (!dropoffAddress.trim() || !pickupCoords) return;

  try {
    setIsCalculatingPrice(true);
    const coords = await geocodeAddress(dropoffAddress);
    if (!coords) return;

    setDropoffCoords(coords);
    const miles = calculateDistanceMiles(pickupCoords, coords);
    setDistanceMiles(miles);
    setEstimatedPrice(calculateFare(miles));
  } catch (error) {
    console.error('Price calculation error:', error);
  } finally {
    setIsCalculatingPrice(false);
  }
};
```

Add `onEndEditing={handleDropoffEndEditing}` to the dropoff `TextInput`.

**What if user typed pickup manually (no GPS)?** `pickupCoords` will be null, so price can't show. This is acceptable for MVP — the GPS button is the primary flow. The button will still be enabled once form is valid; we'll geocode pickup at submit time if needed.

**Show/hide price breakdown**: Render the price card only when `estimatedPrice !== null`.

---

### Step 5 — Price breakdown UI

Insert this section in the `ScrollView`, below the "Additional Notes" section and above the footer. Only render when `estimatedPrice !== null`:

```tsx
{estimatedPrice !== null && distanceMiles !== null && (
  <View style={styles.priceCard}>
    <Text style={styles.priceCardTitle}>Price Breakdown</Text>

    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>Base Fare</Text>
      <Text style={styles.priceValue}>$50.00</Text>
    </View>

    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>
        Distance Charge ({distanceMiles.toFixed(1)} mi)
      </Text>
      <Text style={styles.priceValue}>
        ${(distanceMiles * 5).toFixed(2)}
      </Text>
    </View>

    <View style={[styles.priceRow, styles.subtotalRow]}>
      <Text style={styles.priceLabel}>Subtotal</Text>
      <Text style={styles.priceValue}>
        ${(50 + distanceMiles * 5).toFixed(2)}
      </Text>
    </View>

    <View style={styles.priceRow}>
      <Text style={styles.priceTotalLabel}>Total Price</Text>
      <Text style={styles.priceTotalValue}>${estimatedPrice}.00</Text>
    </View>
  </View>
)}
```

**Styles to add:**
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
priceLabel: {
  fontSize: 15,
  color: '#555',
},
priceValue: {
  fontSize: 15,
  color: '#000',
},
priceTotalLabel: {
  fontSize: 17,
  fontWeight: 'bold',
  color: '#000',
},
priceTotalValue: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#1565C0',  // Blue, matches design
},
```

---

### Step 6 — Enable and wire up the submit button

**Update the button** in the `footer`:
```tsx
<TouchableOpacity
  style={[
    styles.submitButton,
    isFormValid && styles.submitButtonEnabled,
  ]}
  onPress={handleSubmit}
  disabled={!isFormValid || isSubmitting}
>
  <Text style={styles.submitButtonText}>
    {isSubmitting ? 'Requesting...' : 'Request Service Now'}
  </Text>
</TouchableOpacity>
```

Add `submitButtonEnabled` style:
```ts
submitButtonEnabled: {
  backgroundColor: '#1565C0',  // Blue when enabled
},
```

**Add `isSubmitting` state:**
```ts
const [isSubmitting, setIsSubmitting] = useState(false);
```

---

### Step 7 — handleSubmit function

```ts
const handleSubmit = async () => {
  if (!isFormValid) return;

  try {
    setIsSubmitting(true);

    // Resolve pickup coords — use stored GPS coords, or geocode if typed manually
    let finalPickupCoords = pickupCoords;
    if (!finalPickupCoords) {
      finalPickupCoords = await geocodeAddress(pickupAddress);
      if (!finalPickupCoords) {
        Alert.alert('Address Error', 'Could not find your pickup address. Please use the detect location button or enter a more specific address.');
        return;
      }
    }

    // Resolve dropoff coords — use stored from price calc, or geocode now
    let finalDropoffCoords = dropoffCoords;
    if (!finalDropoffCoords) {
      finalDropoffCoords = await geocodeAddress(dropoffAddress);
      if (!finalDropoffCoords) {
        Alert.alert('Address Error', 'Could not find your drop-off address. Please enter a more specific address.');
        return;
      }
    }

    const miles = calculateDistanceMiles(finalPickupCoords, finalDropoffCoords);
    const price = calculateFare(miles);

    // Build VehicleInfo object
    const vehicleInfo = {
      year: parseInt(vehicleYear, 10),
      make: vehicleMake.trim(),
      model: vehicleModel.trim(),
      licensePlate: '',       // Not collected yet
      towingCapacity: '',     // Not collected yet
    };

    // TODO: Replace with real commuter ID from auth context (useAuth hook)
    const commuterId = 'PLACEHOLDER_USER_ID';

    await createRequest(
      commuterId,
      finalPickupCoords,
      finalDropoffCoords,
      pickupAddress,
      dropoffAddress,
      JSON.stringify(vehicleInfo),   // firestore.ts currently accepts string
      price,
      miles,
      additionalNotes || undefined,
    );

    // Close the sheet
    handleClose();

    // TODO: Navigate to FindingDriverModal (TOW-16 not yet built)
    Alert.alert(
      'Request Submitted!',
      'Looking for a driver near you...',
    );

  } catch (error) {
    console.error('Error submitting request:', error);
    Alert.alert('Error', 'Failed to submit request. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

> **Important**: `createRequest` in `firestore.ts` currently takes `vehicleInfo: string`. The `Request` model has `vehicleInfo?: VehicleInfo` (an object). For now pass `JSON.stringify(vehicleInfo)`. This mismatch is a known issue to clean up in a future story.

> **Auth context**: You'll need to get the real `commuterId` from `useAuth()`. Import `useAuth` from `@/context/auth-context` and use `user?.id` or `user?.uid`. Replace the placeholder.

---

### Step 8 — Form reset on close

Replace the bare `onClose` prop usage with a wrapper that also resets all state:

```ts
const handleClose = () => {
  // Reset all form state
  setPickupAddress('');
  setDropoffAddress('');
  setVehicleYear('');
  setVehicleMake('');
  setVehicleModel('');
  setAdditionalNotes('');
  setPickupCoords(null);
  setDropoffCoords(null);
  setDistanceMiles(null);
  setEstimatedPrice(null);
  setIsSubmitting(false);
  onClose();
};
```

Update the drag handle's `onPress` and `onRequestClose` to use `handleClose`.

---

## Data Flow Summary

```
User taps "Detect My Location"
  → GPS coords captured → reverse geocoded → pickupAddress set + pickupCoords set

User types drop-off address → field loses focus (onEndEditing)
  → geocodeAddress(dropoffAddress) → dropoffCoords set
  → calculateDistanceMiles(pickup, dropoff) → distanceMiles
  → calculateFare(miles) → estimatedPrice
  → Price breakdown card appears

User fills vehicle details
  → isFormValid becomes true
  → Submit button turns blue and is enabled

User taps "Request Service Now"
  → createRequest(...) writes to Firestore requests/ collection
  → handleClose() resets all state + closes modal
  → Alert stub for FindingDriverModal (TOW-16)
```

---

## Integration Points

### `createRequest` (firestore.ts:18)
Already handles all required fields. Note the `vehicleInfo: string` type mismatch (pass `JSON.stringify` for now).

### `calculateFare` (requestCalculations.ts:15)
Already implements `Math.max(65, Math.round(50 + 5 * miles))`. Import and use directly.

### `calculateDistanceMiles` (requestCalculations.ts:4)
Already handles the straight-line distance in miles.

### `geocodeAddress` (new in geoLocationUtils.ts)
New helper wrapping `ExpoLocation.geocodeAsync`.

### Auth context
`useAuth` from `@/context/auth-context` — provides `user.id` for `commuterId`.

---

## State Inventory (full list of state in RequestServiceSheet after TOW-78)

```ts
// Form fields (existing)
const [selectedService, setSelectedService] = useState<ServiceType>('tow');
const [pickupAddress, setPickupAddress] = useState('');
const [dropoffAddress, setDropoffAddress] = useState('');
const [vehicleYear, setVehicleYear] = useState('');
const [vehicleMake, setVehicleMake] = useState('');
const [vehicleModel, setVehicleModel] = useState('');
const [additionalNotes, setAdditionalNotes] = useState('');
const [isDetectingLocation, setIsDetectingLocation] = useState(false);

// New in TOW-78
const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null);
const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
```

---

## Acceptance Criteria Checklist

- [ ] Price section appears dynamically when dropoff + vehicle details are filled
- [ ] Price card shows: Base Fare ($50), Distance Charge (mi × $5), Subtotal, Total Price (blue, min $65)
- [ ] Distance calculated using `calculateDistanceMiles` (straight-line, acceptable for MVP)
- [ ] "Request Service Now" button appears below price breakdown
- [ ] Button is disabled (grey) until form valid, enabled (blue) when valid
- [ ] Tapping button creates Firestore document with all collected data
- [ ] Sheet closes after submission
- [ ] Alert stubs FindingDriverModal navigation (TOW-16)
- [ ] All state resets when sheet closes

---

## TOW-16 Stub Note

`FindingDriverModal` (TOW-16) is not yet implemented. After calling `createRequest`, use:
```ts
Alert.alert('Request Submitted!', 'Looking for a driver near you...');
```
Add a `// TODO TOW-16: Replace with FindingDriverModal navigation` comment so it's easy to find later.

---

## Implementation Order

1. Add `geocodeAddress` to `geoLocationUtils.ts`
2. Add new state variables to `RequestServiceSheet`
3. Update `handleDetectLocation` to save `pickupCoords`
4. Add `handleDropoffEndEditing` and wire to dropoff TextInput
5. Add `isFormValid` computed value
6. Add price breakdown card UI
7. Update submit button (style + enabled state)
8. Write `handleSubmit` function
9. Write `handleClose` reset wrapper
10. Wire everything into JSX

---

*Spec created by: technical-architect agent*
*Date: 2026-03-06*
*For: TOW-78 — Price Breakdown & Request Confirmation*
