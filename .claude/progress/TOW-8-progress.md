# Implementation Progress: TOW-8

**Story**: US-1.2: Role Selection During Signup
**Started**: January 30, 2026
**Status**: In Progress

---

## Learning Objectives for This Story

By the end of this implementation, you will understand:
1. How to update existing Firestore documents with `updateDoc()` (vs. creating with `setDoc()`)
2. How to build selection UI with React state and conditional styling
3. How to navigate between screens programmatically in Expo Router
4. How to handle async operations with proper error handling
5. Why TypeScript literal unions (`'commuter' | 'driver'`) are useful for type safety
6. How to prevent race conditions with loading states

---

## Implementation Steps

### Step 1: Create the updateUserRole() Service Function
**File**: `services/firebase/authService.ts`
**Status**: [ ] Not Started
**Learning Focus**: Firestore document updates, error handling

**What you'll learn:**
- The difference between `setDoc()` (overwrites entire document) and `updateDoc()` (updates specific fields)
- How to create a document reference with `doc(db, 'users', userId)`
- How to handle Firestore errors and translate them to user-friendly messages
- Why we return `Promise<void>` (function doesn't return data, just succeeds or fails)

**Checkpoint Questions:**
- What would happen if we used `setDoc()` instead of `updateDoc()`?
- Why do we need to pass `userId` as a parameter?
- What happens if the user document doesn't exist?

---

### Step 2: Create the Role Selection Screen Structure
**File**: `app/(auth)/role-selection.tsx` (NEW FILE)
**Status**: [ ] Not Started
**Learning Focus**: Component structure, state management

**What you'll learn:**
- How to set up state for selection, loading, and errors
- TypeScript type annotation for state: `useState<'commuter' | 'driver' | null>(null)`
- How to use the `useRouter()` hook for navigation
- Basic screen layout structure

**Checkpoint Questions:**
- Why do we initialize selectedRole to `null` instead of an empty string?
- What are the three pieces of state we're managing, and why do we need each?
- How does TypeScript ensure we only set valid role values?

---

### Step 3: Build the Role Selection Cards
**File**: `app/(auth)/role-selection.tsx`
**Status**: [ ] Not Started
**Learning Focus**: Conditional styling, user interaction

**What you'll learn:**
- How to use array syntax for conditional styles: `[baseStyle, condition && selectedStyle]`
- How to handle press events with inline arrow functions
- Conditional rendering: `{condition && <Component />}`
- How to create visually distinct selected vs. unselected states

**Checkpoint Questions:**
- How does the `&&` operator work for conditional rendering?
- Why do we use `Pressable` instead of `TouchableOpacity`?
- What happens when a user taps a card that's already selected?

---

### Step 4: Implement the Continue Button with Validation
**File**: `app/(auth)/role-selection.tsx`
**Status**: [ ] Not Started
**Learning Focus**: Form validation, conditional button states

**What you'll learn:**
- How to disable a button based on state: `disabled={!selectedRole || loading}`
- How to show different text during loading states
- How to display error messages conditionally
- Visual feedback for disabled vs. enabled states

**Checkpoint Questions:**
- Why do we disable the button when `loading` is true?
- What prevents the user from proceeding without selecting a role?
- How does the error state get cleared when the user tries again?

---

### Step 5: Implement the Save and Navigate Logic
**File**: `app/(auth)/role-selection.tsx`
**Status**: [ ] Not Started
**Learning Focus**: Async operations, navigation, accessing current user

**What you'll learn:**
- How to get the current user's ID from `auth.currentUser`
- Why the user is already signed in after signup (Firebase persists session)
- How to handle async operations with try/catch/finally
- Guard clauses to prevent errors (checking for null values before proceeding)

**Checkpoint Questions:**
- Why is `auth.currentUser` available after signup?
- What would happen if we navigated before `await updateUserRole()` finished?
- Why do we check if `currentUser` exists before using it?

---

### Step 6: Update Signup Flow to Navigate to Role Selection
**File**: `app/(auth)/signup.tsx`
**Status**: [ ] Not Started
**Learning Focus**: Screen-to-screen navigation in Expo Router

**What you'll learn:**
- How to use `router.push()` for navigation
- File-based routing: how `/role-selection` maps to `app/(auth)/role-selection.tsx`
- The difference between `push()`, `replace()`, and `navigate()`
- How to maintain user flow through multiple screens

**Checkpoint Questions:**
- What's the difference between `router.push()` and `router.replace()`?
- When should we navigate (before or after the signup completes)?
- What happens if the navigation fails?

---

### Step 7: Test the Complete Flow End-to-End
**Status**: [ ] Not Started
**Learning Focus**: Manual testing, debugging navigation flows

**Testing Checklist:**
- [ ] Start the app and navigate to signup screen
- [ ] Create a new account with a fresh email
- [ ] Verify automatic navigation to role selection screen
- [ ] Test selecting "Commuter" - card highlights, checkmark appears
- [ ] Test selecting "Driver" - commuter unhighlights, driver highlights
- [ ] Verify continue button is disabled when nothing selected
- [ ] Verify continue button enables when role selected
- [ ] Tap continue and verify success
- [ ] Check Firestore console - verify role field is updated
- [ ] Test error case (temporarily break Firebase config)

**Firebase Verification:**
1. Go to: https://console.firebase.google.com/u/2/project/towlink-71a59/firestore
2. Navigate to `users` collection
3. Find document with your test user's ID
4. Verify `role` field shows `'commuter'` or `'driver'` (not `null`)

---

### Step 8: Add Polish and Edge Case Handling (Optional)
**File**: `app/(auth)/role-selection.tsx`
**Status**: [ ] Not Started
**Learning Focus**: User experience refinements

**Optional Enhancements:**
- [ ] Clear error message when user makes a new selection
- [ ] Add haptic feedback on selection (mobile only)
- [ ] Add animations for selection transitions (advanced)
- [ ] Test on both iOS and Android

---

## Completed Steps

(None yet - ready to start!)

---

## Current Step

**Next Action**: Step 1 - Create the `updateUserRole()` service function

---

## Remaining Steps

- [ ] Step 1: Create updateUserRole() function
- [ ] Step 2: Create role selection screen structure
- [ ] Step 3: Build role selection cards
- [ ] Step 4: Implement continue button with validation
- [ ] Step 5: Implement save and navigate logic
- [ ] Step 6: Update signup flow navigation
- [ ] Step 7: Test end-to-end flow
- [ ] Step 8: Add polish (optional)

---

## Notes and Questions

### Technical Decisions Made

(Document any decisions or deviations from the spec here)

### Challenges Encountered

(Document any issues you ran into and how you solved them)

### Questions to Ask Coach

(Write down any questions as you work through the steps)

---

## Acceptance Criteria Tracking

Reference from Jira story TOW-8:

- [ ] Role selection screen appears after email/password signup
- [ ] Two clear options: "I need a tow" (Commuter) or "I'm a tow truck driver" (Driver)
- [ ] Role is saved to user document in Firestore: `role: 'commuter' | 'driver'`
- [ ] User cannot proceed without selecting a role
- [ ] UI is clear and visually distinct between options

---

_Progress tracked by: code-coach agent_
_Last updated: January 30, 2026_
