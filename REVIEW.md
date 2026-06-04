# Pipiya / OpFin — Improvement Checklist

Tracks all issues and recommendations from the security + quality audit.  
**Status key:** ✅ Done · 🔧 In Progress · ⬜ Pending

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
| P1-1 | `processMobileMoneyPayment` | Raw provider `error.message` returned to client — leaks internal API details. Sanitize to a generic message and log the original server-side. | ⬜ Pending |
| P1-2 | `disburseLoan` | No idempotency guard — retried disbursement can create duplicate repayment schedules. Add idempotency key check before schedule creation. | ⬜ Pending |
| P1-3 | Admin / Marketplace | Full-table `filter({})` scans on all entities — no pagination or server-side aggregation. Add server-side paginated aggregators; replace client-side `.filter()` loops. | ⬜ Pending |
| P1-4 | Entity schemas | `draft_step` and `collections_stage` fields used in code but not declared in `LoanApplication.jsonc` schema. Add field definitions to prevent silent drops. | ⬜ Pending |
| P1-5 | High-traffic pages | `Loans`, `SavingsHub`, `RepayLoan`, `P2PDashboard` still use manual `useEffect` data loading instead of React Query — no caching, deduplication, or error boundary. Migrate to `useQuery`. | ⬜ Pending |
| P1-6 | `dispatchNotification` | Routing logic present but SMS / push / email fan-out not fully verified end-to-end. Confirm each channel fires for the correct `priority` and `channel` combination. | ⬜ Pending |

---

## P2 — Medium (Fix within sprint)

| # | Area | Issue | Status |
|---|------|-------|--------|
| P2-1 | P2P fee distribution | Floating-point arithmetic used for UGX amounts — use integer cents/units throughout to avoid rounding drift. | ⬜ Pending |
| P2-2 | Offline sync | `useOfflineSync` hook wired on some pages but not all data-mutation paths — some writes can silently drop when offline. Audit and wire consistently. | ⬜ Pending |
| P2-3 | Accessibility | Radix Dialog / Select components missing `aria-label` on icon-only buttons; colour contrast < 4.5:1 in several dark-mode card variants. | ⬜ Pending |
| P2-4 | Dead dependencies | `html2canvas` and `jsPDF` listed in `package.json` — confirm zero live imports; remove if unused to cut 250 kB from the bundle. | ⬜ Pending |
| P2-5 | Admin Collections | Collections queue in Admin panel is not filtered by `collections_stage` — agents see all overdue loans regardless of tier. Add stage filter and sort. | ⬜ Pending |

---

## P3 — Low (Tech debt / polish)

| # | Area | Issue | Status |
|---|------|-------|--------|
| P3-1 | Components | Two `MilestoneCelebration` components exist (`src/components/MilestoneCelebration.jsx` and a copy inside `SavingsHub`). Deduplicate into a single shared component. | ⬜ Pending |
| P3-2 | `loanDecisionEngine` | No range validation on `amountRequested` or `tenureMonths` inputs — extreme values can produce nonsensical decisions. Add min/max guards at function boundary. | ⬜ Pending |
| P3-3 | Dark mode | Several pages added dark-mode Tailwind classes in Batch 6, but `LoanApplicationWizard`, `SavingsHub`, and `InvestmentHub` still have unpatched white-background panels. | ⬜ Pending |
| P3-4 | Toast feedback | `RepayLoan` success/failure toasts use plain `alert()` in two edge-case paths. Replace with the existing `useToast` hook. | ⬜ Pending |

---

## Completed — Batches 1–8

| Batch | Summary |
|-------|---------|
| 1–3 | Initial feature sweep: P2P lending flows, rental GPS, insurance claims, USSD menu, gamification, push notifications |
| 4 | CI/CD: GitHub Actions workflow (lint → test → build) |
| 5 | Dashboard aggregator (`getDashboardSummary`), React Query migration, `gcTime` 30→5 min, Sentry/Rollup dynamic-import fix |
| 6 | Dark mode patches (7 pages), `ErrorState` component, Dashboard error handling |
| 7 | Loan save-as-draft, top-up server-side eligibility, insurance claim post-submission doc upload, USSD gateway auth header, collections stage tracking |
| 8 | **P0 security**: ownership guard on `updateChallengeProgress` + `checkLoanRepaymentBalance`; USSD gateway secret made required; this `REVIEW.md` |
