# Implementation Progress: TOW-50
## Driver Home Screen Online/Offline Toggle

---

## Lesson Plan Overview

Welcome to TOW-50! This story is your first deep dive into building the driver experience. By the end, you'll understand:

### What You'll Build
A driver home screen with an online/offline toggle that controls driver availability. The screen will show the driver's location on a map and update their status in Firestore in real-time.

### Key Learning Objectives

1. **State Management Triangle** - You'll manage state in THREE places simultaneously:
   - Local state (React useState - for immediate UI updates)
   - Persistent state (AsyncStorage - survives app restarts)
   - Remote state (Firestore - shared with other users/devices)

2. **Mobile Permissions Flow** - You'll implement a professional permissions request flow that handles denied, granted, and "ask again" states gracefully.

3. **Firestore Operations** - You'll add new service functions to update driver availability and create location tracking documents.

4. **Conditional UI Rendering** - You'll build a dynamic interface that changes based on online/offline state, matching the Figma designs.

5. **Error Handling Best Practices** - You'll learn to handle network errors, permission errors, and race conditions with user-friendly feedback.

### What Makes This Challenging

This story requires you to think about:
- **State synchronization**: What happens if the app crashes while online? How do you sync local state with Firestore on restart?
- **User experience**: How do you prevent double-taps on the toggle? What feedback do you show during network operations?
- **Edge cases**: What if GPS returns (0, 0)? What if location permission is denied? What if there's no internet?

### Why This Matters

This screen is the foundation for the entire driver experience. Every future driver feature (request listening, trip acceptance, navigation) depends on this online/offline state being reliable. You're building a critical piece of infrastructure.

---

## Current Step

**Step 10: Test Location Permission Flow**

---

## Implementation Steps

### Step 1: Install AsyncStorage for State Persistence

**Status**: [x] Complete

**Learning Objective**:
Understand why we need persistent storage and how AsyncStorage provides key-value storage that survives app restarts.

**What to Do**:
1. Install the AsyncStorage package using Expo's installation command
2. Understand the difference between:
   - **useState** (lost on unmount/reload)
   - **AsyncStorage** (survives app restart)
   - **Firestore** (shared across devices)

**Key Questions to Think About**:
- Why do we need THREE different places to store the online/offline state?
- What happens if the driver goes online, then force-quits the app? Where should the "source of truth" be?
- Can AsyncStorage be used while offline? Can Firestore?

**Commands to Run**:
```bash
npx expo install @react-native-async-storage/async-storage
```

**Success Criteria**:
- [ ] Package installed successfully
- [ ] No errors in package.json
- [ ] You can explain why AsyncStorage is needed

**Tips**:
- AsyncStorage is React Native's equivalent to localStorage in web browsers
- It stores data as strings, so you'll need to use JSON.stringify() and JSON.parse()
- It's async, so all operations return Promises

---

### Step 2: Add Firestore Service Functions

**Status**: [x] Complete

**Learning Objective**:
Learn to create reusable service functions for Firestore operations, including error handling and document creation patterns.

**What to Do**:
1. Open `services/firebase/firestore.ts`
2. Add three new functions:
   - `updateDriverAvailability()` - Updates driver's isAvailable field
   - `updateDriverLocation()` - Creates/updates the driver's real-time location
   - `getDriverStatus()` - Fetches current driver availability from Firestore

**Key Questions to Think About**:
- Why do we create a separate `driverLocations` collection instead of just updating the driver's document?
- What should happen if the `driverLocations` document doesn't exist yet?
- Why do we use `Timestamp.now()` instead of `new Date()`?
- How do we handle the case where a driver document doesn't exist yet?

**Code Pattern to Follow**:
Look at the existing `createRequest()` function in the same file. Notice:
- TypeScript types for parameters and return values
- Use of `Timestamp.now()` for server-side timestamps
- Try/catch error handling
- Input validation

