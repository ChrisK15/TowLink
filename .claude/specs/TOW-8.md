# Technical Specification: TOW-8

## Story Reference
**ID**: TOW-8
**Title**: US-1.2: Role Selection During Signup
**Epic**: TOW-1 (User Authentication & Account Management)
**Priority**: CRITICAL ⭐
**Story Points**: 3
**Sprint**: TOW Sprint 1 (Week 1-2)
**Status**: To Do
**Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-8

**User Story**:
As a new user, I want to select whether I'm a commuter or driver during signup so that the app shows me the correct interface.

**Acceptance Criteria from Jira**:
- Role selection screen appears after email/password signup
- Two clear options: "I need a tow" (Commuter) or "I'm a tow truck driver" (Driver)
- Role is saved to user document in Firestore: `role: 'commuter' | 'driver'`
- User cannot proceed without selecting a role
- UI is clear and visually distinct between options

---

## Architecture Overview

This story implements the critical role selection step that determines a user's journey through the TowLink app. It builds directly on TOW-7's signup flow and introduces the concept of conditional navigation based on user role.

### High-Level Flow
```
User completes email/password signup (TOW-7) →
Navigates to role selection screen (NEW) →
User selects "Commuter" or "Driver" →
Role is saved to Firestore user document →
User is directed to role-appropriate home screen (future stories)
```

### Key Architectural Decisions

1. **Sequential Navigation Pattern**: Role selection happens AFTER account creation, not during. This separates concerns and allows the Firebase Auth account to exist before committing to a role.

2. **Required Selection**: Unlike optional fields, role selection is mandatory. Users cannot skip this step - it determines their entire app experience.

3. **Single Responsibility**: The role selection screen does one thing only - capture the user's role. It doesn't collect additional info (that comes later in onboarding).

4. **Immutable Role (for now)**: Once selected, the role is stored in Firestore. Changing roles will be addressed in a future story (profile management).

5. **Service Layer Update**: We'll add a new function `updateUserRole()` to the existing `authService.ts` to maintain separation of concerns.

### Why This Matters for Learning

This story teaches:
- **Navigation flows**: How to programmatically navigate after user actions
- **Firestore updates**: How to modify existing documents (vs. creating new ones)
- **TypeScript unions**: Using `'commuter' | 'driver'` as a type-safe enum
- **Conditional UI**: Creating visually distinct, selectable options
- **State management**: Handling selection state and validation

---

## Technical Requirements

### Frontend Components

**New Screen to Create**:
- `app/(auth)/role-selection.tsx` - Role selection screen (NEW)

**Service Layer Update**:
- `services/firebase/authService.ts` - Add `updateUserRole()` function

**Navigation Updates**:
- `app/(auth)/signup.tsx` - Navigate to role selection after successful signup

**State Management**:
- Local component state for:
  - Selected role: `'commuter' | 'driver' | null`
  - Loading state (while saving to Firestore)
  - Error messages (if Firestore update fails)

### Backend (Firebase)

**Firestore Update**:
The user document structure remains the same, but now the `role` field will be populated:

```javascript
/users/{userId}
{
  id: string,           // Firebase Auth UID (unchanged)
  email: string,        // User's email (unchanged)
  createdAt: Timestamp, // Account creation time (unchanged)
  role: 'commuter' | 'driver'  // ← Updated from null to actual role
}
```

**Update Operation**:
```typescript
// We use updateDoc() instead of setDoc() because the document already exists
await updateDoc(doc(db, 'users', userId), {
  role: selectedRole
});
```

**Why updateDoc() instead of setDoc()?**
- `setDoc()`: Overwrites entire document (would lose email, createdAt)
- `updateDoc()`: Updates only specified fields (preserves existing data)
- This is a key Firestore concept - partial updates vs. full replacements

### No Backend Functions Required
This is a simple client-side operation. We don't need Cloud Functions because:
- No complex business logic
- No third-party API calls
- No sensitive operations requiring server-side validation
- Just a straightforward database update

---

## Learning Objectives

This story builds on TOW-7 knowledge and introduces new concepts:

