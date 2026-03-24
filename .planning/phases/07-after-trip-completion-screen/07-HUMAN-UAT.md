---
status: partial
phase: 07-after-trip-completion-screen
source: [07-VERIFICATION.md]
started: 2026-03-24T22:35:00Z
updated: 2026-03-24T22:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Driver completion overlay — live emulator
expected: Full-screen white overlay with animated checkmark, "Job Complete!" heading, "Customer: [commuter name]", 4-row summary card (Estimated Fare, Pickup, Dropoff, Duration), and blue Done button.
result: [pending]

### 2. Commuter completion overlay — live emulator
expected: Full-screen overlay with "Trip Complete!" heading, "Driver: [driver name]", same 4-row summary card, and Done button.
result: [pending]

### 3. Done button — driver idle state restoration
expected: Overlay dismisses, online toggle visible, activeTripId cleared, Firestore drivers/{uid}.isAvailable set to true.
result: [pending]

### 4. Done button — commuter idle state restoration
expected: Overlay dismisses, "Request Roadside Assistance" button visible, activeTripId and activeRequestId cleared.
result: [pending]

### 5. Cancelled trip — no overlay
expected: Cancel a trip during en_route. Neither driver nor commuter sees the completion overlay; both return to idle immediately.
result: [pending]

### 6. Back gesture / Android hardware back button
expected: Back gesture dismisses overlay with same cleanup as Done button (activeTripId cleared, driver availability restored).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
