# Manifest System

Multi-department database and management web app for an Entebbe-based
organisation. Departments include check-in and registration, attendance,
follow-up, events and stations, vehicles and passengers, finance, assets,
monthly reports, and Sales & Merchandise.

## Read before changing anything

`docs/` holds the binding rules. They override conversational requests — if an
instruction here or from the user conflicts with them, follow `docs/` and say so:

- `docs/STANDARDS.md`
- `docs/ENFORCEMENT.md`
- `docs/SERVICE_CONTRACTS.md`
- `docs/VALIDATION_RULES.md`
- `docs/EXECUTION_GUIDE.md`

`instruction.md` at the root is the older agent brief. Its architectural
principles (modular pages, strict separation of concerns, services layer) still
hold. Its tech-stack and data-model sections are out of date — trust this file
and the actual code over it.

## Stack

- **Frontend**: Vite + React + TypeScript, TailwindCSS, React Router
- **Backend**: Express + TypeScript in `backend/src/`, Supabase (Postgres, auth,
  realtime) via `@supabase/supabase-js`
- **Deploy**: Vercel and Render; repo on GitHub
- **Mobile**: Capacitor wrapper planned for Android and iOS

## Layout

```
backend/src/modules/<module>/          controllers + services per module
backend/src/middleware/                auth, roleMiddleware
backend/src/constants/roles.ts         role strings
backend/database/                      numbered .sql migrations
backend/database/sales/                Sales migrations (34+)
frontend/modules/<module>/pages/       page components
frontend/services/<module>/            frontend service layer
docs/                                  binding standards (see above)
```

## Environment and secrets

- All credentials live in `backend/.env` and `frontend/.env` (git-ignored). The
  variable list is in `backend/.env.example` and `frontend/.env.example`. In
  Dokploy, the same variables go in each application's Environment tab.
- Never hardcode a key, password, connection string or Supabase URL in code,
  and never add a `|| 'https://…'` fallback for a URL — read `process.env.*`
  (backend) or `import.meta.env.VITE_*` (frontend) and fail loudly if missing.
- Scripts load env by a path relative to themselves, never an absolute
  `d:/…` path: `require('dotenv').config({ path: require('path').resolve(__dirname, '<rel>/backend/.env') })`.
- DB scripts use `DATABASE_URL`, or `SUPABASE_DB_PASSWORD` when they build
  their own pooler/direct URL.
- Frontend `VITE_*` values are baked in at build time and are public — only
  the anon/publishable Supabase key belongs there, never the service role key.
- Save files as UTF-8. PowerShell `>` writes UTF-16, which breaks the Nixpacks
  build ("stream did not contain valid UTF-8").

## Non-negotiables

- **Multi-tenant.** Every table carries `manifest_id` and every query filters on
  it. Data must never cross between manifests. RLS is enabled on all new tables.
- **UUID primary keys**, enforced end to end.
- **Direct foreign keys.** No polymorphic `source_type` / `source_id` pairs —
  every record must trace back to its event through a real FK.
- **Separation of concerns.** Controllers handle HTTP, services handle Supabase,
  components render. No Supabase calls inside UI components.
- **Money and stock mutations belong in Postgres RPCs**, not in multi-step
  service code. Anything touching balances or stock must be atomic, take
  `SELECT … FOR UPDATE` on the rows it debits, and lock in a deterministic order.
- **Timezone is `Africa/Kampala`.** Any date derived from a timestamp must be
  converted before truncating to a day, or a 01:30 EAT sale lands on the wrong
  date.

## Roles

From `backend/src/constants/roles.ts`: `Administrator`, `Super Admin`,
`Department`, `TeamLeader`, `Finance`, `ResidenceCoordinator`,
`CampusCoordinator`, `HealingCoordinator`. Sidebar groups are My Department,
Global Approvals, Global Finance, System Administration.

## Migrations

Numbered `.sql` files, applied manually against Supabase — there is no migration
runner, so **numbering is a convention, not enforced**. Duplicate numbers exist
in `backend/database/` from earlier work; do not add more. Check the highest
existing number in the target folder before naming a new file.

Every new migration gets a matching `<n>_down_<name>.sql` rollback.

