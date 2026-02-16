# Technical Specification: TOW-51

## Story Reference

**Story ID**: TOW-51
**Title**: Basic Request Pop-Up UI
**Epic**: EPIC 3: Driver Job Management
**Sprint**: TOW Sprint 2 (2026-02-12 to 2026-02-24)
**Story Points**: 3
**Jira Link**: https://chriskelamyan115.atlassian.net/jira/software/projects/TOW/board?selectedIssue=TOW-51

### User Story
**As a** driver
**I want to** see a request slide up from the bottom of my screen
**So that** I can view the details before deciding to accept

### Acceptance Criteria
- Bottom sheet component created (slides up from bottom, Uber-style)
- Displays commuter info: name, pickup address, service type, car details
- "Accept" and "Decline" buttons present
- Smooth animation when appearing/disappearing
- Pop-ups only show when driver is online

---

## Architecture Overview

This story implements a **bottom sheet request pop-up** that appears when a driver is online and a request comes in. This is a **UI-only implementation** for Phase 2 - the buttons will not perform actual request acceptance logic yet.

### Key Components

1. **Bottom Sheet Library** - `@gorhom/bottom-sheet` for smooth drawer animation
2. **Request Pop-Up Component** - Displays commuter details and action buttons
3. **Mock Data System** - Manual test data for UI development
4. **Integration with Driver Screen** - Shows pop-up only when driver is online

### Design Pattern

Following Uber's pattern:
- Bottom sheet slides up from bottom of screen
- Semi-transparent overlay dims the map behind it
- User can dismiss by swiping down or pressing "Decline"
- Smooth animations using Reanimated 2
- Pop-up appears over the map while driver is online

---

## Technical Requirements

### Frontend Components

#### Files to Create

**New Component: `/components/RequestPopup.tsx`**
- Reusable bottom sheet component for displaying service requests
- Props:
  - `request: Request` - The request data to display
  - `onAccept: (requestId: string) => void` - Callback for accept button
  - `onDecline: (requestId: string) => void` - Callback for decline button
  - `isVisible: boolean` - Controls visibility of bottom sheet
  - `onDismiss: () => void` - Callback when user dismisses sheet
- Displays:
  - Commuter name
  - Pickup address
  - Dropoff address (if available)
  - Service type
  - Vehicle information (make, model, year)
  - Estimated distance (future)
  - Accept and Decline buttons

**New File: `/services/mockData/requests.ts`**
- Mock request data for manual testing
- Export sample requests with realistic data
- Used to trigger pop-up in driver screen for testing

#### Files to Modify

**Primary File: `/app/(driver)/index.tsx`**
- Add bottom sheet trigger mechanism (test button or auto-show on online)
- Import and render `RequestPopup` component
- Pass mock request data
- Handle accept/decline callbacks (console logs for now)
- Only show pop-up when `isOnline === true`

**Types File: `/types/models.ts`**
- Already has `Request` interface defined
- May need to add commuter name field (currently not in Request interface)
- Add optional vehicle details to Request interface for testing

---

### Bottom Sheet Library Setup

#### Installation

```bash
npx expo install @gorhom/bottom-sheet
```

**Dependencies** (already installed):
- `react-native-reanimated` ✅
- `react-native-gesture-handler` ✅

#### Configuration

**File: `app/_layout.tsx`**
- Ensure `GestureHandlerRootView` wraps the app (likely already done)
- Add `BottomSheetModalProvider` at root level

**Import at top of root layout:**
```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
```

**Wrap layout:**
```typescript
<GestureHandlerRootView style={{ flex: 1 }}>
  <BottomSheetModalProvider>
    {/* existing layout */}
  </BottomSheetModalProvider>
</GestureHandlerRootView>
```

---

## Data Models

### Request Interface (Extended for Testing)

```typescript
// types/models.ts

export interface Request {
  id: string;
  commuterId: string;
  commuterName?: string;           // ← ADD THIS for display
  commuterPhone?: string;          // ← ADD THIS for future
  location: Location;
  dropoffLocation: Location;
  pickupAddress: string;
  dropoffAddress: string;
  serviceType: 'tow';
  vehicleInfo?: VehicleInfo;       // ← ADD THIS for display
  status: 'searching' | 'matched' | 'accepted' | 'cancelled';
  matchedDriverId?: string;
  createdAt: Date;
  expiresAt: Date;
}
```