**Implementation Hints**:
```typescript
// Use updateDoc for existing documents
await updateDoc(doc(db, 'drivers', driverId), {
  isAvailable: true,
  updatedAt: Timestamp.now(),
});

// Use setDoc with { merge: true } for create-or-update
await setDoc(doc(db, 'driverLocations', driverId), {
  driverId,
  location,
  timestamp: Timestamp.now(),
}, { merge: true });
```

**Success Criteria**:
- [ ] All three functions are implemented
- [ ] TypeScript types are correct (no `any` types)
- [ ] Functions use Timestamp.now() for timestamps
- [ ] Error handling is in place
- [ ] Functions follow the same pattern as existing code
- [ ] You can explain what each function does

**Testing**:
You'll test these in Step 5 when you wire them up to the UI. For now, focus on getting the TypeScript types right.

**References**:
- Spec Section: "Firestore Service Functions" (Step 2)
- Pattern Doc: "Firebase Patterns > Updating Documents"
- Existing Code: `createRequest()` function in the same file

---

### Step 3: Add State Variables to Driver Screen

**Status**: [x] Complete

**Learning Objective**:
Understand the different types of state needed for this feature and when to use each type.

**What to Do**:
1. Open `app/(driver)/index.tsx`
2. Add new state variables for:
   - `isOnline` (boolean) - Tracks online/offline status
   - `isToggling` (boolean) - Prevents double-taps during network operations