1. **Firestore Updates**: Learn the difference between `setDoc()` and `updateDoc()`
2. **Navigation with Data**: How to navigate between screens after operations complete
3. **Selection UI Patterns**: Creating mutually exclusive options that feel intuitive
4. **Type Safety**: Using TypeScript literal unions for strict type checking
5. **Sequential User Flows**: Chaining multiple screens in an onboarding process
6. **Error Recovery**: What happens if the update fails? How do we handle it?
7. **UX Patterns**: Making role selection clear, simple, and mistake-proof

---

## UI/UX Design

### Visual Design Pattern

The role selection screen should feel like a "fork in the road" - a clear choice between two distinct paths. Here's the recommended design approach:

**Layout Structure**:
```
┌─────────────────────────────────────┐
│                                     │
│          Welcome to TowLink!        │  ← Title
│                                     │
│     What brings you here today?     │  ← Subtitle
│                                     │
│  ┌─────────────────────────────┐  │
│  │         👤 Commuter          │  │  ← Option 1
│  │   I need a tow service       │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │      🚛 Tow Truck Driver     │  │  ← Option 2
│  │   I provide tow services     │  │
│  └─────────────────────────────┘  │
│                                     │
│         [Continue Button]           │  ← Disabled until selection
│                                     │
└─────────────────────────────────────┘
```

**Visual Feedback**:
- Unselected card: White/light background, subtle border
- Selected card: Blue/brand color background, bold border, checkmark icon
- Hover/press effect: Scale slightly larger, increase opacity
- Continue button: Disabled (gray) until selection made, then enabled (blue)

**Accessibility Considerations**:
- Large touch targets (min 60px height)
- Clear visual hierarchy
- High contrast text
- Screen reader labels for each option
- Keyboard navigation support (for web version)

---

## Implementation Steps

### Step 1: Create the Role Selection Service Function
**File**: `services/firebase/authService.ts` (MODIFY)

**Learning Focus**: Firestore document updates, error handling

**What to do**:
Add a new function to update the user's role in Firestore. This function will be called from the role selection screen.

**Code Pattern**:
```typescript
import { doc, updateDoc } from 'firebase/firestore';

export async function updateUserRole(
  userId: string,
  role: 'commuter' | 'driver'
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: role
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to save your role. Please try again.');
  }
}
```

**Key Concepts**:
- `updateDoc()`: Only updates the fields you specify, preserves other fields
- `doc(db, 'users', userId)`: Creates a reference to the document
- `Promise<void>`: Function doesn't return data, just succeeds or fails
- Error handling: Catch Firestore errors and translate to user-friendly messages

**Questions to Consider**:
- What if the user document doesn't exist? (Shouldn't happen if signup worked, but...)
- Should we validate that `role` is actually 'commuter' or 'driver'? (TypeScript does this!)
- Do we need to update a `lastModified` timestamp? (Nice to have, but not required)

---

### Step 2: Create the Role Selection Screen Structure
**File**: `app/(auth)/role-selection.tsx` (NEW)

**Learning Focus**: Component structure, state management

**What to do**:
Create the basic screen with state management for role selection.

**Code Pattern**:
```typescript
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { updateUserRole } from '@/services/firebase/authService';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'commuter' | 'driver' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    // TODO: Will implement in next steps
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to TowLink!</Text>
      <Text style={styles.subtitle}>What brings you here today?</Text>

      {/* Role selection cards - Step 3 */}
      {/* Continue button - Step 4 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
});
```

**Key Concepts**:
- `useState<'commuter' | 'driver' | null>`: TypeScript ensures only valid values
- `useRouter()`: Expo Router hook for navigation
- Separate state for selection, loading, and errors
- `null` initial value means "no selection yet"

---

### Step 3: Build the Role Selection Cards
**File**: `app/(auth)/role-selection.tsx`

**Learning Focus**: Conditional styling, user interaction

**What to do**:
Add the two role selection cards with interactive styling that changes based on selection.

