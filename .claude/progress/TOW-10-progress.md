# TOW-10 Implementation Progress

**Story**: US-1.4 Role-Based Navigation Routing
**Spec**: `.claude/specs/TOW-10.md`
**Started**: 2026-02-03

---

## Steps

| # | Description | Status |
|---|---|---|
| 1 | Create `context/auth-context.tsx` — AuthContext provider + useAuth hook | ✅ Complete |
| 2 | Rewrite `app/_layout.tsx` — conditional routing via Redirect | ✅ Complete |
| 3 | Add `signOut` to `services/firebase/authService.ts` | ✅ Complete |
| 4 | Modify `login.tsx` and `role-selection.tsx` — remove manual navigation | ✅ Complete |
| 5 | Create `app/(commuter)/` route group (`_layout.tsx` + `index.tsx`) | ✅ Complete |
| 6 | Create `app/(driver)/` route group (`_layout.tsx` + `index.tsx`) | ✅ Complete |
| 7 | Delete `app/(tabs)/` directory | ✅ Complete |
| 8 | End-to-end mental walkthrough and verification | ✅ Complete |

---

## Notes

- Step 1: Student wrote `auth-context.tsx` from scratch with guidance. Covers `onAuthStateChanged` subscription, Firestore role fetch, `signOut`, and `refreshRole`.
- Step 2: Student rewrote `_layout.tsx`. Split into `RootLayout` (provider wrapper) and `RootLayoutNav` (routing logic). Handles loading spinner, auth redirects, role-based redirects. Needed coaching on: hooks rules (can't call inside if), useEffect vs render side effects, and the two-component split pattern.
- Step 3: Student added `signOut` to `authService.ts` and updated `auth-context.tsx` to import from the service layer instead of calling Firebase directly.
- Step 4: Student removed manual `router.replace` navigation from `login.tsx` and `role-selection.tsx`. Added `refreshRole()` call in role-selection after `updateUserRole`. Needed coaching on hooks rules again (useAuth called inside async function).
- Steps 5 & 6: Student created `(commuter)` and `(driver)` route groups. Each has a `_layout.tsx` (Tabs navigator with one Home screen) and `index.tsx` (content moved from `(tabs)`). Needed clarification on the difference between Tabs and Stack layout patterns.
- Step 7: Deleted `app/(tabs)/` directory.
- Step 8: Tested end-to-end. Discovered a bug: the original invalid-role useEffect + signOut fired during signup before role-selection could be reached (role is legitimately null for new users). Fixed by removing the useEffect/Alert/signOut and replacing the fallback redirect with `<Redirect href="/role-selection" />`. App confirmed working for signup flow.
