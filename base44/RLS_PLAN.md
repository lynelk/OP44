# Row-Level Security (RLS) plan

Standard owner rule used below:
`OWNER(field) = { "$or": [ { "data.<field>": "{{user.id}}" }, { "user_condition": { "role": "admin" } } ] }`
applied to read/create/update/delete unless noted. The service role (used by
backend functions) bypasses RLS, so cross-user server logic is unaffected.

## ✅ Applied (live on the 4 new entities; in schema source for the rest — enforced on next deploy)

| Entity | Owner field | Notes |
|---|---|---|
| BankConnection, BankTransaction, NotificationPreference | `user_id` | OWNER (live via MCP) |
| SecondaryListing | `seller_id`/`buyer_id` | read: seller/buyer/admin; write: **service-role/admin only** (live via MCP) |
| AutoSaveLog, BudgetCategory, BusinessProfile, CoachingNudge, CreditScore, Expense, FinancialHealthReport, GamificationBadge, GoalContribution, InsuranceClaim, InsurancePolicy, KYCDocument, LoanApplication, LoanRescheduleRequest, LoyaltyReward, Notification, PortfolioSnapshot, Repayment, RiskProfile, SavingsGoal, SavingsPocket, SupportTicket, UserAsset, UserConsent, UserLiability, UserSavingsChallenge, WellnessActivity, InvestorContribution, USSDSession | `user_id` | OWNER |
| GPSTracker, GPSAlert, Geofence, DeviceMaintenanceRequest, LenderInvestment | `lender_id` | OWNER(lender_id) — lender-private; cross-user access only via service-role functions |
| ReferralEvent | `referrer_id` | read: referrer/invitee/admin; write: referrer/admin |

## ⏳ Proposed but NOT yet applied (cross-read / shared — need live testing first)

These are read by users other than the owner, so a naive owner-only rule would
break real flows. Recommended rules, to apply after verifying each path:

| Entity | Why it's cross-read | Proposed rule |
|---|---|---|
| `UserProfile` | trust score / lender info surfaced to counterparties (via functions today) | read: OWNER(user_id) + admin; **verify** no direct cross-user frontend read before enabling |
| `P2PLoan` | borrowers own; lenders browse marketplace + see funded loans | read: `borrower_id` OR lender-has-investment OR `is_marketplace_listed==true` OR admin; write: service-role/admin |
| `P2PRepayment` | borrower + lenders (via analytics) | read: borrower OR admin; lender views go through service-role functions |
| `Device` | marketplace browsing by borrowers | read: public (authenticated) for `status: available`, else lender/admin; write: lender/admin |
| `RentalAgreement`, `RentalPaymentTransaction` | both borrower & lender parties | read: `$or` borrower_id/lender_id/admin |
| `SavingsGroup`, `GroupMember`, `GroupContribution`, `GroupChallenge` | members join/view shared groups | read: members of the group OR admin (needs a membership sub-check) |
| `ROSCAGroup`, `ROSCAMember` | discoverable + joinable circles | read: open circles public + members; write via service-role |
| `LoanProduct`, `InsuranceProduct`, `BusinessRule`, `P2PConfig`, `SavingsChallenge`, `InvestmentPool`, `InvestorPool` | global reference data | read: public (authenticated); write: admin only |
| `AccountBalance`, `ReserveFund`, `RevenueTransaction`, `DisputeAuditLog`, `DisputeEvidence`, `LocationHistory` | back-office / financial ops | read+write: admin only |
| `User` (built-in) | platform-managed | leave to Base44 defaults |

## How to apply the remaining set safely
1. Pick one entity, add the proposed `rls` to its `.jsonc`.
2. Deploy to a Base44 preview/branch.
3. Smoke-test the flows that read it (owner, counterparty, admin).
4. Promote. Repeat. (Membership-scoped reads for groups may need a helper field
   like `member_ids[]` on the group for an efficient RLS check.)