### Mock Data Structure

```typescript
// services/mockData/requests.ts

export const MOCK_REQUESTS: Request[] = [
  {
    id: 'req_001',
    commuterId: 'user_123',
    commuterName: 'Sarah Johnson',
    commuterPhone: '+1 (555) 123-4567',
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
    },
    dropoffLocation: {
      latitude: 34.0622,
      longitude: -118.2537,
    },
    pickupAddress: '123 Main St, Los Angeles, CA 90012',
    dropoffAddress: 'Joe\'s Auto Repair, 456 Elm St, LA, CA 90013',
    serviceType: 'tow',
    vehicleInfo: {
      make: 'Honda',
      model: 'Civic',
      year: 2018,
      licensePlate: 'ABC123',
      towingCapacity: 'N/A', // Not applicable for commuter vehicle
    },
    status: 'searching',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  },
  // Add 2-3 more mock requests for testing variety
];
```

---

## Component Structure

### RequestPopup Component

**File: `/components/RequestPopup.tsx`**

#### Component Hierarchy

```
RequestPopup (BottomSheet wrapper)
  └── ContentContainer (View)
      ├── Handle (visual drag indicator)
      ├── HeaderSection
      │   ├── Title ("New Service Request")
      │   └── Timer (shows time remaining)
      ├── CommuterSection
      │   ├── CommuterName
      │   └── CommuterPhone (optional)
      ├── LocationSection
      │   ├── PickupAddress (with icon)
      │   └── DropoffAddress (with icon)
      ├── VehicleSection
      │   ├── VehicleIcon
      │   ├── VehicleMake/Model
      │   └── Year & License Plate
      ├── ServiceTypeSection
      │   └── ServiceType badge ("Tow Service")
      └── ActionButtons
          ├── DeclineButton (gray, outline)
          └── AcceptButton (green, filled)
```

#### Props Interface

```typescript
interface RequestPopupProps {
  request: Request | null;          // null = not visible
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isVisible: boolean;
  onDismiss: () => void;
}
```

#### Key Features

1. **Snap Points**: `['25%', '50%', '85%']`
   - Starts at 50% (mid-screen)
   - Can be dragged up to 85% for more detail
   - Can be dragged down to dismiss

2. **Backdrop**: Semi-transparent overlay when visible
   - Opacity: 0.5
   - Color: Black
   - Dismisses bottom sheet when tapped

3. **Animations**: Smooth enter/exit transitions
   - Uses Reanimated 2 (built into @gorhom/bottom-sheet)
   - Spring animation for natural feel

4. **Accessibility**:
   - Proper labels for screen readers
   - Keyboard accessible buttons
   - High contrast colors for readability

---

## Implementation Steps

### Step 1: Install Bottom Sheet Library

**Action**: Add `@gorhom/bottom-sheet` package

**Command**:
```bash
npx expo install @gorhom/bottom-sheet
```

**Verification**:
- Check `package.json` for `@gorhom/bottom-sheet` entry
- Run `npx expo start` to ensure no errors

**Learning Goal**: Understanding how to add third-party UI libraries to Expo projects

---

### Step 2: Configure Root Layout for Bottom Sheet

**Files**: `app/_layout.tsx`

**Action**: Wrap app with GestureHandlerRootView and BottomSheetModalProvider

**Code changes**:

1. Add imports at top:
```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
```

2. Wrap the layout export:
```typescript
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        {/* existing layout code */}
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
```

**Why needed**:
- `GestureHandlerRootView` enables gesture detection for swipe interactions
- `BottomSheetModalProvider` manages bottom sheet context and animations

**Learning Goal**: Understanding React Native gesture handling and provider patterns

---

### Step 3: Extend Request Type Interface

**Files**: `types/models.ts`

**Action**: Add optional fields for commuter info and vehicle details

**Code to add**:
```typescript
export interface Request {
  id: string;
  commuterId: string;
  commuterName?: string;           // ADD: Display name in popup
  commuterPhone?: string;          // ADD: Contact info
  location: Location;
  dropoffLocation: Location;
  pickupAddress: string;
  dropoffAddress: string;
  serviceType: 'tow';
  vehicleInfo?: VehicleInfo;       // ADD: Car details for popup
  status: 'searching' | 'matched' | 'accepted' | 'cancelled';
  matchedDriverId?: string;
  createdAt: Date;
  expiresAt: Date;
}
```