**Code Pattern**:
```typescript
// Inside the return statement, replace the comment:
<View style={styles.optionsContainer}>
  {/* Commuter Option */}
  <Pressable
    style={[
      styles.optionCard,
      selectedRole === 'commuter' && styles.optionCardSelected
    ]}
    onPress={() => setSelectedRole('commuter')}
  >
    <Text style={styles.optionEmoji}>👤</Text>
    <Text style={styles.optionTitle}>Commuter</Text>
    <Text style={styles.optionDescription}>I need a tow service</Text>
    {selectedRole === 'commuter' && (
      <Text style={styles.checkmark}>✓</Text>
    )}
  </Pressable>

  {/* Driver Option */}
  <Pressable
    style={[
      styles.optionCard,
      selectedRole === 'driver' && styles.optionCardSelected
    ]}
    onPress={() => setSelectedRole('driver')}
  >
    <Text style={styles.optionEmoji}>🚛</Text>
    <Text style={styles.optionTitle}>Tow Truck Driver</Text>
    <Text style={styles.optionDescription}>I provide tow services</Text>
    {selectedRole === 'driver' && (
      <Text style={styles.checkmark}>✓</Text>
    )}
  </Pressable>
</View>

// Add to StyleSheet:
optionsContainer: {
  gap: 20,
  marginBottom: 30,
},
optionCard: {
  backgroundColor: '#f5f5f5',
  borderRadius: 12,
  padding: 24,
  borderWidth: 2,
  borderColor: '#ddd',
  alignItems: 'center',
  position: 'relative',
},
optionCardSelected: {
  backgroundColor: '#e6f3ff',
  borderColor: '#0a7ea4',
},
optionEmoji: {
  fontSize: 48,
  marginBottom: 10,
},
optionTitle: {
  fontSize: 20,
  fontWeight: '600',
  marginBottom: 5,
  color: '#000',
},
optionDescription: {
  fontSize: 14,
  color: '#666',
  textAlign: 'center',
},
checkmark: {
  position: 'absolute',
  top: 10,
  right: 10,
  fontSize: 24,
  color: '#0a7ea4',
  fontWeight: 'bold',
},
```

**Key Concepts**:
- Array syntax for conditional styles: `[baseStyle, condition && selectedStyle]`
- `onPress={() => setSelectedRole('role')}`: Arrow function to pass arguments
- Conditional rendering: `{selectedRole === 'x' && <Component />}`
- `position: 'absolute'`: Position checkmark in top-right corner
- Large touch targets (24px padding) for easy tapping

**Visual Feedback**:
When user taps a card:
1. `setSelectedRole()` updates state
2. React re-renders component
3. Conditional styles apply (blue background, border)
4. Checkmark appears

---

### Step 4: Implement the Continue Button with Validation
**File**: `app/(auth)/role-selection.tsx`

**Learning Focus**: Form validation, conditional button states

**What to do**:
Add the continue button that's disabled until a role is selected.

**Code Pattern**:
```typescript
// Add after the options container:
{error ? (
  <Text style={styles.error}>{error}</Text>
) : null}

<Pressable
  style={[
    styles.continueButton,
    !selectedRole && styles.continueButtonDisabled
  ]}
  onPress={handleContinue}
  disabled={!selectedRole || loading}
>
  <Text style={styles.continueButtonText}>
    {loading ? 'Saving...' : 'Continue'}
  </Text>
</Pressable>

// Add to StyleSheet:
continueButton: {
  backgroundColor: '#0a7ea4',
  padding: 16,
  borderRadius: 8,
  alignItems: 'center',
},
continueButtonDisabled: {
  backgroundColor: '#ccc',
  opacity: 0.6,
},
continueButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '600',
},
error: {
  color: '#ff3b30',
  marginBottom: 15,
  textAlign: 'center',
  fontSize: 14,
},
```

**Key Concepts**:
- `disabled={!selectedRole || loading}`: Button disabled if no selection OR saving
- Visual feedback with disabled styles
- Loading text shows user something is happening
- Error message appears if save fails

---

### Step 5: Implement the Save and Navigate Logic
**File**: `app/(auth)/role-selection.tsx`

**Learning Focus**: Async operations, navigation, getting user ID

**What to do**:
Implement the `handleContinue` function that saves the role to Firestore and navigates to the next screen.

**Important Question**: How do we get the current user's ID?

**Answer**: From Firebase Auth! After signup, the user is automatically signed in.

