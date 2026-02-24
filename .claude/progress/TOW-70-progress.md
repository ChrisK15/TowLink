# Implementation Progress: TOW-70

## Story
Trip State Machine & Progress Tracking

## Completed Steps
- [x] Step 1: Add `startedAt?: Date` to the `Trip` interface in `types/models.ts`
- [x] Step 2: Add `in_progress` branch with `startedAt` timestamp in `firestore.ts`
- [x] Step 3: Add `isUpdating` state and guard to `handleStatusUpdate` in `ActiveTripSheet.tsx`
- [x] Step 4: Update action button — add `disabled`, `ActivityIndicator`, and disabled style
- [x] Step 5: Add `subtitle` prop to `ProgressStep` component with subtitle text and styles
- [x] Step 6: Replace dot with `Ionicons` checkmark icon when `done === true`
- [x] Step 7: Animate checkmark with `Animated.spring` scale when `done` transitions to true
- [x] Step 8: Refactor three `ProgressStep` calls to use a mapped `steps` array with real subtitles
- [x] Step 9: Manual end-to-end test of the full driver flow — PASSED

## Bug Fix (post-review)
- [x] Added `useEffect(() => setIsUpdating(false), [trip?.status])` to reset loading state after successful Firestore write (infinite spinner bug)

## Warning Fixes (post-review)
- [x] `startedAt: data.startedAt?.toDate()` added to `listenToTrip` snapshot mapper in `firestore.ts`
- [x] Subtitle fallback `?? ''` added to `pickupAddress` and `dropoffAddress` in steps array
- [x] Step label casing corrected: `'Drive to pickup location'`, `'Provide service'`, `'Complete drop-off'`
- [x] `labelActive` style added to `stepStyles` and applied when `active === true`
- [x] `stepStyles.row` `alignItems` changed from `'center'` to `'flex-start'`

## Current Step
_(all steps complete)_

## What to Learn Per Step

**Step 1 — TypeScript optional fields**
Adding `startedAt?: Date` teaches the `?` optional field pattern and why
recording timestamps for every state transition matters for analytics and debugging.

**Step 2 — Firestore conditional writes**
The pattern of branching on `status` to write different timestamps is already
in place for `arrived` and `completed`. This step mirrors that pattern for
`in_progress`. Key concept: `Timestamp.now()` vs `new Date()` in Firestore context.

**Step 3 — Async UI guard pattern**
"Optimistic disable, re-enable on error only" is a professional pattern for
action buttons in sequential workflows. NOT calling `setIsUpdating(false)` on
success is intentional — the Firestore listener re-renders the button with a
new label, which is the natural re-enable mechanism.

**Step 4 — Loading state in buttons**
`disabled` prop on `TouchableOpacity`, conditional rendering with ternary (`? :`),
and `ActivityIndicator` from `react-native`. How to apply a disabled style
(opacity) that communicates the loading state visually.

**Step 5 — Component prop evolution**
How a component's interface grows as requirements do. Adding a `subtitle` prop
to `ProgressStep` and displaying it below the label with a vertical `View` layout.
Also: why `alignItems: 'flex-start'` is needed once there are two lines of text.

**Step 6 — @expo/vector-icons**
`Ionicons` is already installed — no npm install needed. Conditional rendering
to swap the dot `View` for a `checkmark-circle` icon when `done === true`.

**Step 7 — React Native Animated API**
`useRef` for stable `Animated.Value` across re-renders. `useEffect` with a
`[done]` dependency to react to prop changes. `Animated.spring` with
`useNativeDriver: true` — safe for transform (scale) but NOT for layout
properties (height, width). Initial value of `done ? 1 : 0` handles mid-trip
app resume correctly.

**Step 8 — Data-driven rendering**
Deriving a `steps` array at render time from the `trip` prop, then using `.map()`
to render the list. Cleaner than three nearly-identical JSX blocks. Introduces
the `key` prop requirement for lists.

**Step 9 — Manual QA**
End-to-end testing: full driver flow, double-tap prevention, error handling
(delete trip mid-flow), Firebase Console verification of `startedAt` timestamp.

## Notes

- `arrivalTime` and `completionTime` field names are kept as-is to avoid a
  breaking Firestore migration mid-sprint. Only `startedAt` is being added new.
- The `listenToTrip` function in `firestore.ts` will need `startedAt` mapped
  when Step 2 is done — check whether `.toDate()` conversion is needed (it is,
  since Firestore returns a Timestamp object).
- `@expo/vector-icons` is already a dependency — no install needed.
- All required React APIs (`useRef`, `useEffect`, `useState`, `Animated`,
  `ActivityIndicator`) are already available in the project.