**Learning Goal**:
- TypeScript interface extension
- Using optional fields with `?` operator
- Data modeling for UI needs

---

### Step 4: Create Mock Request Data

**Files**: `services/mockData/requests.ts` (NEW FILE)

**Action**: Create sample requests for manual testing

**Full file content**:
```typescript
import { Request } from '@/types/models';

/**
 * Mock request data for testing the RequestPopup UI
 * Used in driver screen to manually trigger pop-ups
 */
export const MOCK_REQUESTS: Request[] = [
  {
    id: 'req_001',
    commuterId: 'user_123',
    commuterName: 'Sarah Johnson',
    commuterPhone: '+1 (555) 123-4567',
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
    },
    dropoffLocation: {
      latitude: 34.0622,
      longitude: -118.2537,
    },
    pickupAddress: '123 Main St, Los Angeles, CA 90012',
    dropoffAddress: 'Joe\'s Auto Repair, 456 Elm St, Los Angeles, CA 90013',
    serviceType: 'tow',
    vehicleInfo: {
      make: 'Honda',
      model: 'Civic',
      year: 2018,
      licensePlate: 'ABC123',
      towingCapacity: 'N/A',
    },
    status: 'searching',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
  },
  {
    id: 'req_002',
    commuterId: 'user_456',
    commuterName: 'Michael Chen',
    commuterPhone: '+1 (555) 987-6543',
    location: {
      latitude: 34.0422,
      longitude: -118.2537,
    },
    dropoffLocation: {
      latitude: 34.0722,
      longitude: -118.2337,
    },
    pickupAddress: '789 Oak Ave, Los Angeles, CA 90015',
    dropoffAddress: 'Downtown Repair Center, 321 Pine St, LA, CA 90014',
    serviceType: 'tow',
    vehicleInfo: {
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      licensePlate: 'XYZ789',
      towingCapacity: 'N/A',
    },
    status: 'searching',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 25 * 60 * 1000), // 25 min from now
  },
  {
    id: 'req_003',
    commuterId: 'user_789',
    commuterName: 'Emily Rodriguez',
    commuterPhone: '+1 (555) 456-7890',
    location: {
      latitude: 34.0622,
      longitude: -118.2337,
    },
    dropoffLocation: {
      latitude: 34.0522,
      longitude: -118.2637,
    },
    pickupAddress: '456 Sunset Blvd, Los Angeles, CA 90028',
    dropoffAddress: 'Westside Auto Shop, 654 Beverly Dr, LA, CA 90210',
    serviceType: 'tow',
    vehicleInfo: {
      make: 'Ford',
      model: 'F-150',
      year: 2019,
      licensePlate: 'LMN456',
      towingCapacity: 'N/A',
    },
    status: 'searching',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 min from now
  },
];

/**
 * Get a random mock request for testing
 */
export function getRandomMockRequest(): Request {
  const randomIndex = Math.floor(Math.random() * MOCK_REQUESTS.length);
  return MOCK_REQUESTS[randomIndex];
}
```

**Learning Goal**:
- Creating realistic test data
- TypeScript type safety with mock data
- Helper functions for testing

---

### Step 5: Create RequestPopup Component

**Files**: `components/RequestPopup.tsx` (NEW FILE)

**Action**: Build the bottom sheet component with request details

**Component template**:

```typescript
import { Request } from '@/types/models';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RequestPopupProps {
  request: Request | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isVisible: boolean;
  onDismiss: () => void;
}

export function RequestPopup({
  request,
  onAccept,
  onDecline,
  isVisible,
  onDismiss,
}: RequestPopupProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Define snap points: 50% of screen initially
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  // Render backdrop (dimmed background)
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Don't render if no request
  if (!request || !isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onDismiss}
      backdropComponent={renderBackdrop}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Service Request</Text>
          <Text style={styles.subtitle}>Review details before accepting</Text>
        </View>

        {/* Commuter Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMMUTER</Text>
          <Text style={styles.commuterName}>
            {request.commuterName || 'Unknown'}
          </Text>
          {request.commuterPhone && (
            <Text style={styles.commuterPhone}>{request.commuterPhone}</Text>
          )}
        </View>

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PICKUP LOCATION</Text>
          <Text style={styles.address}>📍 {request.pickupAddress}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DROPOFF LOCATION</Text>
          <Text style={styles.address}>🏁 {request.dropoffAddress}</Text>
        </View>

        {/* Vehicle Info */}
        {request.vehicleInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VEHICLE</Text>
            <Text style={styles.vehicleInfo}>
              🚗 {request.vehicleInfo.year} {request.vehicleInfo.make}{' '}
              {request.vehicleInfo.model}
            </Text>
            <Text style={styles.licensePlate}>
              License: {request.vehicleInfo.licensePlate}
            </Text>
          </View>
        )}

        {/* Service Type Badge */}
        <View style={styles.serviceTypeBadge}>
          <Text style={styles.serviceTypeText}>TOW SERVICE</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={() => onDecline(request.id)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => onAccept(request.id)}
          >
            <Text style={styles.acceptButtonText}>Accept Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  commuterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  commuterPhone: {
    fontSize: 14,
    color: '#007AFF',
  },
  address: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  vehicleInfo: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  licensePlate: {
    fontSize: 14,
    color: '#666',
  },
  serviceTypeBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  serviceTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  declineButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**Learning Goal**:
- Building complex UI components
- Using refs with bottom sheets
- Callback patterns for parent communication
- Conditional rendering based on props
- Styling for professional appearance

---

### Step 6: Integrate RequestPopup into Driver Screen

**Files**: `app/(driver)/index.tsx`

**Action**: Add bottom sheet trigger and state management

**Code changes**:

1. **Import RequestPopup and mock data:**
```typescript
import { RequestPopup } from '@/components/RequestPopup';
import { getRandomMockRequest } from '@/services/mockData/requests';
import { Request } from '@/types/models';
```

2. **Add state for popup:**
```typescript
const [showPopup, setShowPopup] = useState(false);
const [currentRequest, setCurrentRequest] = useState<Request | null>(null);
```

3. **Add test button to trigger popup (temporary):**
```typescript
{/* Test Button - Trigger Request Popup */}
{isOnline && (
  <TouchableOpacity
    style={styles.testButton}
    onPress={() => {
      setCurrentRequest(getRandomMockRequest());
      setShowPopup(true);
    }}
  >
    <Text style={styles.testButtonText}>Test Request</Text>
  </TouchableOpacity>
)}
```

4. **Add RequestPopup component at end of render:**
```typescript
{/* Request Popup - Only shows when driver is online */}
<RequestPopup
  request={currentRequest}
  isVisible={showPopup && isOnline}
  onAccept={(requestId) => {
    console.log('✅ ACCEPT REQUEST:', requestId);
    Alert.alert('Request Accepted', `You accepted request ${requestId}`);
    setShowPopup(false);
    setCurrentRequest(null);
  }}
  onDecline={(requestId) => {
    console.log('❌ DECLINE REQUEST:', requestId);
    Alert.alert('Request Declined', `You declined request ${requestId}`);
    setShowPopup(false);
    setCurrentRequest(null);
  }}
  onDismiss={() => {
    console.log('🔽 DISMISS POPUP');
    setShowPopup(false);
    setCurrentRequest(null);
  }}
/>
```

5. **Add styles for test button:**
```typescript
// Add to styles object
testButton: {
  position: 'absolute',
  top: 145,
  right: 20,
  backgroundColor: '#5856D6',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
},
testButtonText: {
  color: 'white',
  fontSize: 12,
  fontWeight: 'bold',
},
```

**Important**: Position test button so it doesn't overlap with sign-out button or info banner

**Learning Goal**:
- State management for modals/overlays
- Callback handlers with console logging
- Conditional rendering (popup only when online)
- UI debugging with test buttons

---

### Step 7: Test Bottom Sheet Behavior

**Action**: Manual testing of bottom sheet interactions

**Test Checklist**:

1. **Initial State**
   - [ ] Bottom sheet is hidden when driver is offline
   - [ ] Test button appears when driver goes online
   - [ ] Test button is hidden when driver is offline

2. **Opening Bottom Sheet**
   - [ ] Tap "Test Request" button
   - [ ] Bottom sheet smoothly slides up from bottom
   - [ ] Background dims with semi-transparent overlay
   - [ ] Request details are visible and readable

3. **Interacting with Bottom Sheet**
   - [ ] Can drag sheet up to see more content
   - [ ] Can drag sheet down
   - [ ] Dragging down fully dismisses the sheet
   - [ ] Tapping backdrop dismisses the sheet
   - [ ] All text is readable and properly formatted

4. **Button Actions**
   - [ ] Tap "Accept Request" - shows success alert
   - [ ] Tap "Decline" - shows decline alert
   - [ ] Bottom sheet closes after button press
   - [ ] Check console for log messages

5. **Online/Offline State**
   - [ ] Toggle driver offline while popup is open
   - [ ] Verify popup dismisses when going offline
   - [ ] Verify popup cannot be opened when offline

6. **Multiple Requests**
   - [ ] Tap test button multiple times
   - [ ] Verify different request data appears
   - [ ] Verify each request has unique ID

**Testing Commands**:
```bash
# Start development server
npx expo start