**Code Pattern**:
```typescript
import { auth } from '@/services/firebase/config';

const handleContinue = async () => {
  if (!selectedRole) {
    setError('Please select a role');
    return;
  }

  // Get the current user's ID
  const currentUser = auth.currentUser;
  if (!currentUser) {
    setError('Session expired. Please sign up again.');
    return;
  }

  setLoading(true);
  setError('');

  try {
    await updateUserRole(currentUser.uid, selectedRole);
    console.log('Role saved successfully:', selectedRole);

    // TODO: Navigate to appropriate home screen based on role
    // For now, just log success
    // Future stories will implement role-based navigation

  } catch (error: any) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**Key Concepts**:
- `auth.currentUser`: Returns the currently signed-in user (or null)
- Guard clause: Check for user before proceeding
- Error handling: Show user-friendly messages
- `console.log()`: For now, just log success (navigation comes in future stories)

**Why Check for currentUser?**
- Edge case: User's session might expire
- Edge case: User might navigate directly to this screen (shouldn't happen, but defensive coding)
- Better to show clear error than crash

---

### Step 6: Update Signup Flow to Navigate to Role Selection
**File**: `app/(auth)/signup.tsx` (MODIFY)

**Learning Focus**: Screen-to-screen navigation in Expo Router

**What to do**:
After successful signup, navigate to the role selection screen instead of just logging success.

**Code to Change**:
```typescript
// Add import at top:
import { useRouter } from 'expo-router';

// Inside component:
const router = useRouter();

// In handleSignup(), replace the console.log with navigation:
try {
  const result = await signUpWithEmail(email, password);
  console.log('Account created successfully!', result.userId);

  // Navigate to role selection screen
  router.push('/role-selection');  // ← ADD THIS LINE

} catch (error: any) {
  setError(error.message);
} finally {
  setLoading(false);
}
```

**Key Concepts**:
- `router.push()`: Navigates forward, adds to navigation stack
- File-based routing: `/role-selection` matches `app/(auth)/role-selection.tsx`
- User can press back button to return to signup (though they shouldn't need to)

**Alternative Navigation Methods**:
- `router.push()`: Can go back
- `router.replace()`: Cannot go back (replaces current screen)
- `router.navigate()`: Similar to push but handles duplicate URLs differently

**Which to use here?**
`push()` is fine for now. In a production app, you might use `replace()` so users can't go back to the signup form after completing it.

---

### Step 7: Test the Complete Flow End-to-End
**Learning Focus**: Manual testing, debugging navigation flows

**What to do**:
1. Start the app: `npx expo start`
2. Navigate to signup screen
3. Create a new account (use a fresh email)
4. Verify automatic navigation to role selection screen
5. Test role selection:
   - Tap "Commuter" - should highlight
   - Tap "Driver" - should unhighlight commuter and highlight driver
   - Verify continue button is disabled when nothing selected
   - Verify continue button enables when role selected
6. Tap continue
7. Check Firestore console - verify role field is updated
8. Test error cases:
   - Force an error (temporarily break Firebase config)
   - Verify error message displays properly

**How to Verify in Firebase Console**:
1. Go to: https://console.firebase.google.com/u/2/project/towlink-71a59/firestore
2. Navigate to `users` collection
3. Find the document with your new user's ID
4. Verify `role` field shows `'commuter'` or `'driver'` (not `null`)

**Common Issues and Solutions**:

| Issue | Cause | Solution |
|-------|-------|----------|
| Role selection screen doesn't appear | Navigation not added | Check Step 6 implementation |
| Cards don't highlight when tapped | State not updating | Verify `setSelectedRole()` is called |
| Continue button always disabled | Condition wrong | Check `!selectedRole` logic |
| Firestore update fails | Permissions or connection | Check Firebase console for errors |
| Can't find user document | Signup didn't create it | Verify TOW-7 implementation |

---

### Step 8: Add Polish and Edge Case Handling
**File**: `app/(auth)/role-selection.tsx`

**Learning Focus**: User experience refinements

**What to do**:
Add small improvements that make the experience smoother.

**Enhancements to Consider**:

1. **Haptic Feedback** (mobile devices):
```typescript
import * as Haptics from 'expo-haptics';