Migrations that rewrite existing data in place must say so in a header comment,
and the rollback must state plainly what it cannot restore.

## How to work here

- **Audit before acting.** When asked for an audit or a second opinion, change
  no code — report findings and stop.
- **Never suppress an error to make it go away.** Fix the cause. A `try/catch`
  that swallows, a `?.` that hides a missing field, or a widened type to silence
  the compiler will be rejected.
- **Verify claims before making them.** If you assert a defect, prove it — run
  it. A plausible-sounding bug report that turns out to be wrong costs more than
  saying nothing.
- Flag any deviation from a plan you were given, with the reason, rather than
  quietly implementing something different.

## Known recurring problems

Race conditions in dashboard search; unhandled promises and memory leaks in
`useEffect`; slow dashboard and event data loads; unstable username/password and
Google logins; SPA routing on refresh; realtime updates not appearing.

## Current work in flight

**Sales & Merchandise.** Migrations `backend/database/sales/34`–`49` are
**applied to Supabase as of 20 Sep 2026** and verified live. The next free
migration number is **`50`** — check the folder before trusting that.
Read `docs/SALES_NEXT_PLAN.md` for what to build next and the conventions
that are not obvious from the code, `docs/SALES_PHASE1_HANDOFF.md` for the
Phase 1 detail, and the `PHASE*_NOTES.md` files in `backend/database/sales/`
for the migration detail.

**Phase 3 is `48`–`49`**: `sales_order_deliveries` and its lines,
`sales_record_delivery`, `sales_process_checkout` and `sales_fulfill_order`
replaced, a backfill giving every already-completed order a delivery, the
closed-period guard extended to deliveries (eight tables now), and `event_id`
on `sales_targets`. **Revenue is recognised from deliveries**, not from orders
in `COMPLETED` — that decision is settled and `PHASE3_NOTES.md` records why.
`fetchProfitAndLoss`, when it is written, recognises from deliveries.

**The POS checkout and the fulfil endpoint now run the RPCs.** They were
hand-rolled service code until 21 Sep 2026, which is why a delivery row was
never written for a new sale. Two things follow from the switch:

- `POST /sales/orders/checkout` takes a **different payload**: camelCase,
  `.strict()`, `{ items: [{ variantId, quantity }], amountPaid, accountId,
  paymentMethod, customerId?, reference? }`. Prices are gone from the wire —
  the RPC prices each line from the variant row it has locked — and the
  free-form `orderPayload`, which let a browser write any column of
  `sales_orders`, is gone with them. `accountId` is **required** once
  `amountPaid > 0`, so POS has an account selector; without it the payment row
  carries no account and never reaches `sales_account_ledger`.
- The POS payment-method buttons offered `Mobile Money`, which is not one of
  the six values migration 34's CHECK allows. The old code discarded the
  failed insert without checking the error, so such a sale would have been
  marked PAID with no payment row behind it. The dropdown now offers the
  canonical list from `frontend/modules/sales/constants.ts`.

Still hand-rolled and still racy: `recordOrderPayment` and `processRefund` in
`payments.service.ts` read, add in JavaScript and write back. `sales_record_payment`
and `sales_process_refund` (migration 41) exist and are not called by anything.
`backend/src/controllers/salesController.ts` holds an older copy of the checkout
logic; nothing imports it and nothing routes it.

`DATA_cleanup_sentinel_payments.sql` in the same folder has already been run.
It is a one-off, environment-specific data fix naming four row ids, which is
why it carries no number — do not replay it elsewhere.

`manifest_id` is `uuid` on every sales table, and `p_manifest_id` is `uuid` on
all eight Phase 1 RPCs — pass a uuid, not a string. The RPCs are
`SECURITY DEFINER`, granted to `service_role` only, so they must be called from
the backend with the service key.

**Migration numbering.** Plan Phase 2 is `42`–`43`, Plan Phase 3 is `48`–`49`.
None of `44`–`47` is a plan phase — all four were added after the fact: `44` the supplier-payment RPC the
plan assumed the backend could insert directly, `45` the closed-period guard on
goods receipts, `46` the manifest filter on the supplier-payment roll-up, `47`
the edit and delete RPCs. Plan Phase 4 (vendor sales and settlements) is
unwritten, so **the next plan phase starts at `50`.** As always, check the
highest existing number in the folder before naming a new file rather than
trusting this note.