# Run on device
npm run ios
npm run android
```

**Learning Goal**:
- Systematic testing approach
- Identifying edge cases
- User interaction patterns
- Debugging with console logs

---

### Step 8: Style Refinement and Polish

**Action**: Fine-tune UI details to match design standards

**Areas to review**:

1. **Typography**
   - Font sizes are readable on all devices
   - Font weights create proper hierarchy
   - Line heights prevent cramped text

2. **Spacing**
   - Consistent padding/margins
   - Proper section separation
   - Buttons have sufficient touch targets (min 44x44)

3. **Colors**
   - Accept button: Green (#34C759)
   - Decline button: Red border (#FF3B30)
   - Labels: Gray (#8E8E93)
   - Text: Black (#000)
   - Backdrop: Black with 0.5 opacity

4. **Animations**
   - Bottom sheet slides smoothly
   - No janky animations
   - Backdrop fades in/out smoothly

5. **Accessibility**
   - Buttons have accessible labels
   - Color contrast meets WCAG standards
   - Touch targets are large enough

**Style adjustments if needed**:
```typescript
// Ensure minimum touch targets
button: {
  minHeight: 48, // Accessibility guideline
  // ... other styles
}

// Improve text contrast
commuterName: {
  color: '#000', // Pure black for better contrast
  // ... other styles
}
```

**Learning Goal**:
- Design attention to detail
- Accessibility considerations
- Professional UI polish
- Performance of animations

---

### Step 9: Clean Up and Code Review

**Action**: Review code for quality and best practices

**Review Checklist**:

1. **TypeScript**
   - [ ] All components properly typed
   - [ ] No `any` types used
   - [ ] Props interfaces exported if reusable
   - [ ] Optional fields use `?` operator correctly

2. **React Patterns**
   - [ ] useCallback for stable function references
   - [ ] useMemo for expensive computations
   - [ ] useRef for bottom sheet reference
   - [ ] Proper cleanup in useEffect if needed

3. **Code Organization**
   - [ ] RequestPopup is in `/components`
   - [ ] Mock data is in `/services/mockData`
   - [ ] Types are in `/types/models.ts`
   - [ ] Styles use StyleSheet.create

4. **Comments**
   - [ ] Complex logic has explanatory comments
   - [ ] Props interfaces have JSDoc descriptions
   - [ ] Mock data has usage instructions

5. **Error Handling**
   - [ ] No crashes if request is null
   - [ ] No crashes if optional fields missing
   - [ ] Graceful handling of missing data

6. **Remove Debug Code**
   - [ ] Console logs are meaningful (keep for Phase 2)
   - [ ] Test button clearly labeled as "TEST"
   - [ ] No commented-out code

**Learning Goal**:
- Code quality standards
- TypeScript best practices
- Professional code organization
- Documentation habits

---

### Step 10: Document Testing and Edge Cases

**Action**: Create testing documentation for this feature

**Edge Cases to Consider**:

1. **Driver Goes Offline During Request**
   - **Scenario**: Driver has popup open, toggles offline
   - **Expected**: Popup should dismiss automatically
   - **Implementation**: Add check in RequestPopup to watch `isVisible && isOnline`

2. **Multiple Requests Back-to-Back**
   - **Scenario**: Driver accepts/declines, immediately gets another request
   - **Expected**: First popup closes, second one opens smoothly
   - **Implementation**: Reset state properly on accept/decline

3. **App Backgrounded While Popup Open**
   - **Scenario**: Driver has popup open, switches apps
   - **Expected**: Popup should still be visible when returning (Phase 2 behavior)
   - **Future**: In Phase 3, request might timeout

4. **Missing Optional Data**
   - **Scenario**: Request has no commuterName or vehicleInfo
   - **Expected**: Show placeholder text, no crashes
   - **Implementation**: Use `|| 'Unknown'` fallbacks

5. **Very Long Addresses**
   - **Scenario**: Address text is extremely long
   - **Expected**: Text wraps properly, doesn't overflow
   - **Implementation**: Use `numberOfLines` or flexible layout

6. **Rapid Button Tapping**
   - **Scenario**: User taps Accept button repeatedly
   - **Expected**: Only one accept action fires
   - **Implementation**: Add loading state (future enhancement)

**Testing Script**:

```markdown
## Manual Test Plan: TOW-51 Request Popup UI

