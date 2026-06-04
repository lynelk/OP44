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

## Security (done on the new entities)
- **RLS applied** to `BankConnection`, `BankTransaction`, `NotificationPreference`
  (owner + admin) and `SecondaryListing` (seller/buyer read; service-role/admin
  writes only, so listings can't be forged from the client).

## Still recommended (platform-level, deliberately not done piecemeal)
- **App-wide RLS** on the other ~57 entities — several are cross-read (marketplace,
  P2P loans, savings groups, reference data) so this needs a tested, per-entity pass,
  not a blanket rule. Use the new entities' rules as the template for strictly-private ones.
- **Rate limiting** on financial endpoints — needs a KV/store or Base44 middleware.
- **Pagination**: per-user display lists are now bounded (Budget, Notifications,
  RepaymentPlanner, SavingsChallenges, Profile, GPS). Admin aggregations and
  cross-user reads were intentionally left unbounded (limiting would change totals);
  those need server-side aggregation endpoints instead.
