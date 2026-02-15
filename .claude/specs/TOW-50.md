# Technical Specification: TOW-50

## Story Reference

**Story ID**: TOW-50
**Title**: Driver Home Screen Online/Offline Toggle
**Epic**: Phase 2 - Driver Experience
**Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-50

### User Story
**As a** driver
**I want to** toggle myself online/offline and see my location on a map
**So that** I can control when I'm available for requests

### Acceptance Criteria
- Driver home screen displays map with driver's current location
- Online/Offline toggle updates driver status in Firestore (`drivers/{id}.isAvailable`)
- Toggle persists across app restarts
- Map updates location in real-time when online
- UI matches design mockups (offline and online states)

---

## Architecture Overview

This story creates the foundation for the driver experience by implementing:

1. **Driver Home Screen** - A map-based UI similar to the commuter screen
2. **Online/Offline Toggle** - A switch component that controls driver availability
3. **Firestore Integration** - Update and persist driver availability status
4. **Location Tracking** - Display driver's current GPS location on map
5. **State Persistence** - Remember online/offline state across app restarts

The screen will be built at `app/(driver)/index.tsx` (which already exists with basic structure) and will follow the same patterns established in the commuter screen at `app/(commuter)/index.tsx`.

---

## Design Reference

### Visual Design (from Figma mockups)

**Offline State** (`.claude/design/screens/driver-home-offline.png`):
- Map fills entire screen
- White rounded card at top with "Offline" status (gray dot indicator)
- Toggle switch (off state - gray)
- Bottom button: "Go Online" (blue, prominent)
- Text: "Go online to start receiving requests"
- Location button (white circle with pin icon) in bottom right

**Online State** (`.claude/design/screens/driver-home-online.png`):
- Map fills entire screen
- White rounded card at top with "Online" status (green dot indicator)
- Toggle switch (on state - blue)
- Light blue info banner: "You're now online and broadcasting location" with subtitle "Ready to receive service requests"
- Bottom text: "Waiting for requests..."
- Location button in bottom right (same as offline)
- Blue location marker on map showing driver position

### Key UI Components
1. **Status Card** (top) - Shows online/offline status with toggle
2. **Info Banner** (below status card, only when online) - Confirms broadcasting
3. **Map View** - Full screen background
4. **Location Button** - Centers map on driver location
5. **Action Button** (bottom, only when offline) - "Go Online" CTA

---

## Technical Requirements

### Frontend Components

#### Files to Create/Modify

**Primary File: `/app/(driver)/index.tsx`**
- Already exists with basic map implementation
- Needs to be enhanced with:
  - Online/Offline toggle functionality
  - Status card UI component
  - Info banner component (conditional rendering)
  - Bottom action button (conditional rendering)
  - Firestore integration for driver status
  - State persistence with AsyncStorage

**New Component (Optional): `/components/ToggleSwitch.tsx`**
- Custom toggle switch component matching design
- Props: `value: boolean`, `onValueChange: (value: boolean) => void`
- Styled to match Figma design (gray when off, blue when on)
- Could use React Native's built-in `Switch` component initially

**New Component (Optional): `/components/StatusCard.tsx`**
- Reusable card for showing online/offline status
- Props: `isOnline: boolean`, `onToggle: (value: boolean) => void`
- Displays status indicator dot (green/gray)
- Contains toggle switch

**Services to Extend: `/services/firebase/firestore.ts`**
- Add new function: `updateDriverAvailability(driverId: string, isAvailable: boolean): Promise<void>`
- Add new function: `getDriverStatus(driverId: string): Promise<boolean>`
- Add new function: `listenToDriverStatus(driverId: string, callback: (isAvailable: boolean) => void): () => void`

### Backend (Firebase)

#### Firestore Structure