### Pre-conditions
- Driver screen loads with map
- Driver can toggle online/offline

### Test 1: Popup Appears When Online
1. Go online
2. Tap "Test Request" button
3. **Expected**: Bottom sheet slides up from bottom
4. **Expected**: Map dims with overlay
5. **Expected**: Request details are visible

### Test 2: Popup Content Display
1. Trigger popup
2. Verify commuter name displays
3. Verify pickup address displays
4. Verify dropoff address displays
5. Verify vehicle info displays
6. Verify buttons are present

### Test 3: Accept Action
1. Trigger popup
2. Tap "Accept Request" button
3. **Expected**: Alert shows "Request Accepted"
4. **Expected**: Console logs "✅ ACCEPT REQUEST: [id]"
5. **Expected**: Popup closes

### Test 4: Decline Action
1. Trigger popup
2. Tap "Decline" button
3. **Expected**: Alert shows "Request Declined"
4. **Expected**: Console logs "❌ DECLINE REQUEST: [id]"
5. **Expected**: Popup closes

### Test 5: Dismiss by Backdrop
1. Trigger popup
2. Tap on dimmed map area
3. **Expected**: Popup closes
4. **Expected**: Console logs "🔽 DISMISS POPUP"

### Test 6: Dismiss by Dragging
1. Trigger popup
2. Drag bottom sheet down
3. **Expected**: Popup smoothly closes
4. **Expected**: No crashes

### Test 7: Online/Offline Integration
1. Trigger popup (while online)
2. Popup is open
3. Toggle driver offline
4. **Expected**: Popup should close
5. Toggle online
6. **Expected**: Test button reappears

### Test 8: Multiple Requests
1. Trigger popup 3 times in a row
2. **Expected**: Different request data each time
3. **Expected**: No memory leaks
4. **Expected**: Smooth animations each time
```

**Learning Goal**:
- Comprehensive testing methodology
- Edge case identification
- Professional QA practices
- Documentation skills

---

## State Management

### Component State

**Driver Screen (`app/(driver)/index.tsx`)**:
```typescript
// Existing state
const [isOnline, setIsOnline] = useState(false);
const [driverLocation, setDriverLocation] = useState<Location | null>(null);

// New state for popup
const [showPopup, setShowPopup] = useState(false);
const [currentRequest, setCurrentRequest] = useState<Request | null>(null);
```

### State Flow

```
User taps "Test Request" button
  ↓
Get random mock request from MOCK_REQUESTS
  ↓
Set currentRequest state
  ↓
Set showPopup to true
  ↓
RequestPopup renders with request data
  ↓
User interacts (Accept/Decline/Dismiss)
  ↓
Callback fires (onAccept/onDecline/onDismiss)
  ↓
Parent handles action (console log + alert)
  ↓
Set showPopup to false
  ↓
Set currentRequest to null
  ↓
RequestPopup unmounts
```

### Future State (Phase 3)

In future stories, the state flow will be:
```
Driver is online
  ↓
Firestore listener detects new request
  ↓
Real-time callback fires
  ↓
Set currentRequest from Firestore data
  ↓
Set showPopup to true
  ↓
RequestPopup shows (same UI)
  ↓
Driver accepts
  ↓
Call Firestore transaction
  ↓
Update request status
  ↓
Create trip document
  ↓