`45` matters if you touch period closes: `fn_check_sales_closed_period()` is
now attached to `sales_goods_receipts` as well as the six money tables from
`38`. Before it, a CREDIT goods receipt wrote no payment row and so slipped
into a closed month unguarded, while PAID and PART_PAID were caught.

**Built and live**: the `accounts/` module (balances, cashbook, create/update),
and the goods-receipt, supplier-statement and supplier-payment endpoints in
`procurement/`. Shared error mapping and constants are in
`modules/sales/shared/`. Payload validation uses zod schemas in
`backend/src/shared/validators/` — they are `.strict()`, so an unknown key is a
422 naming the key rather than a silently dropped field.

**Not built**: the `expenses/`, `funds/` and `periodCloses/` modules. There is
no endpoint for closing a period at all — a close has to be inserted directly.

On the frontend, `MoneyAccountsPage` exists and `ProcurementPage` records
supplier payments through the RPC route. Plan Phase A is **done**: every sales
endpoint that exists is now reachable from the UI. `ProcurementPage` has a
third tab, **Goods Receipts** (`modules/sales/components/GoodsReceiptsTab.tsx`,
read-only list with supplier and date filters and expandable lines), and the
Suppliers tab drills down into a **statement**
(`modules/sales/components/SupplierStatementPanel.tsx`). Their services are
`services/sales/goodsReceiptService.ts` and
`services/sales/supplierStatementService.ts`.

Two things those pages must keep doing. A goods receipt's paid figure is the
backend's `total_paid`, never `amount_paid_on_receipt` plus the payment rows —
the RPC writes the on-receipt payment *as* a payment row, so adding both
double-counts. And the statement's `diagnostics` is not debug output: while
`openingBalanceReceiptMissing` is true the ageing understates the debt, so the
panel shows a warning rather than a quietly wrong number.

There is still no form for recording a goods receipt;
`POST /sales/procurement/goods-receipts` is reachable only from the API.

**There is one way to record a supplier payment**, and it must stay that way:
`POST /sales/procurement/suppliers/:id/payments`, which runs the migration-44
RPC — it writes `account_id`, locks the account row and runs the overdraft
check. `POST /sales/procurement/payments` and
`DELETE /sales/procurement/payments/:paymentId/requests/:requestId` have been
removed, along with their controller and service functions and the
`initialPayment` branch of `createRequestWithItems` that called them. The POST
inserted the row directly with no account, so the payment never reached
`sales_account_ledger` (which filters on `account_id IS NOT NULL`) and the cash
position stayed overstated. The DELETE went for separate reasons: it had no
role check at all, so any authenticated caller could erase a payment, and it
recomputed the order totals through an unscoped query. Do not reintroduce
either as it was.

Editing and deleting are back, gated, through migration 47 (applied):
`PUT /sales/procurement/payments/:paymentId` and
`DELETE /sales/procurement/payments/:paymentId`. Both run RPCs that lock the
order and the accounts, recompute the order totals in the same transaction, and
write the previous row to the audit log. Neither repairs a balance, because
there is nothing to repair: `sales_account_ledger` is a plain `VIEW` and
`sales_account_balance` sums it live, so the payment row **is** the ledger
entry — change it and the balance changes, delete it and the balance rises
again.

An edit re-tests sufficiency against only what changes: the increase when the
account stays the same, the full amount when it moves to a different account.
`supplier_id` and `procurement_request_id` are deliberately not editable —
delete and re-record against the right document instead.

**`47` also changed the shared period guard**: `fn_check_sales_closed_period()`
now checks `OLD` as well as `NEW` on an `UPDATE`. It only ever read `NEW`,
which was harmless while nothing updated these tables, but an edit endpoint
made it a hole — a row in a closed month could be given a date in an open one
and pass. This applies to all seven guarded tables, not just supplier payments.

`ProcurementPage`'s payment history shows each row's status alongside its
actions: `Posted` when it debited an account, `Unposted` for a legacy row that
named none, which editing it and naming an account will fix.
