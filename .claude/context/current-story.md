# Current Story: TOW-74

## Story Details
- **ID**: TOW-74
- **Title**: FE Sprint 3A - Commuter Account Setup Screen
- **Epic**: FE Sprint 3 - Account Setup Flow
- **Priority**: Medium
- **Sprint**: TOW Sprint 3 (active, ends 2026-03-11)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-74

## Description

Build the commuter profile setup screen that appears **after** the signup + role selection flow, before the commuter first lands on their home screen. This is a **pure frontend story** — the Firestore write patterns already exist in the codebase; the goal is to match the Figma design exactly.

This screen collects the commuter's personal details (name, phone number) to complete their profile after account creation. Today, new commuter accounts land on the home screen with no name or phone on their Firestore document — this screen fills that gap.

**Where it fits in the flow:**

```
Onboarding → Role Selection → Signup → [THIS SCREEN] → Commuter Home
```

### Before Starting

**Step 1 — Screenshot Figma designs:** Take screenshots of the following screens from Figma and place them in `.claude/design/screens/commuter_account_setup/`.

Reference these PNGs side-by-side with the simulator as you build, exactly like you did with the onboarding screens.

**Step 2 — Review the existing data model before coding:**

- `types/models.ts` — The `User` interface has `name?: string` and `phone?: string` optional fields already defined. These are what this screen writes to.
- `services/firebase/authService.ts` — Look at how `updateUserRole()` uses `updateDoc()` to write to Firestore. The profile save will follow the exact same pattern.
- `app/(auth)/onboarding/role-selection.tsx` — This is the screen that navigates TO this new screen. You will add a navigation call here when role is `'commuter'`.

## Acceptance Criteria

- [ ] **Screen layout matches Figma**
- [ ] **Form validation** — name and phone fields validated before save
- [ ] **Save to Firestore** — writes `name` and `phone` to the authenticated user's Firestore document
- [ ] **Navigation** — on successful save, navigates to Commuter Home
- [ ] **Wired into the existing flow** — role-selection.tsx navigates to this screen for the commuter path
- [ ] No TypeScript errors
- [ ] No console errors during normal use

## Out of Scope

- Profile photo upload
- Address or location fields
- Editing the profile after setup (that is a separate settings story)

## Key Files to Reference

- **Data model:** `types/models.ts` — `User` interface (`name`, `phone` fields)
- **Write pattern:** `services/firebase/authService.ts` — `updateUserRole()` function
- **Navigation pattern:** `app/(auth)/onboarding/role-selection.tsx` — how `router.replace()` is used
- **Screen to modify:** `app/(auth)/onboarding/role-selection.tsx` — add navigation to this new screen for commuter path
- **Architecture:** `.claude/docs/ARCHITECTURE.md`
- **Patterns:** `.claude/docs/PATTERNS.md`
- **Design files:** `.claude/design/screens/commuter_account_setup/`

## Suggested File to Create

```
app/
  (auth)/
    onboarding/
      commuter-setup.tsx     <- CREATE THIS FILE
```

## Dependencies

- **Blocks**: TOW-75 — FE Sprint 3B: Driver Account Setup Screen (that story cannot begin until this one is complete)
- Depends on `types/models.ts` `User` interface already having `name` and `phone` optional fields
- Depends on `services/firebase/authService.ts` `updateUserRole()` write pattern
- Depends on `app/(auth)/onboarding/role-selection.tsx` navigation structure

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation spec at `.claude/specs/TOW-74.md`.