Navigate to trip screen
```

---

## Testing Strategy

### Manual Testing (Phase 2)

**Focus Areas**:
1. **UI/UX Testing**
   - Visual appearance matches requirements
   - Animations are smooth
   - Text is readable
   - Buttons are responsive

2. **Integration Testing**
   - Popup only shows when online
   - Test button triggers popup correctly
   - Mock data displays properly

3. **Interaction Testing**
   - Accept button works
   - Decline button works
   - Backdrop dismiss works
   - Drag to dismiss works

### Automated Testing (Phase 4 - Future)

```typescript
// Example unit test for RequestPopup
describe('RequestPopup', () => {
  it('renders request details correctly', () => {
    const mockRequest = MOCK_REQUESTS[0];
    const { getByText } = render(
      <RequestPopup
        request={mockRequest}
        isVisible={true}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('Sarah Johnson')).toBeTruthy();
    expect(getByText(/123 Main St/)).toBeTruthy();
  });

  it('calls onAccept when accept button pressed', () => {
    const mockOnAccept = jest.fn();
    const { getByText } = render(
      <RequestPopup
        request={MOCK_REQUESTS[0]}
        isVisible={true}
        onAccept={mockOnAccept}
        onDecline={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    fireEvent.press(getByText('Accept Request'));
    expect(mockOnAccept).toHaveBeenCalledWith('req_001');
  });
});
```

---

## Dependencies

### New Package to Install

- `@gorhom/bottom-sheet` (latest version compatible with Expo 54)

### Already Installed (Required by Bottom Sheet)

- ✅ `react-native-reanimated` (v4.1.1)
- ✅ `react-native-gesture-handler` (v2.28.0)

### Firebase Integration (Future - Phase 3)

This story does NOT integrate with Firestore yet. Future stories will:
- Listen for real requests from `requests/` collection
- Update request status on accept/decline
- Create trip documents
- Handle real-time notifications

### Prerequisite Stories

- ✅ **TOW-50**: Driver Home Screen - Provides online/offline state
- ✅ **Firebase setup**: Firestore initialized
- ✅ **Type definitions**: Request interface exists

### Blocking Dependencies (This Story Blocks)

- **TOW-52**: Request Assignment & Claiming Logic - Needs this UI
- **TOW-53**: Real-Time Request Listening - Will trigger this popup
- **TOW-54**: Accept/Decline Request Actions - Will implement these button functions

---

## Edge Cases and Error Handling

### 1. Popup Open When Going Offline

**Problem**: User has popup open, toggles offline
**Solution**:
```typescript
// In RequestPopup
useEffect(() => {
  if (!isVisible) {
    // Close bottom sheet
    bottomSheetRef.current?.close();
  }
}, [isVisible]);
```

### 2. Missing Optional Fields

**Problem**: Request has no commuterName or vehicleInfo
**Solution**: Use fallbacks in UI
```typescript
<Text>{request.commuterName || 'Unknown User'}</Text>

{request.vehicleInfo ? (
  <Text>{request.vehicleInfo.make}</Text>
) : (
  <Text>Vehicle info unavailable</Text>
)}
```

### 3. Bottom Sheet Doesn't Open

**Problem**: Bottom sheet fails to render
**Debugging**:
- Check if GestureHandlerRootView wraps app
- Check if BottomSheetModalProvider is present
- Check console for errors
- Verify react-native-reanimated is configured

**Solution**: Review Step 2 configuration

### 4. Long Addresses Overflow

**Problem**: Address text too long, breaks layout
**Solution**: Add flexible layout
```typescript
address: {
  fontSize: 15,
  color: '#000',
  lineHeight: 20,
  flexWrap: 'wrap', // Allow wrapping
},
```

### 5. Rapid Test Button Tapping

**Problem**: User taps test button multiple times quickly
**Solution**: Add debouncing (optional enhancement)
```typescript
const [isLoadingRequest, setIsLoadingRequest] = useState(false);

function handleTestRequest() {
  if (isLoadingRequest) return;

  setIsLoadingRequest(true);
  setCurrentRequest(getRandomMockRequest());
  setShowPopup(true);

  setTimeout(() => setIsLoadingRequest(false), 500);
}
```

### 6. Memory Leaks

**Problem**: Bottom sheet doesn't clean up properly
**Solution**: Ensure proper unmounting
```typescript
useEffect(() => {
  return () => {
    // Cleanup if needed
    bottomSheetRef.current?.close();
  };
}, []);
```

---

## UI Design Specifications

### Colors

```typescript
const COLORS = {
  // Brand Colors
  primary: '#007AFF',      // iOS Blue
  success: '#34C759',      // Green (Accept)
  danger: '#FF3B30',       // Red (Decline)

  // Text Colors
  textPrimary: '#000',     // Black
  textSecondary: '#666',   // Gray
  textLabel: '#8E8E93',    // Light Gray

  // Background Colors
  background: '#FFFFFF',   // White
  backdrop: 'rgba(0,0,0,0.5)', // Semi-transparent black

  // Border Colors
  border: '#E5E5EA',       // Light gray border
};
```

### Typography

```typescript
const TYPOGRAPHY = {
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    fontWeight: 'normal',
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  button: {
    fontSize: 16,
    fontWeight: 'bold',
  },
};
```

### Spacing

```typescript
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
```

### Button Specifications

**Accept Button**:
- Background: #34C759 (Green)
- Text: White, bold, 16px
- Padding: 16px vertical
- Border radius: 12px
- Min height: 48px (accessibility)

**Decline Button**:
- Background: White
- Border: 2px solid #FF3B30 (Red)
- Text: Red, bold, 16px
- Padding: 16px vertical
- Border radius: 12px
- Min height: 48px

---

## Future Enhancements (Not in This Story)

### Phase 3: Real Request Integration

- Replace mock data with Firestore listener
- Add real-time request notifications
- Implement actual accept/decline logic
- Add request timeout countdown timer
- Show distance/ETA to pickup location

### Phase 3: Advanced UI Features

- Distance calculation and display
- Estimated earnings display
- Map preview showing pickup location
- Commuter rating display
- Request history (previously declined)

### Phase 4: Polish Features

- Sound/vibration on new request
- Custom haptic feedback on buttons
- Animated countdown timer
- Request priority indicators
- Multi-request queue (if multiple requests)

---

## Definition of Done

This story is complete when:

- [ ] `@gorhom/bottom-sheet` is installed
- [ ] Root layout configured with gesture handlers
- [ ] Request interface extended with display fields
- [ ] Mock request data file created with 3+ examples
- [ ] RequestPopup component created and styled
- [ ] RequestPopup integrated into driver screen
- [ ] Test button triggers popup (only when online)
- [ ] Popup displays all request details correctly
- [ ] Accept button shows alert and closes popup
- [ ] Decline button shows alert and closes popup
- [ ] Backdrop tap dismisses popup
- [ ] Drag down dismisses popup
- [ ] Popup only appears when driver is online
- [ ] All animations are smooth
- [ ] Code follows project patterns
- [ ] TypeScript has no errors
- [ ] Manual testing passes all test cases
- [ ] Code is committed with meaningful message
- [ ] Ready for quality-reviewer agent

---

## Learning Objectives for Student

This story teaches:

1. **Third-Party UI Libraries**
   - Installing and configuring bottom sheet
   - Understanding library documentation
   - Working with refs and callbacks

2. **Advanced React Patterns**
   - useCallback for stable function references
   - useMemo for performance
   - useRef for imperative control
   - Controlled vs uncontrolled components

3. **Component Communication**
   - Parent-child callback patterns
   - Prop drilling
   - State lifting
   - Event handlers

4. **UI/UX Design**
   - Bottom sheet interaction patterns
   - Backdrop overlays
   - Gesture handling
   - Smooth animations

5. **Mock Data for Testing**
   - Creating realistic test data
   - Separating test data from production code
   - Helper functions for random data

6. **Professional Development**
   - Systematic testing approach
   - Edge case handling
   - Code organization
   - Documentation practices

---

## References

- **Jira Story**: https://chriskelamyan115.atlassian.net/jira/software/projects/TOW/board?selectedIssue=TOW-51
- **Design Mockup**: `.claude/design/screens/driver-request-popup.png`
- **Architecture Doc**: `.claude/docs/ARCHITECTURE.md`
- **Patterns Doc**: `.claude/docs/PATTERNS.md`
- **Driver Screen**: `app/(driver)/index.tsx`
- **Request Type**: `types/models.ts` - `Request` interface
- **Bottom Sheet Docs**: https://gorhom.github.io/react-native-bottom-sheet/
- **Gesture Handler Docs**: https://docs.swmansion.com/react-native-gesture-handler/

---

*This specification is ready for the `code-coach` agent to create a lesson plan and guide the student through implementation.*