// In role card onPress:
onPress={() => {
  setSelectedRole('commuter');
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}}
```

2. **Animation on Selection** (optional, advanced):
```typescript
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Animate card scale when selected
// This is a "stretch goal" - only if time permits
```

3. **Clear Error on New Selection**:
```typescript
onPress={() => {
  setSelectedRole('commuter');
  setError(''); // Clear any previous errors
}}
```

4. **Prevent Double-Tap**:
The `disabled={loading}` on the button already handles this, but good to verify.

**Questions to Discuss**:
- Should we add a "skip for now" option? (NO - role is required)
- Should we explain what each role means in more detail? (Future: help/info icon)
- Should we allow changing role later? (Future story - profile settings)

---

## Edge Cases

### 1. User Closes App Before Selecting Role
**Scenario**: User signs up, reaches role selection, closes app

**Current Behavior**:
- User document exists in Firestore with `role: null`
- When they reopen app, they're signed in (Firebase persists session)
- But they haven't selected a role yet

**How to Handle**:
- **For this story**: Document as known limitation
- **Future solution** (not in this story): On app startup, check if `role === null`, redirect to role selection
- **Why not now?**: We haven't built the app initialization logic yet (that's a future story)

**Code Note for Future**:
```typescript
// In a future story (app startup check):
if (user && user.role === null) {
  router.replace('/role-selection');
}
```

### 2. Network Failure During Role Update
**Scenario**: User selects role, taps continue, but network fails

**How to Handle**:
- Firestore SDK retries automatically (with exponential backoff)
- If it fails after retries, our catch block shows error
- User can tap "Continue" again to retry
- Selection state is preserved (they don't have to re-select)

**Code Pattern** (already implemented):
```typescript
catch (error: any) {
  setError(error.message);  // Shows error
}
finally {
  setLoading(false);  // Re-enables button for retry
}
```

**User Experience**:
- Sees "Failed to save your role. Please try again."
- Button becomes enabled again
- Taps continue to retry
- Selection is still highlighted

### 3. Firebase Session Expired During Selection
**Scenario**: User takes 1+ hour on role selection screen, session expires

**How to Handle**:
We check `auth.currentUser` before saving:
```typescript
if (!currentUser) {
  setError('Session expired. Please sign up again.');
  return;
}
```

**User Experience**:
- Sees clear message about session expiration
- Can close app and sign up again (or login in future stories)

**Likelihood**: Very rare - user would have to leave app open for hours without touching it

### 4. Navigating Directly to Role Selection (URL Manipulation)
**Scenario**: On web, user types `/role-selection` directly in browser

**How to Handle**:
Our check for `auth.currentUser` catches this:
```typescript
if (!currentUser) {
  setError('Session expired. Please sign up again.');
  return;
}
```

**Better Future Solution** (not in this story):
Add a route guard that checks authentication before rendering screen:
```typescript
// In a future auth guard:
if (!auth.currentUser) {
  router.replace('/signup');
}
```

### 5. User Presses Device Back Button
**Scenario**: On Android, user presses back button from role selection screen

**Current Behavior**:
- Returns to signup screen
- They're still signed in (Firebase session persists)
- If they sign up again with same email, they'll get "email already in use" error

**How to Handle**:
- **For this story**: Leave as is - edge case is acceptable
- **Future solution**: Use `router.replace()` instead of `push()` in signup.tsx
- Or: Disable back button on role selection screen (not great UX)

**Best Solution** (future story):
Detect if user is already signed in when they hit signup screen, redirect to appropriate location.

---

## Testing Strategy

### Pre-Testing Checklist
- [ ] Firebase connection is working
- [ ] TOW-7 signup flow is working correctly
- [ ] Can create new Firebase Auth accounts
- [ ] Can view Firestore database in console

### Manual Testing Checklist

**Role Selection Screen**:
- [ ] Screen renders without errors
- [ ] Title and subtitle are visible and clear
- [ ] Both role options (commuter and driver) are displayed
- [ ] Cards are properly styled and aligned
- [ ] Emojis display correctly (👤 and 🚛)

**Interaction Testing**:
- [ ] Tapping "Commuter" card highlights it
- [ ] Tapping "Driver" card highlights it
- [ ] Only one card can be highlighted at a time (mutual exclusion)
- [ ] Checkmark appears on selected card
- [ ] Highlighted card changes background color and border
- [ ] Continue button is gray/disabled when nothing selected
- [ ] Continue button becomes blue/enabled when role selected
- [ ] Button shows "Saving..." text while loading

**Navigation Testing**:
- [ ] Signup flow navigates to role selection automatically
- [ ] Navigation happens after successful account creation
- [ ] Role selection screen appears in auth stack
- [ ] Screen uses full screen (no header shown)

**Data Persistence Testing**:
- [ ] Selecting commuter and tapping continue saves `role: 'commuter'` to Firestore
- [ ] Selecting driver and tapping continue saves `role: 'driver'` to Firestore
- [ ] Role field is updated in existing user document
- [ ] Other fields (email, createdAt) remain unchanged
- [ ] Role update happens in less than 2 seconds

**Error Handling Testing**:
- [ ] Error message displays if Firestore update fails
- [ ] Error message is clear and user-friendly
- [ ] Button re-enables after error for retry
- [ ] Selection remains highlighted after error
- [ ] Network error shows appropriate message

**Edge Cases**:
- [ ] Tapping continue without selection shows validation error
- [ ] Session expiration shows appropriate error
- [ ] Multiple rapid taps on continue don't cause issues (loading state prevents)
- [ ] Works correctly on both iOS and Android

### Code Quality Checklist

- [ ] TypeScript shows no errors
- [ ] All imports use absolute paths (`@/...`)
- [ ] No use of `any` type except in error handlers
- [ ] Component has proper default export
- [ ] Styles are in StyleSheet, not inline
- [ ] Loading states prevent race conditions
- [ ] Error messages are user-friendly
- [ ] Console logs are for development only (not user-facing)
- [ ] Code follows existing project patterns

### Firebase Verification Checklist

1. **Before Testing**:
   - [ ] Note a test email you'll use
   - [ ] Open Firebase Console in browser

2. **During Testing**:
   - [ ] After signup, verify new user in Authentication tab
   - [ ] Verify user document created in Firestore with `role: null`
   - [ ] After role selection, verify `role` field updated
   - [ ] Verify timestamp fields remain unchanged

3. **After Testing**:
   - [ ] Clean up test accounts if needed
   - [ ] Verify no duplicate documents created

---

## Success Metrics

**How do we know this story is complete?**

### Functional Success
1. A new user can complete the full flow: signup → role selection → role saved
2. The role is correctly stored in Firestore
3. Both "commuter" and "driver" roles work correctly
4. User cannot proceed without making a selection
5. Error handling covers all identified edge cases

### Code Quality Success
1. TypeScript types are correct and enforced
2. Code is clean, readable, and follows project patterns
3. No memory leaks or performance issues
4. Loading states prevent double-submission
5. Error messages are clear and actionable

### Learning Success
The student understands:
1. How to update existing Firestore documents with `updateDoc()`
2. The difference between `setDoc()` and `updateDoc()`
3. How to implement selection UI with React state
4. How to navigate between screens in Expo Router
5. How to handle async operations with proper error handling
6. Why TypeScript literal unions are useful for enum-like values
7. The importance of loading states in preventing race conditions

---

## Integration with TOW-7

This story directly builds on TOW-7. Here's how they connect:

### From TOW-7 (Signup)
- Creates user in Firebase Auth
- Creates Firestore document with `role: null`
- Returns user ID and email
- Leaves user signed in (session persists)

### In TOW-8 (Role Selection)
- Uses existing Firebase session to get user ID
- Updates the Firestore document's `role` field
- Prepares for role-based navigation (future stories)

### Key Integration Point
In `signup.tsx`, we added this line:
```typescript
router.push('/role-selection');
```

This is the "handoff" between stories. The signup flow completes, then immediately transfers to role selection.

### Data Flow
```
signup.tsx → signUpWithEmail() → Firebase Auth creates user
                                → Firestore creates document {role: null}
                                → Returns userId