**Key Questions to Think About**:
- Why do we need a separate `isToggling` state? Can't we just disable the switch while waiting for Firestore?
- What should the initial value of `isOnline` be? (Hint: We'll load from AsyncStorage in the next step)
- Do we need to track the user's ID in state, or can we get it from context?

**Code Pattern to Follow**:
```typescript
// Look at existing state in the file:
const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);

// Add similar patterns for new state
const [isOnline, setIsOnline] = useState<boolean>(false);
```

**Success Criteria**:
- [ ] State variables are added with correct TypeScript types
- [ ] Initial values make sense (offline by default)
- [ ] No TypeScript errors
- [ ] You can explain what each state variable is for

**Gotchas**:
- Don't set `isOnline` to true by default - drivers should explicitly go online
- The `isToggling` state prevents race conditions (user tapping toggle rapidly)

---

### Step 4: Load Persisted State on Mount

**Status**: [x] Complete

**Learning Objective**:
Learn how to load saved data from AsyncStorage and sync it with Firestore when the app starts.

**What to Do**:
1. Create a new function `loadSavedState()` that:
   - Reads the saved online/offline preference from AsyncStorage
   - Sets the local state
   - Syncs with Firestore (optional: update Firestore if local state differs)
2. Call this function in a `useEffect` that runs on mount

**Key Questions to Think About**:
- What happens if there's no saved state (first time user)? What should the default be?
- Should we trust AsyncStorage or Firestore as the source of truth?
- What if the app crashed while the driver was online? Should they automatically be online again?
- What if there's no internet connection when loading state?

**Code Pattern to Follow**:
```typescript
useEffect(() => {
  loadSavedState();
}, []); // Empty dependency array = run once on mount

async function loadSavedState() {
  try {
    const saved = await AsyncStorage.getItem('driver_is_online');
    if (saved !== null) {
      const wasOnline = JSON.parse(saved);
      setIsOnline(wasOnline);

      // Optional: Sync with Firestore
      // Consider: Should we automatically set driver online if they were online before?
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}
```

**Success Criteria**:
- [ ] Function loads saved state from AsyncStorage
- [ ] Handles case where no saved state exists
- [ ] Has try/catch error handling
- [ ] Called in useEffect on mount
- [ ] You can explain the tradeoffs of auto-restoring online state

**Design Decision**:
Should drivers automatically go back online if the app crashed? There are two approaches:
1. **Auto-restore** - Convenient, but might broadcast location without driver's knowledge
2. **Always start offline** - Safer, requires manual online toggle each time

Discuss this with your coach before implementing!

---

### Step 5: Create the Toggle Handler Function

**Status**: [x] Complete

**Learning Objective**:
Learn to handle async operations with proper loading states, error handling, and user feedback.

**What to Do**:
1. Create a function `handleToggleOnline(value: boolean)` that:
   - Checks if user is authenticated
   - Checks if location permission is granted (when going online)
   - Sets `isToggling = true` to disable the UI
   - Updates Firestore using your service functions from Step 2
   - Updates local state
   - Saves to AsyncStorage
   - Shows success/error alerts
   - Sets `isToggling = false` in the `finally` block

**Key Questions to Think About**:
- What happens if the user tries to go online without location permission?
- What order should these operations happen in? (Local state first? Firestore first? AsyncStorage first?)
- What if the Firestore update fails due to no internet? Should we still update local state?
- Why use a `finally` block instead of setting `isToggling = false` in the try block?

**Code Pattern to Follow**:
```typescript
async function handleToggleOnline(value: boolean) {
  // 1. Validation checks
  if (!user?.uid) {
    Alert.alert('Error', 'You must be signed in');
    return;
  }

  if (value && !driverLocation) {
    // Going online requires location
    await getUserLocation();
    return;
  }

  setIsToggling(true);

  try {
    // 2. Update Firestore (remote state)
    await updateDriverAvailability(user.uid, value, value ? driverLocation! : undefined);

    // 3. Update local state
    setIsOnline(value);

    // 4. Persist to AsyncStorage
    await AsyncStorage.setItem('driver_is_online', JSON.stringify(value));

    // 5. User feedback
    Alert.alert(
      value ? 'You\'re Online!' : 'You\'re Offline',
      value ? 'You can now receive service requests' : 'You will not receive requests'
    );

  } catch (error) {
    console.error('Toggle error:', error);
    Alert.alert('Error', 'Failed to update status. Please try again.');
  } finally {
    setIsToggling(false); // Always runs, even if error occurs
  }
}
```

**Success Criteria**:
- [ ] Function validates user is signed in
- [ ] Function checks location permission before going online
- [ ] Uses try/catch/finally pattern
- [ ] Updates all three state locations (Firestore, local, AsyncStorage)
- [ ] Shows user-friendly alerts for success and errors
- [ ] Loading state prevents double-taps
- [ ] You can explain why the order of operations matters

**Gotchas**:
- If Firestore update fails, do NOT update local state - user should see an error and stay in previous state
- Use `finally` block to ensure `isToggling` is reset even if an error occurs
- The `!` after `driverLocation!` is a TypeScript assertion - use carefully after checking for null

---

### Step 6: Add UI Components for Status Card

**Status**: [x] Complete

**Learning Objective**:
Learn to build conditional UI that changes based on state, using absolute positioning for overlays.

**What to Do**:
1. Add a status card that shows:
   - A colored dot (gray when offline, green when online)
   - Status text ("Offline" or "Online")
   - A toggle switch
2. Add an info banner that only shows when online:
   - Title: "You're now online and broadcasting location"
   - Subtitle: "Ready to receive service requests"

**Key Questions to Think About**:
- Should the status card be a separate component or inline JSX? What are the tradeoffs?
- How do you position elements on top of the map?
- Why use a `Switch` component instead of a custom button?
- How do you prevent the switch from being toggled while `isToggling` is true?

**Code Pattern to Follow**:
```typescript
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
```

**Success Criteria**:
- [ ] Status card displays correctly
- [ ] Dot color changes based on state (gray/green)
- [ ] Toggle switch is wired to handleToggleOnline
- [ ] Info banner only shows when online (conditional rendering)
- [ ] Components are positioned above the map using absolute positioning
- [ ] You can explain how conditional rendering works with `&&`

**Styling Tips**:
- Use `position: 'absolute'` to overlay on map
- Use `shadowColor` and `elevation` for depth (iOS and Android)
- Use `borderRadius` for rounded corners
- Look at the design mockups in `.claude/design/screens/` for exact spacing

**References**:
- Spec Section: "UI Layout" (Step 5)
- Pattern Doc: "Styling Patterns"
- Design Mockups: `.claude/design/screens/driver-home-offline.png` and `driver-home-online.png`

---

### Step 7: Add Bottom Section (Action Button or Status Text)

**Status**: [x] Complete

**Learning Objective**:
Learn to create mutually exclusive UI components using conditional rendering.

**What to Do**:
1. Add a bottom container that shows different content based on online/offline state:
   - **When offline**: Show "Go online to start receiving requests" text and a blue "Go Online" button
   - **When online**: Show "Waiting for requests..." text

**Key Questions to Think About**:
- Why use ternary operator (`condition ? A : B`) instead of two separate conditionals?
- Should the "Go Online" button call `handleToggleOnline(true)` or duplicate the logic?
- How do you make the button full width but constrained by padding?

**Code Pattern to Follow**:
```typescript
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
```

**Success Criteria**:
- [ ] Bottom section changes based on isOnline state
- [ ] "Go Online" button is styled to match design (blue, rounded, full width)
- [ ] Button shows "Connecting..." when isToggling is true
- [ ] "Waiting for requests..." shows when online
- [ ] Button is disabled during toggle operation
- [ ] You can explain why button text changes during loading

**Styling Tips**:
- The button should be prominent (larger padding, bold text, bright blue)
- Position bottom container with `position: 'absolute', bottom: 40`
- Use `left: 20, right: 20` to add horizontal padding

---

### Step 8: Style All Components to Match Design

**Status**: [x] Complete

**Learning Objective**:
Learn to translate design mockups into React Native StyleSheet code with proper spacing, colors, and shadows.

**What to Do**:
1. Create StyleSheet styles for all new components:
   - Status card (white background, rounded corners, shadow)
   - Status dot (12px circle, gray or green)
   - Info banner (light blue background, rounded corners)
   - Bottom button (blue background, white text, rounded, shadow)
   - Waiting text (gray, centered)

**Key Questions to Think About**:
- What's the difference between `shadowColor` (iOS) and `elevation` (Android)?
- Why use a style array like `[styles.dot, isOnline && styles.dotOnline]`?
- How do you match exact colors from a design mockup?
- What's the difference between `padding` and `paddingHorizontal/paddingVertical`?

**Code Pattern to Follow**:
```typescript
const styles = StyleSheet.create({
  // Existing styles
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Status Card
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
  // ... add more styles
});
```

**Success Criteria**:
- [ ] All components have styles defined
- [ ] Colors match the design mockups (use a color picker if needed)
- [ ] Shadows work on both iOS and Android (shadowColor + elevation)
- [ ] Spacing matches the design (top: 50, padding: 16, etc.)
- [ ] Text is readable (good contrast, appropriate font size)
- [ ] You can explain what each style property does

**Styling Reference**:
- iOS blue: `#007AFF`
- Success green: `#34C759`
- Gray: `#8E8E93`
- Light blue banner: `#D1ECFF`
- Text gray: `#666`

**References**:
- Spec Section: "Style the Components" (Step 6)
- Design Mockups: `.claude/design/screens/driver-home-offline.png` and `driver-home-online.png`

---

### Step 9: Initialize Driver Document if Missing

**Status**: [x] Complete

**Learning Objective**:
Learn to handle the "new user" case where a driver document doesn't exist yet in Firestore.

**What to Do**:
1. Create a function `initializeDriverDocument()` that:
   - Checks if a driver document exists for the current user
   - Creates a default driver document if it doesn't exist
   - Uses the `Driver` interface from `types/models.ts`
2. Call this function in a `useEffect` when the user is authenticated

**Key Questions to Think About**:
- Why might a driver document not exist? (New user, first time accessing driver mode)
- What default values should we use for a new driver?
- Should we block the UI until this check completes?
- What if the document creation fails?

**Code Pattern to Follow**:
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

**Success Criteria**:
- [ ] Function checks for document existence using getDoc()
- [ ] Creates document with setDoc() if missing
- [ ] Default values match the Driver interface
- [ ] Uses Timestamp.now() for createdAt
- [ ] Called in useEffect when user changes
- [ ] Has error handling
- [ ] You can explain why we need this check

**Imports Needed**:
```typescript
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
```

**Gotchas**:
- Use `setDoc()` not `addDoc()` because we want to specify the document ID (user.uid)
- Default location (0, 0) should be updated when driver goes online
- This is temporary - in production, driver document would be created during driver onboarding flow

---

### Step 10: Test Location Permission Flow

**Status**: [ ] Not Started

**Learning Objective**:
Learn to handle mobile permissions gracefully, including denied permissions and deep linking to Settings.

**What to Do**:
1. Test the existing `getUserLocation()` function
2. Enhance it to handle the "denied" case better:
   - Show a clear explanation of why location is needed
   - Provide a button to open Settings
   - Disable "Go Online" functionality if permission is denied
3. Test on a real device or simulator with different permission states

**Key Questions to Think About**:
- What happens if the user denies permission the first time? Can we ask again?
- How do we guide the user to Settings if they've permanently denied permission?
- Should we keep asking for permission, or give up after the first denial?
- What if the user grants permission in Settings but doesn't reopen the app?

**Code Enhancement**:
```typescript
import { Alert, Linking } from 'react-native';

async function getUserLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'TowLink needs location access to show your position to customers. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings()
          }
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

**Success Criteria**:
- [ ] Permission request shows clear message
- [ ] Denied permission shows helpful alert with Settings button
- [ ] Settings button opens device settings
- [ ] Location is fetched successfully when granted
- [ ] Error handling covers edge cases
- [ ] You can explain the different permission states

**Testing Checklist**:
- [ ] Test with permission granted
- [ ] Test with permission denied (first time)
- [ ] Test with permission permanently denied
- [ ] Test "Open Settings" button
- [ ] Test re-requesting after granting in Settings
- [ ] Test on both iOS and Android if possible

**Gotchas**:
- On iOS, permission can only be requested once - after that, user must go to Settings
- On Android, permission can be requested multiple times
- `Linking.openSettings()` behavior differs between iOS and Android

---

### Step 11: Manual Testing - Basic Toggle Flow

**Status**: [ ] Not Started

**Learning Objective**:
Learn to manually test a feature end-to-end, verifying both UI and database state.

**What to Do**:
1. Run the app on a device or simulator
2. Navigate to the driver screen
3. Test the complete toggle flow:
   - Toggle from offline to online
   - Verify UI updates (status card, info banner, bottom section)
   - Check Firestore in Firebase Console
   - Toggle back to offline
   - Verify UI updates again
   - Check Firestore again

**Key Questions to Think About**:
- How do you verify that Firestore was actually updated?
- What should you look for in the Firebase Console?
- How do you test state persistence (AsyncStorage)?
- What edge cases should you manually test?

**Testing Steps**:

**1. Start the app**
```bash
npx expo start
# Then press 'i' for iOS or 'a' for Android
```

**2. Toggle to Online**
- [ ] Tap the toggle switch
- [ ] Observe the UI changes:
  - Status dot turns green
  - Status text changes to "Online"
  - Info banner appears
  - Bottom section shows "Waiting for requests..."
- [ ] Check for success alert

**3. Verify in Firebase Console**
- [ ] Open Firebase Console: https://console.firebase.google.com/u/2/project/towlink-71a59/firestore
- [ ] Navigate to `drivers/{your-user-id}` document
- [ ] Verify `isAvailable` field is `true`
- [ ] Verify `currentLocation` has your GPS coordinates
- [ ] Check `driverLocations/{your-user-id}` document exists (if implemented)

**4. Toggle to Offline**
- [ ] Tap the toggle switch again
- [ ] Observe the UI changes:
  - Status dot turns gray
  - Status text changes to "Offline"
  - Info banner disappears
  - Bottom section shows "Go Online" button
- [ ] Check for success alert

**5. Verify in Firebase Console**
- [ ] Refresh Firestore in console
- [ ] Verify `isAvailable` field is now `false`

**6. Test State Persistence**
- [ ] Go online
- [ ] Completely close the app (swipe up/force quit)
- [ ] Reopen the app
- [ ] Navigate to driver screen
- [ ] Verify driver is still online (UI shows online state)

**Success Criteria**:
- [ ] Toggle works both directions (offline → online → offline)
- [ ] UI updates immediately and correctly
- [ ] Firestore updates match UI state
- [ ] State persists across app restarts
- [ ] No console errors
- [ ] You can explain what's happening at each step

**Debugging Tips**:
- If toggle doesn't work, check console for errors
- If Firestore doesn't update, verify Firebase config
- If state doesn't persist, check AsyncStorage key name matches
- Use `console.log()` to trace function calls (remove before finishing)

---

### Step 12: Manual Testing - Edge Cases

**Status**: [ ] Not Started

**Learning Objective**:
Learn to think like a QA engineer and test edge cases that might break your feature.

**What to Do**:
Test the feature in unusual or error conditions to find bugs before users do.

**Edge Case Test Checklist**:

**1. Permission Denied**
- [ ] Uninstall and reinstall app
- [ ] Deny location permission when prompted
- [ ] Try to go online
- [ ] Verify error message is clear
- [ ] Verify "Open Settings" button works
- [ ] Grant permission in Settings
- [ ] Return to app and try again

**2. No Internet Connection**
- [ ] Turn on airplane mode
- [ ] Try to toggle online
- [ ] Verify error message appears
- [ ] Verify UI doesn't change (stays offline)
- [ ] Turn off airplane mode
- [ ] Try again - should work

**3. Rapid Toggle Switching**
- [ ] Tap toggle switch rapidly 5-10 times
- [ ] Verify switch is disabled during operation (can't double-tap)
- [ ] Verify final state matches Firestore
- [ ] No race condition errors

**4. GPS Not Ready**
- [ ] In simulator, set location to "None"
- [ ] Try to go online
- [ ] Verify it handles (0, 0) coordinates gracefully
- [ ] Set a valid location
- [ ] Try again - should work

**5. Fresh User (No Driver Document)**
- [ ] Create a new test account
- [ ] Navigate to driver screen as new user
- [ ] Verify driver document is created automatically
- [ ] Verify toggle works for new user

**6. App Crash While Online**
- [ ] Go online
- [ ] Force quit the app while online
- [ ] Reopen app
- [ ] Verify state is restored correctly
- [ ] Verify Firestore still shows online (or discuss desired behavior)

**7. Toggle While Location Loading**
- [ ] Clear app data
- [ ] Open app (location permission granted but location not fetched yet)
- [ ] Immediately try to go online before GPS lock
- [ ] Verify it either waits for location or shows error

**Success Criteria**:
- [ ] All edge cases handled gracefully
- [ ] No app crashes
- [ ] User always sees helpful error messages
- [ ] No "stuck" states (e.g., toggle spinning forever)
- [ ] You found at least one bug and fixed it!

**Bug Tracking**:
If you find bugs during testing, note them below and discuss with your coach:
- Bug 1: [Description]
- Bug 2: [Description]
- Bug 3: [Description]

---

### Step 13: Code Review and Cleanup

**Status**: [ ] Not Started

**Learning Objective**:
Learn to review your own code with a critical eye, looking for improvements before submitting.

**What to Do**:
Go through your code and check for common issues, following the project's conventions and best practices.

**Code Review Checklist**:

**1. TypeScript Quality**
- [ ] No `any` types (all types are explicit)
- [ ] No TypeScript errors or warnings
- [ ] Interfaces match `types/models.ts`
- [ ] Function return types are specified

**2. Error Handling**
- [ ] All async operations have try/catch
- [ ] User sees friendly error messages (not just console.log)
- [ ] No unhandled promise rejections
- [ ] `finally` blocks clean up loading states

**3. Code Organization**
- [ ] Functions are focused (do one thing)
- [ ] Complex logic has comments explaining "why"
- [ ] Imports are organized (React, external libs, local modules)
- [ ] No unused imports or variables

**4. React Best Practices**
- [ ] useEffect dependencies are correct (no missing dependencies)
- [ ] Cleanup functions return from useEffect
- [ ] State updates use functional form when depending on previous state
- [ ] No direct state mutations (always use setState)

**5. Styling**
- [ ] Styles follow existing patterns
- [ ] Colors extracted to constants (not hardcoded)
- [ ] Both iOS (shadow) and Android (elevation) styling
- [ ] Consistent spacing and sizing

**6. Console Logs**
- [ ] Remove or comment out debug console.logs
- [ ] Keep only meaningful error logging
- [ ] Use descriptive log messages

**7. User Experience**
- [ ] Loading states prevent double-taps
- [ ] Error messages are actionable ("Please enable location" not "Error 403")
- [ ] Success feedback confirms actions
- [ ] No confusing UI states

**8. Follows Project Patterns**
- [ ] Matches code style of commuter screen
- [ ] Uses same Firebase patterns as existing code
- [ ] Follows file organization conventions

**Success Criteria**:
- [ ] All checklist items reviewed
- [ ] At least 3 improvements made
- [ ] Code is readable by someone else
- [ ] You're proud of the code quality!

**Refactoring Questions**:
- Could any logic be extracted into a custom hook?
- Are there repeated patterns that could be a reusable component?
- Is error handling consistent across all functions?
- Are variable names descriptive and clear?

---

### Step 14: Compare with Design Mockups

**Status**: [ ] Not Started

**Learning Objective**:
Learn to compare your implementation with design mockups pixel by pixel, ensuring the UI matches the intended design.

**What to Do**:
1. Open the design mockups:
   - `.claude/design/screens/driver-home-offline.png`
   - `.claude/design/screens/driver-home-online.png`
2. Take screenshots of your implementation
3. Compare side-by-side and note differences
4. Adjust styling to match

**Design Comparison Checklist**:

**Offline State** (driver-home-offline.png):
- [ ] Status card position and size match
- [ ] "Offline" text with gray dot
- [ ] Toggle switch in off state (gray)
- [ ] Bottom text: "Go online to start receiving requests"
- [ ] Blue "Go Online" button
- [ ] Location button in bottom right
- [ ] Map fills entire background
- [ ] White card has rounded corners and shadow

**Online State** (driver-home-online.png):
- [ ] Status card shows "Online" with green dot
- [ ] Toggle switch in on state (blue)
- [ ] Light blue info banner appears below status card
- [ ] Banner text: "You're now online and broadcasting location"
- [ ] Banner subtitle: "Ready to receive service requests"
- [ ] Bottom shows "Waiting for requests..." text
- [ ] Blue marker on map at driver location
- [ ] All spacing matches design

**Styling Details**:
- [ ] Status card padding and border radius
- [ ] Status dot size (12px circle)
- [ ] Font sizes match design
- [ ] Colors match exactly (use color picker)
- [ ] Shadow depth and opacity
- [ ] Button corner radius
- [ ] Gap between elements

**Success Criteria**:
- [ ] UI closely matches both mockups
- [ ] No major visual differences
- [ ] Design feels polished and professional
- [ ] You can explain any intentional differences

**Acceptable Differences**:
Some differences are okay:
- Different map tile style (Google Maps vs Figma mockup)
- System fonts vs mockup fonts
- Minor spacing adjustments for different screen sizes

**Unacceptable Differences**:
These should be fixed:
- Wrong colors (e.g., red instead of blue)
- Missing elements (e.g., no info banner)
- Completely different layout
- Broken styling (e.g., text cut off)

---

### Step 15: Final Testing and Documentation

**Status**: [ ] Not Started

**Learning Objective**:
Learn to document your work and prepare it for code review.

**What to Do**:
1. Run through the entire feature one last time
2. Test on multiple devices/simulators if possible
3. Document any known issues or limitations
4. Prepare notes for the code review

**Final Testing Checklist**:
- [ ] Feature works on iOS simulator
- [ ] Feature works on Android emulator (if available)
- [ ] All acceptance criteria met (check story)
- [ ] No console errors
- [ ] Performance is good (no lag when toggling)
- [ ] Memory usage is normal (no leaks)

**Acceptance Criteria Verification** (from TOW-50):
- [ ] Driver home screen displays map with driver's current location
- [ ] Online/Offline toggle updates driver status in Firestore (drivers/{id}.isAvailable)
- [ ] Toggle persists across app restarts
- [ ] Map updates location in real-time when online
- [ ] UI matches design mockups (offline and online states)

**Known Limitations** (document these):
- [ ] Background location tracking not implemented (Phase 3)
- [ ] Location only updates when screen is active (not in background)
- [ ] Request listening not implemented yet (TOW-53)
- [ ] No service radius visualization (Phase 4)

**Success Criteria**:
- [ ] All acceptance criteria verified
- [ ] Feature is production-ready
- [ ] Known limitations documented
- [ ] Ready for quality-reviewer agent

**Prepare for Code Review**:
Write a brief summary of what you learned:
- What was the most challenging part?
- What are you most proud of?
- What would you do differently next time?
- Any questions for the reviewer?

**Notes for Reviewer**:
[Write notes here about specific areas you want feedback on]

---

## Completed Steps

(None yet - start with Step 1!)

---

## Notes and Decisions

### Design Decisions Made

(Document any important decisions you made during implementation)

Example:
- Decision: Always start drivers offline, even if they were online before app closed
- Reason: Privacy - don't broadcast location without explicit user action
- Alternative considered: Auto-restore online state from AsyncStorage
- Discussion date: [Date]

### Bugs Found and Fixed

(Track bugs you discovered during testing)

Example:
- Bug: Toggle stuck in loading state if Firestore update fails
- Fix: Added `finally` block to always reset isToggling
- Found in: Step 12 - Edge case testing

### Deviations from Spec

(Note any intentional differences from the technical spec)

Example:
- Spec said to create driverLocations collection, but decided to implement in Phase 3
- Reason: Not needed for basic online/offline toggle
- Approved by: [Coach name]

### Questions for Coach

1. Look into creating a story for `expo-task-manager` background location tracking (Phase 3) — driver should stay online when app is backgrounded but go offline on force-quit

---

## Resources and References

### Documentation
- Technical Spec: `.claude/specs/TOW-50.md`
- Architecture Doc: `.claude/docs/ARCHITECTURE.md`
- Patterns Doc: `.claude/docs/PATTERNS.md`
- Design Mockups: `.claude/design/screens/driver-home-offline.png`, `driver-home-online.png`

### Related Files
- Driver Screen: `app/(driver)/index.tsx`
- Firestore Service: `services/firebase/firestore.ts`
- Type Definitions: `types/models.ts`
- Firebase Config: `services/firebase/config.ts`

### Similar Code to Reference
- Commuter Screen: `app/(commuter)/index.tsx` (has map integration)
- Auth Context: `context/auth-context.tsx` (has user state)

### External Documentation
- React Native Switch: https://reactnative.dev/docs/switch
- AsyncStorage: https://react-native-async-storage.github.io/async-storage/
- Expo Location: https://docs.expo.dev/versions/latest/sdk/location/
- Firestore: https://firebase.google.com/docs/firestore

---

## Time Tracking (Optional)

Track time spent on each step to help estimate future stories:

- Step 1: [Duration]
- Step 2: [Duration]
- Step 3: [Duration]
- Step 4: [Duration]
- Step 5: [Duration]
- Step 6: [Duration]
- Step 7: [Duration]
- Step 8: [Duration]
- Step 9: [Duration]
- Step 10: [Duration]
- Step 11: [Duration]
- Step 12: [Duration]
- Step 13: [Duration]
- Step 14: [Duration]
- Step 15: [Duration]

**Total Time**: [Sum]

---

## Ready for Review

When all steps are complete, check these boxes:

- [ ] All acceptance criteria met
- [ ] All tests passed
- [ ] Code reviewed and cleaned up
- [ ] UI matches design mockups
- [ ] Documentation updated
- [ ] Known limitations documented
- [ ] Git commit created with meaningful message

**Ready for quality-reviewer agent**: [ ] Yes / [ ] No

---

_Last Updated: [Date]_
_Student: Chris_
_Story: TOW-50 - Driver Home Screen Online/Offline Toggle_