**Collection: `drivers/{driverId}`**
```typescript
interface Driver {
  id: string;
  userId: string;              // Reference to auth user
  isAvailable: boolean;         // ← KEY FIELD FOR THIS STORY
  isVerified: boolean;
  vehicleInfo: VehicleInfo;
  currentLocation: Location;    // ← Updated when online
  serviceRadius: number;
  totalTrips: number;
  rating?: number;
}
```

**New Collection: `driverLocations/{driverId}` (for real-time tracking)**
```typescript
interface DriverLocation {
  driverId: string;
  location: Location;           // { latitude, longitude }
  heading?: number;             // Compass bearing (optional for Phase 2)
  speed?: number;               // m/s (optional for Phase 2)
  accuracy: number;             // meters
  timestamp: Timestamp;
  isAvailable: boolean;         // Denormalized for quick queries
}
```

**Why separate `driverLocations` collection?**
- Frequently updated (every 5-10 seconds when online)
- Keeps `drivers` collection clean (updated less frequently)
- Easier to query for nearby drivers later (Phase 3)
- Can be cleared/archived regularly to save storage

#### Firestore Operations

**On Toggle Online:**
1. Update `drivers/{driverId}.isAvailable = true`
2. Update `drivers/{driverId}.currentLocation` with GPS coordinates
3. Create/Update `driverLocations/{driverId}` document
4. Save state to AsyncStorage for persistence

**On Toggle Offline:**
1. Update `drivers/{driverId}.isAvailable = false`
2. Delete `driverLocations/{driverId}` document (optional, can keep last known location)
3. Save state to AsyncStorage

**Real-Time Location Updates (when online):**
- Use `expo-location` background task (Phase 3)
- For now: Update location every 10 seconds when screen is active
- Write to `driverLocations/{driverId}`

#### Security Rules (Development Phase)

Current rules are permissive (allow all reads/writes). This is acceptable for Phase 2.

**Future Production Rules** (Phase 4):
```javascript
// Only driver can update their own availability
match /drivers/{driverId} {
  allow read: if request.auth != null;
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['isAvailable', 'currentLocation']);
}

// Only driver can update their own location
match /driverLocations/{driverId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.resource.data.driverId == request.auth.uid;
}
```

---

## State Management

### Local State (useState)

```typescript
// Location state
const [driverLocation, setDriverLocation] = useState<Location | null>(null);

// Online/offline state
const [isOnline, setIsOnline] = useState<boolean>(false);

// Loading state for toggle action
const [isToggling, setIsToggling] = useState<boolean>(false);

// Map reference
const [mapRef, setMapRef] = useState<MapView | null>(null);

// Permission status
const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
```

### Persistent State (AsyncStorage)

Store driver's last online/offline preference:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save state
await AsyncStorage.setItem('driver_is_online', JSON.stringify(isOnline));

// Load state on mount
const savedState = await AsyncStorage.getItem('driver_is_online');
if (savedState !== null) {
  setIsOnline(JSON.parse(savedState));
}
```

### Effects and Lifecycle

**On Component Mount:**
1. Check location permissions
2. Get current GPS location
3. Load saved online/offline state from AsyncStorage
4. Sync with Firestore driver document
5. If state says "online", verify driver document also says online (in case of crash/force quit)

**On Toggle Online:**
1. Request location permissions (if not granted)
2. Get current GPS location
3. Update Firestore `drivers/{id}.isAvailable = true`
4. Update Firestore `drivers/{id}.currentLocation`
5. Create/update `driverLocations/{id}` document
6. Save to AsyncStorage
7. Start location tracking (for Phase 3, just update once for now)

**On Toggle Offline:**
1. Update Firestore `drivers/{id}.isAvailable = false`
2. Save to AsyncStorage
3. Stop location tracking

**On Component Unmount:**
- No automatic offline (preserve state)
- User must manually toggle offline
- Future: Add background location tracking with task manager (Phase 3)

---

## Implementation Steps

### Step 1: Add AsyncStorage Dependency
**Files**: `package.json`
**Action**: Install AsyncStorage for state persistence
**Code**:
```bash
npx expo install @react-native-async-storage/async-storage
```

**Learning Goal**: Understand how to persist app state between sessions

---

### Step 2: Add Firestore Service Functions
**Files**: `services/firebase/firestore.ts`
**Action**: Create functions for driver availability management

**Code to add**:
```typescript
// Update driver availability status
export async function updateDriverAvailability(
  driverId: string,
  isAvailable: boolean,
  currentLocation?: Location
): Promise<void> {
  const driverRef = doc(db, 'drivers', driverId);

  const updates: any = {
    isAvailable,
    updatedAt: Timestamp.now(),
  };

  // Include location if going online
  if (isAvailable && currentLocation) {
    updates.currentLocation = currentLocation;
  }

  await updateDoc(driverRef, updates);

  // Update driverLocations collection for real-time tracking
  if (isAvailable && currentLocation) {
    await updateDriverLocation(driverId, currentLocation);
  }
}