signup.tsx → router.push('/role-selection')

role-selection.tsx → User selects role
                   → updateUserRole(userId, role)
                   → Firestore updates document {role: 'commuter'}
                   → Navigation to home (future)
```

---

## Security Considerations

### Authentication State
- We rely on `auth.currentUser` to get the user ID
- This is secure because Firebase Auth manages the session
- Only the authenticated user can update their own role

### Firestore Security Rules (Future Story)
Currently, Firestore rules are in test mode (anyone can read/write). In a future story, we'll add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only update their own document
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures users can only modify their own role, not others.

### Role Validation
- TypeScript enforces role values at compile time
- Only `'commuter'` or `'driver'` can be passed to `updateUserRole()`
- Firestore doesn't enforce this (it accepts any string)
- Future enhancement: Add validation Cloud Function

### No Sensitive Data
- Role selection doesn't involve passwords or payment info
- It's just a preference setting
- Low security risk

---

## Dependencies

### Required (Already Complete)
- ✅ TOW-7: User signup creates Firebase Auth account and Firestore document
- ✅ Firebase configured and working
- ✅ Expo Router set up with auth routes
- ✅ TypeScript User interface includes `role` field

### Optional (Nice to Have)
- Expo Haptics: For tactile feedback on selection (optional polish)
- Animation library: For smooth transitions (not required)

### Blocked By
This story blocks several future stories:
- **TOW-9**: Login flow (needs to check role after login)
- **TOW-10**: Commuter home screen (needs to filter by role)
- **TOW-11**: Driver home screen (needs to filter by role)
- **Role-based routing**: App navigation depends on user role

---

## Future Enhancements (Not in This Story)

These are ideas for future improvements, but NOT part of TOW-8:

1. **Change Role Later**
   - Add setting in user profile to switch roles
   - Story: "User Profile Management"

2. **Support for "Both" Role**
   - Some users might be both commuter and driver
   - More complex - separate story

3. **Role Description Popups**
   - Info icon that explains what each role means
   - Nice UX enhancement

4. **Animated Transitions**
   - Smooth animation when selecting/deselecting cards
   - Polish story

5. **Onboarding Tutorial**
   - After role selection, show tips for new users
   - Separate feature

6. **Role Verification for Drivers**
   - Drivers might need to verify credentials before activating
   - Major feature, separate epic

---

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Using setDoc() Instead of updateDoc()
**Problem**: `setDoc()` overwrites the entire document, losing email and createdAt

**Solution**:
```typescript
// ❌ WRONG - Overwrites everything
await setDoc(doc(db, 'users', userId), { role: 'commuter' });

