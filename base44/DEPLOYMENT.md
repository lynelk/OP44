# New backend functions & entities — deployment notes

This change adds backend functions and entities that power three features
(bank-feed import, P2P secondary market, SMS/push notifications). The frontend
already calls them.

## Entities (already created live via MCP; .jsonc added for repo parity)
- `BankConnection`, `BankTransaction`, `SecondaryListing`, `NotificationPreference`

## Functions (must be DEPLOYED to the Base44 app before the new flows work live)
| Function | Purpose |
|---|---|
| `dispatchNotification` | Single fan-out: in-app + SMS + push + email, respects channels/quiet hours/mutes |
| `bankLinkInitiate` | Link a bank/MoMo account (creates BankConnection + UserConsent) |
| `bankSyncTransactions` | Pull + idempotently upsert BankTransaction (by `external_id`) |
| `bankImportExpenses` | Turn selected transactions into Expense rows (idempotent) |
| `p2pEngine` *(updated)* | New actions: `list_position`, `cancel_listing`, `get_secondary_listings`, `buy_position` (atomic + idempotent settlement) |
| `monitorRepayments` *(updated)* | Now routes notifications through `dispatchNotification` (fixes prior invalid Notification schema) |

Deploy via your normal Base44 sync/publish step (the app source is Base44-managed).

## Secrets to configure in Base44 (each channel/provider degrades to a safe no-op if unset)
- **SMS (Africa's Talking):** `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`, `AFRICASTALKING_SENDER`
- **Push (FCM):** `FCM_SERVER_KEY` — and set `VITE_VAPID_PUBLIC_KEY` (frontend) for Web Push subscription
- **Email (Resend):** `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL`
- **Bank aggregator (Mono example):** `MONO_SECRET_KEY` — without it, `bankSyncTransactions` uses a deterministic dev feed so the pipeline still works end to end

## Security (done)
- **RLS** applied to **39 entities** total — see `RLS_PLAN.md`. The 4 new entities are
  enforced live (via MCP); the other 35 strictly-private/lender-private entities have
  RLS in their `.jsonc` schema source and enforce on the next deploy.
- **Idempotency** added to `processMobileMoneyPayment` (optional `idempotency_key`
  prevents double-charges) and `p2pEngine buy_position` (stable per-listing/buyer key).
- **Input validation**: positive-amount + phone-format checks in
  `processMobileMoneyPayment`; type/required validation in `dispatchNotification`;
  discount caps + ownership/KYC checks in the secondary-market actions.
- **N+1 fix**: `distributeRevenue` updates lender investments in parallel.
- **Notification schema bug fixed**: `monitorRepayments` and `processMobileMoneyPayment`
  no longer write invalid `Notification` records — they route through `dispatchNotification`.

## Still recommended (platform-level / needs decision or testing)
- **Remaining RLS** on cross-read entities (P2P loans, devices/marketplace, groups,
  ROSCA, reference data, back-office) — proposed rules in `RLS_PLAN.md`; apply per-entity
  with a preview test (membership-scoped reads may need a `member_ids[]` helper field).
- **Rate limiting** on financial endpoints — needs a KV/store or Base44 middleware.
- **Backend cron pagination**: `monitorRepayments` / `adminReports` scan all records by
  design; at scale convert to cursor-based batch processing (not simple limits).
- **Composite indexes, CDN, APM/Sentry, load testing** — platform/infra tasks.
