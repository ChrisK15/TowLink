# Technical Specification: TOW-7

## Story Reference
**ID**: TOW-7
**Title**: US-1.1: User Sign Up with Email/Password
**Epic**: TOW-1 (User Authentication & Account Management)
**Priority**: CRITICAL
**Story Points**: 5
**Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-7

**User Story**:
As a new user, I want to create an account with email and password so that I can access the TowLink platform.

---

## Architecture Overview

This story implements the foundational authentication layer using Firebase Authentication. It creates the first user-facing screen (signup) and establishes patterns that will be reused throughout the authentication flow.

### High-Level Flow
```
User opens app → Sees signup screen → Enters credentials →
Firebase creates auth account → User document created in Firestore →
Success message displayed
```

### Key Architectural Decisions

1. **Separation of Concerns**: Business logic (Firebase operations) lives in `services/firebase/authService.ts`, UI lives in `app/(auth)/signup.tsx`
2. **TypeScript First**: All functions and components are fully typed for safety
3. **Error Handling**: Firebase errors are caught and translated to user-friendly messages
4. **Consistent Patterns**: This service establishes patterns for all future Firebase operations

---

## Technical Requirements

### Frontend Components

**New Screen to Create**:
- `app/(auth)/signup.tsx` - Signup form screen

**New Service Layer**:
- `services/firebase/authService.ts` - Authentication business logic

**Navigation Updates**:
- Update `app/_layout.tsx` to add `(auth)` route group

**State Management**:
- Local component state for:
  - Email input value
  - Password input value
  - Confirm password input value
  - Loading state (while signup is in progress)
  - Error messages (for validation and Firebase errors)

### Backend (Firebase)

**Firebase Authentication**:
- Uses `createUserWithEmailAndPassword()` from Firebase Auth
- Already configured in `services/firebase/config.ts` with React Native persistence

**Firestore Structure**:
```javascript
/users/{userId}
{
  id: string,           // Firebase Auth UID
  email: string,        // User's email
  createdAt: Timestamp, // Account creation time
  role: null            // Will be set in TOW-8, for now leave as null
}
```

**Why this structure?**
- `id` matches Firebase Auth UID for easy lookup
- `email` stored for profile display without extra Auth API calls
- `createdAt` for analytics and account management
- `role` placeholder for TOW-8 (role selection during signup)

---

## Learning Objectives

This story teaches several important React Native and Firebase concepts:

1. **Firebase Authentication**: How to create user accounts programmatically
2. **Form Validation**: Client-side validation before sending to server
3. **Async Operations**: Handling promises and loading states in React
4. **Error Handling**: Catching Firebase errors and showing user-friendly messages
5. **Service Layer Pattern**: Separating business logic from UI components
6. **TypeScript Typing**: Creating properly typed service functions
7. **React Hooks**: Using `useState` for form state management
8. **Expo Router**: Adding new route groups for authentication screens

---

## Implementation Steps

### Step 1: Create the Authentication Service
**File**: `services/firebase/authService.ts` (NEW)

**Learning Focus**: Service layer pattern, Firebase Auth API, TypeScript typing

**What to do**:
1. Create the new file
2. Import Firebase Auth functions
3. Create a `signUpWithEmail` function
4. Create a helper function to create the user document in Firestore