// ✅ CORRECT - Updates only role field
await updateDoc(doc(db, 'users', userId), { role: 'commuter' });
```

### Pitfall 2: Not Handling null State for Selection
**Problem**: TypeScript allows `null` but we forget to handle it

**Solution**: Always check before proceeding:
```typescript
if (!selectedRole) {
  setError('Please select a role');
  return;
}
```

### Pitfall 3: Navigation Before Save Completes
**Problem**: Navigating to next screen before Firestore update finishes

**Solution**: Always `await` the save operation:
```typescript
await updateUserRole(currentUser.uid, selectedRole);
// Only navigate after this completes
router.push('/home');
```

### Pitfall 4: Forgetting to Get User ID
**Problem**: Not realizing user ID is available from `auth.currentUser`

**Solution**: Remember that signup leaves user signed in:
```typescript
const currentUser = auth.currentUser;
if (currentUser) {
  // Use currentUser.uid
}
```

### Pitfall 5: Not Disabling Button During Loading
**Problem**: User can tap "Continue" multiple times

**Solution**: Disable button and show loading state:
```typescript
disabled={!selectedRole || loading}
```

### Pitfall 6: Complex Conditional Styles
**Problem**: Messy style logic is hard to read

**Solution**: Use array syntax for clarity:
```typescript
style={[
  styles.baseStyle,
  condition && styles.conditionalStyle
]}
```

---

## Acceptance Criteria Checklist

Reference from Jira story:

- [ ] Role selection screen appears after email/password signup
  - [ ] Navigation triggered automatically after signup success
  - [ ] Screen is part of auth route group

- [ ] Two clear options: "I need a tow" (Commuter) or "I'm a tow truck driver" (Driver)
  - [ ] Commuter card displays with 👤 emoji and description
  - [ ] Driver card displays with 🚛 emoji and description
  - [ ] Both cards are properly styled and aligned

- [ ] Role is saved to user document in Firestore: `role: 'commuter' | 'driver'`
  - [ ] `updateUserRole()` function implemented
  - [ ] Function uses `updateDoc()` to preserve other fields
  - [ ] Role value is correctly typed in TypeScript
  - [ ] Firestore document updated successfully

- [ ] User cannot proceed without selecting a role
  - [ ] Continue button disabled when no selection
  - [ ] Button enabled only when role selected
  - [ ] Validation error if user somehow bypasses (shouldn't be possible)

- [ ] UI is clear and visually distinct between options
  - [ ] Selected card has different background color
  - [ ] Selected card has different border color
  - [ ] Checkmark appears on selected card
  - [ ] Only one card can be selected at a time
  - [ ] Visual feedback is immediate (no lag)

---

## Resources for Learning

### Firebase Documentation
- Firestore Update: https://firebase.google.com/docs/firestore/manage-data/add-data#update-data
- Auth Current User: https://firebase.google.com/docs/auth/web/manage-users#get_the_currently_signed-in_user
- Firestore Data Types: https://firebase.google.com/docs/firestore/manage-data/data-types

### React Native Documentation
- Pressable: https://reactnative.dev/docs/pressable
- Conditional Rendering: https://react.dev/learn/conditional-rendering
- State Management: https://react.dev/learn/state-a-components-memory

### Expo Router Documentation
- Navigation: https://docs.expo.dev/router/navigating-pages/
- useRouter hook: https://docs.expo.dev/router/reference/hooks/#userouter

### TypeScript Documentation
- Literal Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types
- Union Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types

---

## Questions to Discuss with Coach

Before implementing, discuss with code-coach:

1. Should we use `router.push()` or `router.replace()` for navigation from signup? (Affects back button behavior)

2. Do we want to add animations when selecting roles? (Nice to have, but adds complexity)

3. Should we implement the "both" role option now, or defer to future story? (Current spec is commuter OR driver)

4. What should happen after role is saved? (For now, just console.log - navigation comes in future stories)

5. Should we add a loading spinner, or is "Saving..." text enough?

6. Do we need to update the TypeScript User interface, or is it already correct? (Check if `role` can be null)

---

## Next Steps After Completion

Once TOW-8 is complete and tested:

1. **Git Commit**:
   ```bash
   git add .
   git commit -m "feat: implement role selection during signup (TOW-8)"
   git push
   ```

2. **Update Jira**:
   - Move TOW-8 to "Done" in Jira board
   - Add comment with any notes or learnings

3. **Update Current Story File**:
   ```bash
   # Update .claude/context/current-story.md to next story
   ```

4. **Invoke Next Agent**:
   - Use `project-manager` agent to determine next story
   - Likely TOW-9 (User Login) or TOW-10 (Commuter Home Screen)

5. **Code Review** (Optional):
   - Use `quality-reviewer` agent to review implementation
   - Address any feedback before moving on

---

## Technical Debt and Known Limitations

### For This Story
1. **No role change capability**: Users can't change their role after selection
   - **When to fix**: Profile management story (future)

2. **No "both" role option**: Some users might need both interfaces
   - **When to fix**: Role management enhancement (future)

3. **No navigation after role selection**: Just logs success
   - **When to fix**: Home screen stories (TOW-10, TOW-11)

4. **No route guard**: Users with null role can navigate away
   - **When to fix**: App initialization story (future)

5. **Firestore rules still in test mode**: Anyone can write
   - **When to fix**: Security rules story (Phase 3)

### Intentional Simplifications
- Single selection only (not toggleable)
- No role descriptions or help text
- No confirmation dialog ("Are you sure?")
- No haptic feedback (can add as polish)
- No animations (can add as polish)

---

_This specification was created by the `technical-architect` agent._
_Ready for `code-coach` agent to guide implementation._
_Last updated: January 30, 2026_