// Update driver's real-time location
export async function updateDriverLocation(
  driverId: string,
  location: Location
): Promise<void> {
  const locationRef = doc(db, 'driverLocations', driverId);

  await updateDoc(locationRef, {
    driverId,
    location,
    accuracy: 10, // meters (would come from GPS in real implementation)
    timestamp: Timestamp.now(),
    isAvailable: true,
  }).catch(async (error) => {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      await addDoc(collection(db, 'driverLocations'), {
        driverId,
        location,
        accuracy: 10,
        timestamp: Timestamp.now(),
        isAvailable: true,
      });
    } else {
      throw error;
    }
  });
}

// Get driver's current status
export async function getDriverStatus(driverId: string): Promise<boolean> {
  const driverRef = doc(db, 'drivers', driverId);
  const driverSnap = await getDoc(driverRef);

  if (!driverSnap.exists()) {
    return false;
  }

  return driverSnap.data().isAvailable ?? false;
}
```

**Learning Goal**:
- Understand Firestore update operations
- Learn about error handling (creating document if not found)
- Practice TypeScript async/await patterns

---

### Step 3: Create StatusCard Component (Optional - can inline first)
**Files**: `components/StatusCard.tsx` (or inline in driver screen)
**Action**: Build reusable status display with toggle

**Code hint**:
```typescript
interface StatusCardProps {
  isOnline: boolean;
  onToggle: (value: boolean) => void;
  isLoading?: boolean;
}

