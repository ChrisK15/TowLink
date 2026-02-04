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
| 3 | Add `signOut` to `services/firebase/authService.ts` | ⏳ Pending |
| 4 | Modify `login.tsx` and `role-selection.tsx` — remove manual navigation | ⏳ Pending |
| 5 | Create `app/(commuter)/` route group (`_layout.tsx` + `index.tsx`) | ⏳ Pending |
| 6 | Create `app/(driver)/` route group (`_layout.tsx` + `index.tsx`) | ⏳ Pending |
| 7 | Delete `app/(tabs)/` directory | ⏳ Pending |
| 8 | End-to-end mental walkthrough and verification | ⏳ Pending |

---

## Notes

- Step 1: Student wrote `auth-context.tsx` from scratch with guidance. Covers `onAuthStateChanged` subscription, Firestore role fetch, `signOut`, and `refreshRole`.
- Step 2: Student rewrote `_layout.tsx`. Split into `RootLayout` (provider wrapper) and `RootLayoutNav` (routing logic). Handles loading spinner, auth redirects, role-based redirects, and invalid-role Alert + signOut via useEffect. Needed coaching on: hooks rules (can't call inside if), useEffect vs render side effects, and the two-component split pattern.
