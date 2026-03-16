---
phase: 1
slug: companies-admin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — manual smoke tests (no test runner configured in project) |
| **Config file** | none |
| **Quick run command** | `npx expo start` + manual verification on simulator |
| **Full suite command** | `npm run lint && npx expo start` |
| **Estimated runtime** | ~30 seconds (lint) + manual flow verification |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` to catch TypeScript/ESLint errors
- **After every plan wave:** Run full manual smoke test per Manual-Only Verifications table
- **Before `/gsd:verify-work`:** All manual flows must pass on iOS/Android simulator
- **Max feedback latency:** 60 seconds (lint is immediate; manual steps follow)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Auth extension | 01 | 1 | AUTH-01 | lint + manual | `npm run lint` | ✅ existing | ⬜ pending |
| Company Firestore functions | 01 | 1 | COMP-01 | lint + manual | `npm run lint` | ✅ existing | ⬜ pending |
| Company registration screen | 01 | 2 | COMP-01 | manual | n/a | ❌ W0 | ⬜ pending |
| Driver pre-auth + signup | 01 | 2 | COMP-02, AUTH-01 | manual | n/a | ❌ W0 | ⬜ pending |
| Admin route group + layout | 01 | 2 | COMP-04 | lint + manual | `npm run lint` | ❌ W0 | ⬜ pending |
| Admin dashboard (Jobs tab) | 01 | 3 | COMP-04, COMP-05 | manual | n/a | ❌ W0 | ⬜ pending |
| Admin dashboard (Drivers tab) | 01 | 3 | COMP-03, COMP-04 | manual | n/a | ❌ W0 | ⬜ pending |
| Driver deactivation | 01 | 3 | COMP-03 | manual | n/a | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/(admin)/_layout.tsx` — admin route group shell (lint validates routing)
- [ ] `app/(admin)/index.tsx` — stub screen so Expo Router does not crash on redirect
- [ ] `services/firebase/companies.ts` — stubs for COMP-01 through COMP-05 functions

*Existing `npm run lint` covers TypeScript type errors and import resolution. No additional test framework needed for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin seeded in Firestore routes to (admin) group | AUTH-01 | Requires Firebase console setup + live Auth | 1. Seed user doc with role='admin' + companyId in console. 2. Log in. 3. Confirm redirect lands on admin dashboard, not commuter/driver screen. |
| Company registration persists to Firestore | COMP-01 | Firestore write + geocode API call | 1. Open registration form. 2. Enter company name, address, radius. 3. Submit. 4. Open Firebase console → verify `companies/{id}` doc with correct fields incl. geohash. |
| Driver with authorized email signs up and is linked | COMP-02 | Requires two accounts + Firebase Auth flow | 1. Add test email to `companies/{id}.authorizedEmails`. 2. Sign up with that email as driver. 3. Verify user doc has role='driver' + correct companyId. |
| Driver with unauthorized email is blocked | COMP-02 | Negative path — requires live Auth call | 1. Sign up with email NOT in any authorizedEmails. 2. Confirm error: "This email isn't registered with a tow yard. Contact your company admin." |
| Swipe-to-deactivate sets isActive=false | COMP-03 | Gesture interaction + Firestore write | 1. Open Drivers tab. 2. Swipe left on driver row. 3. Tap "Deactivate". 4. Confirm driver badge changes and isActive=false in Firestore. |
| Admin Jobs tab updates in real-time | COMP-04, COMP-05 | Requires live Firestore listener + second device/emulator | 1. Open admin dashboard Jobs tab. 2. From another session, create a new service request. 3. Confirm new request appears on Jobs tab without refresh. |
| Driver online/offline badge reflects availability | COMP-04 | Requires two sessions | 1. Open Drivers tab. 2. Toggle driver availability from driver session. 3. Confirm badge updates live on admin screen. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