export function StatusCard({ isOnline, onToggle, isLoading }: StatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      <Switch
        value={isOnline}
        onValueChange={onToggle}
        disabled={isLoading}
        trackColor={{ false: '#767577', true: '#007AFF' }}
        thumbColor={isOnline ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}
```

**Learning Goal**:
- Component composition in React Native
- Props and TypeScript interfaces
- Controlled components (Switch)

---

### Step 4: Enhance Driver Screen with Toggle Logic
**Files**: `app/(driver)/index.tsx`
**Action**: Add online/offline toggle functionality with Firestore integration

**Key changes**:

1. **Import new dependencies:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Switch } from 'react-native';
import { updateDriverAvailability, getDriverStatus } from '@/services/firebase/firestore';
```

2. **Add state variables:**
```typescript
const [isOnline, setIsOnline] = useState<boolean>(false);
const [isToggling, setIsToggling] = useState<boolean>(false);
```

3. **Load persisted state on mount:**
```typescript
useEffect(() => {
  loadSavedState();
}, []);

async function loadSavedState() {
  try {
    const saved = await AsyncStorage.getItem('driver_is_online');
    if (saved !== null) {
      const wasOnline = JSON.parse(saved);
      setIsOnline(wasOnline);

      // Sync with Firestore
      if (user?.uid && driverLocation) {
        await updateDriverAvailability(user.uid, wasOnline, driverLocation);
      }
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}
```

4. **Create toggle handler:**
```typescript
async function handleToggleOnline(value: boolean) {
  if (!user?.uid) {
    Alert.alert('Error', 'You must be signed in');
    return;
  }

  // If going online, need location permission
  if (value && !driverLocation) {
    Alert.alert('Location Required', 'Please enable location to go online');
    await getUserLocation();
    return;
  }

  setIsToggling(true);

  try {
    // Update Firestore
    await updateDriverAvailability(
      user.uid,
      value,
      value ? driverLocation! : undefined
    );

    // Update local state
    setIsOnline(value);

    // Persist to storage
    await AsyncStorage.setItem('driver_is_online', JSON.stringify(value));

    // Show confirmation
    Alert.alert(
      value ? 'You\'re Online!' : 'You\'re Offline',
      value
        ? 'You can now receive service requests'
        : 'You will not receive requests until you go online'
    );

  } catch (error) {
    console.error('Error toggling status:', error);
    Alert.alert('Error', 'Failed to update status. Please try again.');
  } finally {
    setIsToggling(false);
  }
}
```

**Learning Goal**:
- State management (local + persistent + remote)
- Async error handling with try/catch/finally
- Conditional logic for permissions
- User feedback with alerts

---

### Step 5: Update UI Layout
**Files**: `app/(driver)/index.tsx`
**Action**: Add status card, info banner, and action button to match design

**UI Structure**:
```typescript
return (
  <View style={styles.container}>
    {/* Map (full screen background) */}
    <MapView
      ref={(ref) => setMapRef(ref)}
      style={styles.map}
      region={driverLocation ? {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      } : undefined}
      showsUserLocation={true}
    >
      {driverLocation && (
        <Marker
          coordinate={driverLocation}
          pinColor={isOnline ? "blue" : "gray"}
        />
      )}
    </MapView>

    {/* Status Card (top) */}
    <View style={styles.statusCard}>
      <View style={styles.statusRow}>
        <View style={[
          styles.statusDot,
          isOnline && styles.statusDotOnline
        ]} />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      <Switch
        value={isOnline}
        onValueChange={handleToggleOnline}
        disabled={isToggling}
        trackColor={{ false: '#D1D1D6', true: '#007AFF' }}
        thumbColor="#fff"
      />
    </View>

    {/* Info Banner (only when online) */}
    {isOnline && (
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerTitle}>
          You're now online and broadcasting location
        </Text>
        <Text style={styles.infoBannerSubtitle}>
          Ready to receive service requests
        </Text>
      </View>
    )}

    {/* Location Button (bottom right) */}
    {driverLocation && (
      <TouchableOpacity
        style={styles.locationButton}
        onPress={centerOnDriver}
      >
        <Text>📍</Text>
      </TouchableOpacity>
    )}

    {/* Bottom Action/Status */}
    {!isOnline ? (
      // Offline: Show "Go Online" button
      <View style={styles.bottomContainer}>
        <Text style={styles.bottomText}>
          Go online to start receiving requests
        </Text>
        <TouchableOpacity
          style={styles.goOnlineButton}
          onPress={() => handleToggleOnline(true)}
          disabled={isToggling}
        >
          <Text style={styles.goOnlineButtonText}>
            {isToggling ? 'Connecting...' : 'Go Online'}
          </Text>
        </TouchableOpacity>
      </View>
    ) : (
      // Online: Show waiting message
      <View style={styles.bottomContainer}>
        <Text style={styles.waitingText}>
          Waiting for requests...
        </Text>
      </View>
    )}
  </View>
);
```

**Learning Goal**:
- Conditional rendering in React Native
- Layout composition with absolute positioning
- Matching designs from mockups

---

### Step 6: Style the Components
**Files**: `app/(driver)/index.tsx`
**Action**: Add StyleSheet to match Figma design

**Styling hints**:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Status Card (top)
  statusCard: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8E8E93', // Gray when offline
  },
  statusDotOnline: {
    backgroundColor: '#34C759', // Green when online
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // Info Banner (online only)
  infoBanner: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    backgroundColor: '#D1ECFF', // Light blue
    borderRadius: 12,
    padding: 12,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  infoBannerSubtitle: {
    fontSize: 12,
    color: '#666',
  },

  // Location Button
  locationButton: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Go Online Button
  goOnlineButton: {
    backgroundColor: '#007AFF', // iOS blue
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  goOnlineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**Learning Goal**:
- React Native StyleSheet patterns
- Absolute positioning for overlays
- Shadow/elevation for depth
- Color selection for accessibility

---

### Step 7: Test Location Permissions Flow
**Files**: `app/(driver)/index.tsx`
**Action**: Ensure smooth handling of location permissions

**Test cases**:
1. User denies location permission → Show alert, disable "Go Online" button
2. User grants permission → Fetch location, enable toggle
3. User tries to go online without location → Prompt for permission first

**Code enhancement**:
```typescript
async function getUserLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'TowLink needs location access to show your position to customers. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setDriverLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

  } catch (error) {
    console.error('Location error:', error);
    Alert.alert('Error', 'Failed to get location. Please try again.');
  }
}
```

**Learning Goal**:
- Mobile permissions flow
- User experience for denied permissions
- Deep linking to app settings

---

### Step 8: Add Driver Document Check
**Files**: `app/(driver)/index.tsx`
**Action**: Verify driver document exists in Firestore, create if needed

**Why needed**:
- User might be new driver without a driver profile yet
- Need to initialize driver document before toggling online

**Code to add**:
```typescript
useEffect(() => {
  if (user?.uid) {
    initializeDriverDocument();
  }
}, [user]);

async function initializeDriverDocument() {
  if (!user?.uid) return;

  try {
    const driverRef = doc(db, 'drivers', user.uid);
    const driverSnap = await getDoc(driverRef);

    if (!driverSnap.exists()) {
      // Create initial driver document
      await setDoc(driverRef, {
        userId: user.uid,
        isAvailable: false,
        isVerified: false,
        vehicleInfo: {
          make: 'Unknown',
          model: 'Unknown',
          year: 2020,
          licensePlate: 'N/A',
          towingCapacity: 'Unknown',
        },
        currentLocation: { latitude: 0, longitude: 0 },
        serviceRadius: 10, // miles
        totalTrips: 0,
        createdAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error initializing driver document:', error);
  }
}
```

**Learning Goal**:
- Firestore document initialization
- Handling new vs existing users
- Data initialization patterns

---

### Step 9: Manual Testing on Device
**Action**: Test the complete flow on a physical device or emulator

**Test Checklist**:
- [ ] Map loads with current location
- [ ] Toggle switch changes from offline to online
- [ ] Status card updates (gray dot → green dot, "Offline" → "Online")
- [ ] Info banner appears when online
- [ ] Bottom button ("Go Online") disappears when online, replaced with "Waiting for requests..."
- [ ] Firestore `drivers/{id}.isAvailable` updates correctly
- [ ] State persists after closing and reopening app
- [ ] Location permission flow works correctly
- [ ] App handles denied location permission gracefully
- [ ] Toggle works without network (shows error)
- [ ] Toggle can be switched back to offline

**Testing Commands**:
```bash
# Start Expo
npx expo start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Check Firestore in Firebase Console
# Navigate to: https://console.firebase.google.com/u/2/project/towlink-71a59/firestore
```

**Learning Goal**:
- Real device testing
- Debugging mobile permissions
- Using Firebase Console to verify data

---

### Step 10: Code Review and Refinement
**Action**: Review code for patterns, error handling, and edge cases

**Review Checklist**:
- [ ] All try/catch blocks have proper error handling
- [ ] User feedback (alerts) for all error states
- [ ] Loading states prevent double-taps
- [ ] Cleanup functions in useEffect (if any listeners added)
- [ ] TypeScript types are correct (no `any` types)
- [ ] Code follows existing patterns from commuter screen
- [ ] Comments explain complex logic
- [ ] Console.logs removed or converted to proper error logging

**Learning Goal**:
- Code quality best practices
- Professional error handling
- Following project conventions

---

## Edge Cases and Error Handling

### Edge Case 1: No Driver Document in Firestore
**Scenario**: New driver user, no driver profile exists yet
**Solution**:
- Check for document existence on mount
- Create default driver document if missing (Step 8)
- Disable toggle until document is created

### Edge Case 2: Location Permission Denied
**Scenario**: User denies location access
**Solution**:
- Show alert explaining why location is needed
- Provide button to open Settings
- Disable "Go Online" functionality
- Show clear message: "Location permission required"

### Edge Case 3: GPS Not Ready
**Scenario**: GPS returns (0, 0) coordinates
**Solution**:
- Don't allow going online with invalid location
- Show "Waiting for GPS signal..." message
- Retry getting location every 3 seconds

### Edge Case 4: Network Error During Toggle
**Scenario**: Firestore update fails due to no internet
**Solution**:
- Show error alert: "No internet connection"
- Don't update local state if Firestore update fails
- Keep previous state (don't toggle UI)
- Suggest user to check connection

### Edge Case 5: App Crashes While Online
**Scenario**: App is force-quit while driver is online
**Solution**:
- On next launch, load saved state from AsyncStorage
- Sync with Firestore (in case of mismatch)
- If state says "online" but Firestore says "offline", trust Firestore
- Show notification: "You were set to offline"

### Edge Case 6: Rapid Toggle Switching
**Scenario**: User taps toggle rapidly multiple times
**Solution**:
- Disable switch during toggle operation (`isToggling` state)
- Use `finally` block to re-enable after operation completes
- Only allow one toggle operation at a time

### Edge Case 7: Background Location Tracking (Future)
**Scenario**: Driver goes online but leaves app
**Solution** (Phase 3):
- Implement background location task with `expo-task-manager`
- For Phase 2: Only track location when app is in foreground
- Document this limitation clearly

---

## Testing Strategy

### Manual Testing (Primary for Phase 2)

**Functional Tests**:
1. **Location Loading**
   - Verify map shows current location
   - Verify marker appears at correct position
   - Test on both iOS and Android

2. **Toggle Online**
   - Tap toggle switch
   - Verify UI updates (status card, info banner, bottom section)
   - Check Firestore document in Firebase Console
   - Verify `isAvailable = true`
   - Verify `currentLocation` is updated

3. **Toggle Offline**
   - Tap toggle switch again
   - Verify UI reverts to offline state
   - Check Firestore document
   - Verify `isAvailable = false`

4. **State Persistence**
   - Go online
   - Close app completely
   - Reopen app
   - Verify driver is still online (UI + Firestore match)

5. **Permission Flow**
   - Uninstall app, reinstall
   - Try to go online
   - Verify location permission prompt appears
   - Deny permission → verify error handling
   - Grant permission → verify toggle works

**Edge Case Tests**:
- Test with airplane mode (no network)
- Test with location services disabled
- Test with poor GPS signal
- Test rapid toggle switching
- Test with fresh user (no driver document)

### Firebase Console Verification

After each test, check Firebase Console:
- Navigate to Firestore
- Open `drivers/{your-user-id}` document
- Verify `isAvailable` field matches UI state
- Verify `currentLocation` coordinates are correct
- Check `driverLocations` collection (if implemented)

### Debug Logging

Add console logs for debugging:
```typescript
console.log('Toggle state:', isOnline);
console.log('Driver location:', driverLocation);
console.log('Firestore update success');
```

Remove or convert to proper logging before code review.

---

## Dependencies

### Required Packages (Already Installed)
- `expo-location` - GPS location tracking
- `react-native-maps` - Map display
- `firebase` - Firestore database

### New Packages to Install
- `@react-native-async-storage/async-storage` - State persistence

### Firebase Configuration
- Firebase project already set up (`towlink-71a59`)
- Firestore database already initialized
- No new Firebase setup required

### Prerequisite Stories
- **TOW-14**: Commuter screen (completed) - Establishes map patterns
- **Firebase setup**: Already complete
- **Authentication**: Already working

### Blocking Stories (Dependent on TOW-50)
- **TOW-51**: Basic Request Pop-Up UI - Needs online/offline state
- **TOW-52**: Request Assignment & Claiming Logic - Needs driver availability
- **TOW-53**: Integrate Real-Time Request Listening - Needs online/offline state

---

## Future Enhancements (Not in This Story)

### Phase 3: Background Location Tracking
- Implement `expo-task-manager` for background location updates
- Update location even when app is in background
- Handle iOS background location limitations
- Battery optimization strategies

### Phase 3: Real-Time Request Listening
- Add Firestore listener for incoming requests
- Show notification badge when new request arrives
- Audio/vibration alert for new requests

### Phase 4: Advanced Features
- Show online time tracking ("Online for 3h 24m")
- Show last request time ("Last request: 15 minutes ago")
- Estimated earnings while online
- Service radius visualization on map (circle around driver)

---

## Learning Objectives for Student

This story teaches:

1. **State Management Patterns**
   - Local state (useState)
   - Persistent state (AsyncStorage)
   - Remote state (Firestore)
   - Synchronizing all three

2. **Mobile Permissions**
   - Requesting location permission
   - Handling permission denial
   - Deep linking to Settings

3. **Firestore Operations**
   - Reading documents
   - Updating documents
   - Creating documents conditionally
   - Error handling with Firestore

4. **React Native UI**
   - Conditional rendering
   - Absolute positioning
   - Toggle/Switch components
   - Styling to match design mockups

5. **Professional Practices**
   - Error handling with try/catch/finally
   - User feedback (alerts)
   - Loading states (prevent double actions)
   - Edge case handling
   - Code organization

---

## Definition of Done

This story is complete when:

- [ ] Driver screen displays map with current GPS location
- [ ] Toggle switch controls online/offline status
- [ ] UI matches Figma design (offline and online states)
- [ ] Firestore `drivers/{id}.isAvailable` updates correctly
- [ ] State persists across app restarts (AsyncStorage)
- [ ] Location permissions are handled gracefully
- [ ] All edge cases are handled with user-friendly messages
- [ ] Manual testing passes all test cases
- [ ] Code follows project patterns and conventions
- [ ] Code is committed with meaningful git message
- [ ] Ready for `quality-reviewer` agent to test

---

## Code Review Considerations

When `quality-reviewer` agent reviews this story, check:

1. **Functionality**
   - Toggle switch works correctly
   - Firestore updates happen successfully
   - State persists across app restarts
   - Location appears on map

2. **Error Handling**
   - All async operations have try/catch
   - User sees friendly error messages
   - No crashes on permission denial
   - Network errors handled gracefully

3. **Code Quality**
   - Follows patterns from commuter screen
   - TypeScript types are correct
   - No console.log statements left in code
   - Comments explain complex logic
   - Functions are focused and single-purpose

4. **UI/UX**
   - Matches Figma design
   - Loading states prevent double-taps
   - Feedback for all user actions
   - Smooth transitions

5. **Data Integrity**
   - Firestore document structure matches schema
   - No orphaned data
   - Timestamps use server time
   - No race conditions with rapid toggling

---

## References

- **Jira Story**: https://chriskelamyan115.atlassian.net/browse/TOW-50
- **Design Mockups**: `.claude/design/screens/driver-home-offline.png`, `driver-home-online.png`
- **Architecture Doc**: `.claude/docs/ARCHITECTURE.md`
- **Patterns Doc**: `.claude/docs/PATTERNS.md`
- **Commuter Screen Reference**: `app/(commuter)/index.tsx`
- **Firestore Service**: `services/firebase/firestore.ts`
- **Driver Type**: `types/models.ts` - `Driver` interface

---

*This specification is ready for the `code-coach` agent to create a lesson plan.*