**Code Structure Pattern**:
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ userId: string; email: string }> {
  // Step 1: Create Firebase Auth account
  // Step 2: Create user document in Firestore
  // Step 3: Return user info
}
```

**Key Concepts**:
- Why `async/await`? Firebase operations take time (network calls)
- Why return an object? We need the userId for future operations
- Error handling: Firebase throws errors we need to catch

**Questions to Consider**:
- What happens if the email is already in use?
- What if the password is too weak?
- How do we ensure the Firestore document is created even if there's a network hiccup?

---

### Step 2: Understand Firebase Auth Errors
**File**: Same file, add error handling

**Learning Focus**: Error handling, user experience

**What to do**:
Add a try-catch block to handle common Firebase errors:
- `auth/email-already-in-use` - Email taken
- `auth/weak-password` - Password too weak
- `auth/invalid-email` - Email format wrong
- Network errors

**Code Pattern**:
```typescript
try {
  // Firebase operations
} catch (error: any) {
  // Translate Firebase error codes to user-friendly messages
  if (error.code === 'auth/email-already-in-use') {
    throw new Error('This email is already registered');
  }
  // ... handle other errors
}
```

**Why This Matters**:
Firebase error codes are developer-friendly but not user-friendly. "auth/weak-password" should become "Password must be at least 8 characters".

---

### Step 3: Create the Signup Form UI
**File**: `app/(auth)/signup.tsx` (NEW)

**Learning Focus**: React Native forms, state management, user input

**What to do**:
1. Create a new folder `app/(auth)/`
2. Create `signup.tsx` inside it
3. Build a simple form with:
   - Email TextInput
   - Password TextInput
   - Confirm Password TextInput
   - Sign Up button
   - Error message display area

**Component Structure Pattern**:
```typescript
import { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';

export default function SignupScreen() {
  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form submission handler
  const handleSignup = async () => {
    // Validate inputs
    // Call authService
    // Handle success/error
  };

  return (
    // Form JSX
  );
}
```

**Key Concepts**:
- `useState`: Each input needs its own state
- `loading`: Prevents double-submission while signup is in progress
- `error`: Displays validation or Firebase errors to user

---

### Step 4: Implement Client-Side Validation
**File**: `app/(auth)/signup.tsx`

**Learning Focus**: Form validation, user experience

**What to do**:
Before calling Firebase, validate:
1. Email is not empty and has '@' character
2. Password is at least 8 characters
3. Password and confirmPassword match
4. All fields are filled

**Code Pattern**:
```typescript
const handleSignup = async () => {
  // Clear previous errors
  setError('');

  // Validation checks
  if (!email || !password || !confirmPassword) {
    setError('All fields are required');
    return;
  }

  if (!email.includes('@')) {
    setError('Please enter a valid email');
    return;
  }

  if (password.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  // If we get here, validation passed!
  // ... continue to Firebase signup
};
```

**Why Validate Client-Side?**
- Faster feedback to user (no network delay)
- Reduces unnecessary Firebase API calls
- Better user experience

**Questions to Consider**:
- Should we disable the button while loading?
- How do we give real-time feedback (like showing "passwords match" as they type)?
- What about email format validation beyond just checking for '@'?

---

### Step 5: Connect Form to Service Layer
**File**: `app/(auth)/signup.tsx`

**Learning Focus**: Calling async service functions, loading states

**What to do**:
1. Import the `signUpWithEmail` function from authService
2. Call it after validation passes
3. Set loading state during the operation
4. Handle success and error cases

**Code Pattern**:
```typescript
import { signUpWithEmail } from '@/services/firebase/authService';

const handleSignup = async () => {
  // ... validation code from Step 4 ...

  setLoading(true);

  try {
    const result = await signUpWithEmail(email, password);
    console.log('User created:', result.userId);
    // TODO: Navigate to next screen or show success message
  } catch (error: any) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**Key Concepts**:
- `try/catch`: Handles errors from the service layer
- `finally`: Always runs, perfect for resetting loading state
- `await`: Pauses execution until Firebase completes

**Why This Pattern?**
The UI component doesn't know or care about Firebase. It just calls a function and handles the result. This makes testing easier and keeps the UI focused on user interaction.

---

### Step 6: Style the Signup Form
**File**: `app/(auth)/signup.tsx`

**Learning Focus**: React Native styling, using theme constants

**What to do**:
1. Create a StyleSheet for the component
2. Use the existing `Colors` theme from `@/constants/theme`
3. Make inputs accessible and user-friendly
4. Add visual feedback for loading state

**Code Pattern**:
```typescript
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // ... component logic ...

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
        placeholder="Email"
        placeholderTextColor={theme.icon}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      {/* Error message */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Sign Up button */}
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0a7ea4',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 10,
    textAlign: 'center',
  },
});
```

**Key Styling Concepts**:
- `flex: 1`: Makes container fill the screen
- `justifyContent: 'center'`: Centers content vertically
- Dynamic colors: Uses theme for dark/light mode support
- Disabled state: Visual feedback when button is not interactive

---

### Step 7: Update Navigation to Include Auth Routes
**File**: `app/_layout.tsx`

**Learning Focus**: Expo Router file-based routing, route groups

**What to do**:
1. Add the `(auth)` route group to the Stack navigator
2. Configure it to hide the header
3. Set it to use a modal presentation style (feels more like an entry flow)

**Code Pattern**:
```typescript
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
```

**Why Route Groups?**
- `(auth)` - Groups all authentication screens together
- `(tabs)` - Groups all main app screens
- Parentheses mean the group name doesn't appear in the URL

---

### Step 8: Create an Auth Layout for Future Screens
**File**: `app/(auth)/_layout.tsx` (NEW)

**Learning Focus**: Nested layouts, shared configuration

**What to do**:
Create a layout specifically for auth screens that can be shared by signup, login, forgot password, etc.

**Code Pattern**:
```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="signup" />
      {/* Future auth screens will be added here */}
    </Stack>
  );
}
```

**Why a Separate Layout?**
- Keeps auth screens consistent
- Easy to add header/footer to all auth screens
- Separates authenticated vs unauthenticated parts of the app

---

### Step 9: Add User Type Definition Updates
**File**: `types/models.ts`

**Learning Focus**: TypeScript interfaces, maintaining data models

**What to do**:
Update the existing `User` interface to match our initial signup data structure:

**Code Pattern**:
```typescript
export interface User {
  id: string;           // Firebase Auth UID
  email: string;        // User's email
  name?: string;        // Optional - will be added later
  role: 'commuter' | 'driver' | 'both' | null;  // null until TOW-8
  phone?: string;       // Optional - will be added later
  createdAt: Date;      // When account was created
  rating?: number;      // Optional - starts undefined
}
```

**Why Make Changes?**
- The existing interface has all fields required
- During signup, we only have email and createdAt
- Making fields optional (`?`) allows partial user objects

**Key TypeScript Concept**:
- `?` means "this field might not exist"
- Helps prevent runtime errors when accessing user data

---

### Step 10: Test the Full Flow
**Learning Focus**: Manual testing, debugging, understanding the user experience

**What to do**:
1. Start the app: `npx expo start`
2. Navigate to the signup screen
3. Test all validation cases:
   - Empty fields
   - Invalid email
   - Short password
   - Mismatched passwords
4. Test successful signup
5. Check Firebase Console to verify:
   - User created in Authentication
   - Document created in Firestore
6. Test error cases:
   - Try signing up with same email again
   - Test with weak password

**How to Check Firebase**:
1. Go to https://console.firebase.google.com/u/2/project/towlink-71a59/overview
2. Click "Authentication" - see the new user
3. Click "Firestore Database" - see the `/users/{uid}` document

**Debugging Tips**:
- Use `console.log()` to see what data you're sending
- Check Metro bundler for error messages
- Look at Firebase Console for actual data
- Test on both iOS simulator and Android emulator if possible

---

## Edge Cases

### 1. User Closes App During Signup
**Scenario**: User taps signup button, then closes app before Firebase completes

**How to Handle**:
- Firebase Auth account might be created but Firestore document might not
- Solution: Add error handling in login flow (TOW-9) to create missing user documents
- For now: Document this as a known limitation

### 2. Network Failure During Signup
**Scenario**: User has poor internet, request times out

**How to Handle**:
- Firebase SDK handles retries automatically
- Show error message to user
- Don't clear the form so they can retry

**Code Pattern**:
```typescript
catch (error: any) {
  if (error.message.includes('network')) {
    setError('Network error. Please check your connection and try again.');
  } else {
    setError(error.message);
  }
}
```

### 3. Email Already in Use
**Scenario**: User tries to sign up with email they already used

**How to Handle**:
- Catch `auth/email-already-in-use` error
- Show helpful message: "This email is already registered. Would you like to login instead?"
- Future enhancement (not in this story): Add link to login screen

### 4. Weak Password Entered
**Scenario**: Firebase rejects password as too weak

**How to Handle**:
- Client-side validation catches most cases (8+ characters)
- Firebase might still reject it (e.g., "12345678" is 8 chars but weak)
- Show Firebase's error message, it's usually helpful

### 5. Special Characters in Email/Password
**Scenario**: User has unusual characters in credentials

**How to Handle**:
- Firebase handles this automatically
- Don't try to sanitize or validate beyond basic checks
- Let Firebase be the source of truth for what's valid

---

## Testing Strategy

### Manual Testing Checklist

**Before Starting**:
- [ ] Firebase project is set up correctly
- [ ] Firebase config is in `services/firebase/config.ts`
- [ ] App can connect to Firebase (test with existing POC screen)

**During Implementation**:
- [ ] TypeScript shows no errors
- [ ] App builds without errors: `npx expo start`
- [ ] Signup screen renders properly
- [ ] All TextInputs are accessible and working

**Validation Testing**:
- [ ] Empty email shows error
- [ ] Invalid email shows error
- [ ] Empty password shows error
- [ ] Short password (< 8 chars) shows error
- [ ] Mismatched passwords show error
- [ ] All validation messages are clear and helpful

**Firebase Integration Testing**:
- [ ] Valid signup creates user in Firebase Auth
- [ ] User document is created in Firestore at `/users/{uid}`
- [ ] User document has correct fields: `id`, `email`, `createdAt`, `role: null`
- [ ] Successful signup shows success message or navigates
- [ ] Loading state shows while signup is in progress
- [ ] Button is disabled during loading

**Error Handling Testing**:
- [ ] Duplicate email shows "already in use" error
- [ ] Network errors are caught and displayed
- [ ] Firebase errors are user-friendly
- [ ] Error messages clear when user starts typing again

**Cross-Platform Testing**:
- [ ] Works on iOS simulator
- [ ] Works on Android emulator
- [ ] (Bonus) Works on physical device

### Code Review Checklist

- [ ] All TypeScript types are correct
- [ ] No `any` types (except in error handlers)
- [ ] Async functions use proper error handling
- [ ] Loading states prevent double-submission
- [ ] No sensitive data logged to console
- [ ] Code follows existing patterns in the codebase
- [ ] Component is properly exported as default
- [ ] Imports use absolute paths with `@/` prefix

---

## Security Considerations

### What We're Implementing
- Client-side password validation (minimum 8 characters)
- Firebase Authentication handles password hashing and storage
- Email verification (not in this story, but planned for later)

### What Firebase Handles for Us
- Password encryption in transit (HTTPS)
- Password hashing at rest (bcrypt-based)
- Rate limiting on signup attempts
- Protection against common attacks

### What We Need to Be Careful About
- Don't log passwords (even in development)
- Don't store passwords in state longer than necessary
- Don't display passwords in error messages
- Use TextInput `secureTextEntry={true}` for password fields

**Code Pattern for Password Fields**:
```typescript
<TextInput
  style={styles.input}
  placeholder="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={true}  // Hides password as user types
  autoCapitalize="none"
  autoComplete="password"
/>
```

---

## Dependencies

### Required
- Firebase already configured in `services/firebase/config.ts` ✅
- Firebase Auth already initialized with persistence ✅
- TypeScript types defined in `types/models.ts` ✅

### Optional (For Future Enhancement)
- Email verification (will be separate story)
- Password strength meter (nice to have)
- Social auth (Google, Apple) - separate stories

---

## Acceptance Criteria Checklist

Reference from Jira story:

- [ ] User can enter email, password, and confirm password
- [ ] Password must be at least 8 characters (validated client-side)
- [ ] Email validation checks for valid format (contains '@')
- [ ] Firebase Authentication creates user account using `createUserWithEmailAndPassword()`
- [ ] User document created in Firestore `users` collection with fields:
  - [ ] `id` (matches Firebase Auth UID)
  - [ ] `email`
  - [ ] `createdAt` (Timestamp)
  - [ ] `role: null` (placeholder for TOW-8)
- [ ] Error messages display for:
  - [ ] Email already in use
  - [ ] Weak password
  - [ ] Invalid email format
  - [ ] Empty required fields
  - [ ] Mismatched passwords
- [ ] Success message or auto-redirect after signup
- [ ] UI uses existing theme colors and styles
- [ ] Loading state prevents double-submission
- [ ] Button shows loading text while signup is in progress

---

## Success Metrics

**How do we know this story is complete?**

1. A new user can create an account without errors
2. The account appears in Firebase Console (Auth + Firestore)
3. All validation works as expected
4. Error handling covers all edge cases
5. Code is clean, typed, and follows project patterns
6. The student understands:
   - How Firebase Authentication works
   - The service layer pattern
   - Form validation in React Native
   - Async operations with loading states

---

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Forgetting to Handle Loading State
**Problem**: User taps "Sign Up" multiple times, creating duplicate accounts

**Solution**:
```typescript
const [loading, setLoading] = useState(false);
<Pressable disabled={loading} onPress={handleSignup}>
```

### Pitfall 2: Not Clearing Previous Errors
**Problem**: Old error messages stay on screen after user fixes the issue

**Solution**:
```typescript
const handleSignup = async () => {
  setError(''); // Clear previous errors first
  // ... rest of validation
}
```

### Pitfall 3: Showing Firebase Error Codes Directly
**Problem**: Users see "auth/email-already-in-use" which is confusing

**Solution**: Translate Firebase errors to plain English in the service layer

### Pitfall 4: Not Using Timestamp from Firestore
**Problem**: Using JavaScript `Date()` instead of Firestore `Timestamp`

**Solution**:
```typescript
import { Timestamp } from 'firebase/firestore';
createdAt: Timestamp.now()  // Not new Date()
```

**Why?** Firestore Timestamp works across different timezones and is stored efficiently in Firebase.

### Pitfall 5: Forgetting `async/await`
**Problem**: Code tries to use result before Firebase completes

**Solution**: Always mark functions that call Firebase as `async` and use `await`:
```typescript
const handleSignup = async () => {  // async here
  const result = await signUpWithEmail(email, password);  // await here
}
```

---

## Next Steps After Completion

Once TOW-7 is complete and tested:

1. **Git Commit**:
   ```bash
   git add .
   git commit -m "feat: implement user signup with email/password (TOW-7)"
   git push
   ```

2. **Update Jira**: Move TOW-7 to "Done" in Jira board

3. **Invoke Next Agent**:
   ```
   Use code-coach agent to begin implementing TOW-8 (Role Selection During Signup)
   ```

4. **Optional Enhancements** (If Time Permits):
   - Add "Already have an account? Login" link
   - Add password strength indicator
   - Add show/hide password toggle
   - Add email format validation beyond '@' check

---

## Resources for Learning

### Firebase Documentation
- Firebase Auth: https://firebase.google.com/docs/auth/web/start
- Create User: https://firebase.google.com/docs/auth/web/password-auth#create_a_password-based_account
- Firestore Write: https://firebase.google.com/docs/firestore/manage-data/add-data

### React Native Documentation
- TextInput: https://reactnative.dev/docs/textinput
- useState: https://react.dev/reference/react/useState
- Async/Await: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function

### Expo Router
- File-based routing: https://docs.expo.dev/router/introduction/
- Route groups: https://docs.expo.dev/router/advanced/router-settings/

---

## Questions to Discuss with Coach

Before implementing, discuss with code-coach:

1. Should we add email verification in this story or defer to later?
2. What should happen after successful signup? (Show message? Navigate? Auto-login?)
3. Should we add a "login" link at the bottom for users who already have accounts?
4. Do we want password requirements beyond 8 characters? (uppercase, numbers, symbols?)
5. Should we test on both iOS and Android, or is one sufficient for now?

---

_This specification was created by the `technical-architect` agent._
_Ready for `code-coach` agent to guide implementation._
_Last updated: January 27, 2026_
