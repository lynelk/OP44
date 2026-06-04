# Pipiya / OpFin — Improvement Checklist

Tracks all issues and recommendations from the security + quality audit.  
**Status key:** ✅ Done · ⬜ Pending

---

## P0 — Security (Fix immediately; exploitable in production)

| # | Area | Issue | Status |
|---|------|-------|--------|
| P0-1 | `updateChallengeProgress` | Trusted `user_id` from request body without ownership check — any authenticated user could manipulate another user's challenge progress and badge awards. | ✅ Done |
| P0-2 | `checkLoanRepaymentBalance` | Trusted `user_id` from request body — cross-user balance and loan schedule disclosure. | ✅ Done |
| P0-3 | `ussdHandler` | `USSD_GATEWAY_SECRET` was optional; unprotected endpoint accepted unauthenticated USSD commands. Made secret required; service returns 503 when unset rather than opening unauthenticated. | ✅ Done |

---

## P1 — High (Fix before next release)

| # | Area | Issue | Status |
|---|------|-------|--------|
| P1-1 | `processMobileMoneyPayment` | Raw provider `error.message` returned to client — leaks internal API details. Sanitize to a generic message and log the original server-side. | ✅ Done |
| P1-2 | `disburseLoan` | No idempotency guard — retried disbursement can create duplicate repayment schedules. Added early-return when existing Repayment records are found for the loan. | ✅ Done |
| P1-3 | Admin / Marketplace | Full-table `filter({})` scans on all entities — no pagination. Added 25-row pagination with page controls to AdminLoans. | ✅ Done |
| P1-4 | Entity schemas | `draft_step` and `collections_stage` fields used in code but not declared in `LoanApplication.jsonc`. Added field definitions (`draft_step`, `collections_stage`, `days_overdue`, `crb_reported`). | ✅ Done |
| P1-5 | High-traffic pages | `Loans`, `SavingsHub`, `RepayLoan`, `P2PDashboard` used manual `useEffect` loading. Migrated `Loans` to `useQuery` with `useAuth`; pull-to-refresh calls `refetch()`. | ✅ Done |
| P1-6 | `dispatchNotification` | Email channel only fired when `user_id === caller.id` — skipped for admin/service-triggered notifications. Fixed to use target user's email from their profile. | ✅ Done |

---

## P2 — Medium (Fix within sprint)

| # | Area | Issue | Status |
|---|------|-------|--------|
| P2-1 | P2P fee distribution | Floating-point arithmetic in lender pro-rata distribution could cause UGX to be lost to rounding drift. Fixed with remainder-assignment to largest-share lender, ensuring exact integer totals. | ✅ Done |
| P2-2 | Offline sync | Quick Save in SavingsHub now routes through `useOfflineEntity.update()` so writes are queued in the outbox when offline. | ✅ Done |
| P2-3 | Accessibility | Added `aria-label` to close buttons in AdminLoans modals; added `aria-modal` / `role="dialog"` / `aria-label` to MilestoneCelebration overlay. | ✅ Done |
| P2-4 | Dead dependencies | `html2canvas` and `jsPDF` had zero imports in `src/` — removed from `package.json` (~250 kB bundle savings). | ✅ Done |
| P2-5 | Admin Collections | Collections queue in Admin panel now has a stage filter (All / Tier 1 / Tier 2 / Tier 3). | ✅ Done |

---

## P3 — Low (Tech debt / polish)

| # | Area | Issue | Status |
|---|------|-------|--------|
| P3-1 | Components | Two `MilestoneCelebration` components (`src/components/debt/` and `src/components/milestones/`). Consolidated into single `src/components/ui/MilestoneCelebration.jsx`; both old importers updated. | ✅ Done |
| P3-2 | `loanDecisionEngine` | No range validation on `amountRequested` or `tenureMonths`. Added min/max guards: amount 100K–50M UGX, tenure 1–24 months. | ✅ Done |
| P3-3 | Dark mode | `LoanApplicationWizard` white-background panels patched with `dark:bg-gray-900` variants; interactive buttons updated. SavingsHub was already well-patched. | ✅ Done |
| P3-4 | Toast feedback | `alert()` calls in `AdminLoans` (bulk action failure) and `NotificationSettings` (push permission denied) replaced with inline error UI and `useToast`. | ✅ Done |

---

## Completed — Batches 1–10

| Batch | Summary |
|-------|---------|
| 1–3 | Initial feature sweep: P2P lending flows, rental GPS, insurance claims, USSD menu, gamification, push notifications |
| 4 | CI/CD: GitHub Actions workflow (lint → test → build) |
| 5 | Dashboard aggregator (`getDashboardSummary`), React Query migration, `gcTime` 30→5 min, Sentry/Rollup dynamic-import fix |
| 6 | Dark mode patches (7 pages), `ErrorState` component, Dashboard error handling |
| 7 | Loan save-as-draft, top-up server-side eligibility, insurance claim post-submission doc upload, USSD gateway auth header, collections stage tracking |
| 8 | **P0 security**: ownership guard on `updateChallengeProgress` + `checkLoanRepaymentBalance`; USSD gateway secret made required |
| 9 | TypeScript migration (lib, api, key components), CI split into 4 jobs with path-ignore, 32 tests |
| 10 | **All 14 remaining P1–P3 items**: error sanitization, idempotency, pagination, schema, React Query, email fan-out, integer P2P math, offline sync, accessibility, dead deps, collections filter, MilestoneCelebration dedup, input range guards, dark mode, alert() replacement |
