# Handoff — Sales & Merchandise, Phase 1

Written 20 Sep 2026. Read this first if you are picking up the Sales gap-closure
work. It carries the state of a chat session that ended here, so a fresh Claude
Code session can continue without re-deriving anything.

---

## The job

Close the 19 gaps in the Sales & Merchandise department (slug `sales`, code
`d11`) so Manifest fully replaces the EMF Sales Financial System Google Sheet.
The full plan lives in the "Manifest Sales Dept — Gap Closure Implementation
Plan (Revised)" document, in five phases:

1. **Money management** — accounts, refunds, expenses, transfers, period closes, targets, ledger, RPCs
2. Stock, goods receipts, supplier ledger
3. Events and preorders
4. Vendor consignment
5. Insights, targets, dashboard rebuild

Only Phase 1 has been touched.

---

## State as of this handoff

### Database — APPLIED 20 Sep 2026

All of `backend/database/sales/34…41` were applied to Supabase in one
transaction via the SQL editor, using `APPLY_PHASE1_34_to_41.sql`, after the
`manifest_id` uuid correction (see correction 5). Verified live afterwards:
10 new objects present (9 tables + `sales_account_ledger`), all with
`manifest_id uuid`; `account_id` added to both payment tables; 11 `sales_*`
functions exposed; `p_manifest_id` is `uuid` on all 8 RPCs that take it; the
anon key is refused with `42501 permission denied` on `sales_account_balance`,
confirming the service_role-only grant model holds.

Backfill results: 40 payments and 4 procurement payments all carry an
`account_id` (0 nulls); the 4 legacy `'Mobile Money'` rows became
`'MTN Mobile Money'` and 0 legacy rows remain; the ledger view returns 44 rows.

| Migration | Contents | Written | Applied |
| --- | --- | :---: | :---: |
| `34_sales_money_accounts.sql` | Accounts, `account_id` on payments, legacy backfill | yes | yes |
| `35_sales_refunds.sql` | Refunds table | yes | yes |
| `36_sales_expenses.sql` | Expense categories + expenses | yes | yes |
| `37_sales_other_transactions_and_transfers.sql` | Other money in/out, transfers | yes | yes |
| `38_sales_period_closes_and_sequences.sql` | Period closes, sequences, closed-period trigger | yes | yes |
| `39_sales_targets.sql` | Targets | yes | yes |
| `40_sales_account_ledger_view.sql` | `sales_account_ledger` + balance helpers | yes | yes |
| `41_sales_transactional_rpcs.sql` | 8 RPCs + overdraft guard | yes | yes |

Rollback files `34_down_*` … `41_down_*` also exist.

### Backend — partly built

Built and live: the `accounts/` module, the goods-receipt, supplier-statement
and supplier-payment endpoints in `procurement/`, shared error mapping and
constants in `modules/sales/shared/`, and zod payload schemas in
`backend/src/shared/validators/`. Routes for all of these are mounted in
`sales.routes.ts`.

Still missing:

- `expenses/`, `funds/`, `periodCloses/` modules — note there is no endpoint
  for closing a period at all, so a close must be inserted directly
- `payments.service.ts` routing through `sales_record_payment` / `sales_process_refund`
- `orders.service.ts` routing checkout through `sales_process_checkout`
- `reports.service.ts`: rebuilt `fetchCashPosition`, new `fetchProfitAndLoss`,
  `fetchMonthlyReport`, `fetchFundsReconciliation`

### Frontend — partly built

`MoneyAccountsPage` exists and is reachable at **Reports & Financials → Money
Accounts**, backed by `frontend/services/sales/accountService.ts` and the
standardised inputs in `frontend/components/inputs/`.

Not created: `ExpensesPage`, `ProfitAndLossPage`, `FundsReconciliationPage`, a
supplier-statement page, and the goods-receipt tab on `ProcurementPage` — so
the three working procurement endpoints above are not yet reachable from the
UI. `CashPositionPage` is unchanged. No `expenseService` / `fundsService` /
`periodCloseService`.

### Phase 2 database — APPLIED

Migrations `42_sales_goods_receipts.sql` and `43_sales_stock_count_value.sql`
were **applied to Supabase on 20 Sep 2026**, along with `44` (supplier
payments) and `45` (the closed-period guard on goods receipts). Do not re-run
`backend/database/sales/APPLY_PHASE2_42_to_43.sql`.

Read `backend/database/sales/PHASE2_NOTES.md` — it records three further
defects in the plan and three deliberate deviations. The open decision it
flagged, a CREDIT goods receipt into a closed month not being blocked, was
**resolved by migration 45**: `fn_check_sales_closed_period()` is now attached
to `sales_goods_receipts`, verified live by closing a dead month, having the
receipt refused with `SALES_PERIOD_CLOSED` (409), and reopening it.

Phase 2 backend is partly built — see the Sales section of `CLAUDE.md` for what
exists and what does not.

---

## Do this first

Steps 1–3 are **done** (20 Sep 2026) and kept here for the record.

1. ~~**Take a verified backup of Supabase.**~~ Migration 34 rewrote
   `payment_method` in place (`'Bank Transfer'` → `'Bank'`, `'Mobile Money'` →
   `'Airtel Money'` or `'MTN Mobile Money'`). The original strings are not
   preserved anywhere and `34_down` cannot restore them. On the data as it
   stood, exactly 4 rows were rewritten, all to `'MTN Mobile Money'`.
2. ~~**Apply 34 → 41 in order**~~, in one sitting. They have inter-dependencies:
   35–37 reference `sales_money_accounts`; 40 reads every money table; 41 calls
   `sales_account_balance` from 40. `backend/database/sales/APPLY_PHASE1_34_to_41.sql`
   is the eight files concatenated in order for pasting into the Supabase SQL
   editor in one run, so a failure rolls the whole thing back.
3. ~~Check the reconstruction assumption against the real schema.~~ **Done** —
   see the update under "Verification already done" and correction 5. The
   assumption was wrong and the chain has been fixed.
4. **Start here:** smoke-test one POS checkout and one expense approval through
   the RPCs in the SQL editor against `593fbdbb-8211-44ca-b3e2-8d999c88680c`
   (Manifest Entebbe), then build the backend modules.

---

## Corrections already made to the plan

Five defects were found and fixed in what is on disk; one suspected defect
turned out not to be real.

1. **Duplicate migration number.** The plan numbered both the ledger view and
   the RPC file `40`, and gave `41` to Phase 2 goods receipts. On disk the RPCs
   are `41`. **Phase 2 must therefore start at 42**, Phase 3 at 44, Phase 4 at
   45. Renumber the plan before writing Phase 2.

2. **Phase 1 cannot write deliveries.** Decision 8 of the plan says every
   completed checkout writes a `sales_order_deliveries` row, and the Phase 1 RPC
   spec repeats it — but that table is not created until Phase 3.
   `sales_process_checkout` as written does order, items, stock and payment, and
   no delivery. **Phase 3 must `CREATE OR REPLACE` that same function**, not add
   a second one. Until Phase 3 lands, the P&L must recognise revenue from
   completed orders, not from deliveries. Settle this before writing
   `fetchProfitAndLoss` or it gets written twice.

3. **Unique constraint on targets.** The plan's
   `UNIQUE(manifest_id, period_type, period_start)` breaks EVENT targets, since
   two events can start on the same day. On disk it is a partial unique index
   over `YEAR` and `MONTH` only; EVENT rows will be disambiguated by the
   `event_id` column Phase 3 adds.

4. **The overdraft guard does not take its own lock.**
   `sales_assert_sufficient_funds` is only safe when the caller already holds
   `SELECT … FOR UPDATE` on the account row. Every RPC on disk does. Any new
   caller must too, or two concurrent debits will both pass the check.

5. **`manifest_id` was modelled as `TEXT`; live is `uuid`.** This is the caveat
   below, realised. The reconstructed test schema used `TEXT`, so the whole
   chain declared `manifest_id TEXT` on all nine new tables and as the
   `p_manifest_id` parameter of every RPC. Every live sales table uses `uuid`,
   and PostgreSQL has no implicit `uuid = text` operator, so as written:
   migration 34 aborted on its backfill join, migration 40's ledger view failed
   with `UNION types uuid and text cannot be matched`, and six RPC call sites
   would have failed at runtime (plpgsql bodies are not type-checked at
   `CREATE`, so 41 would have applied and then broken in production).
   **Fixed on disk:** `manifest_id` is `UUID` throughout, `p_manifest_id` is
   `UUID` on all eight RPCs plus `sales_get_next_sequence`, grants/revokes and
   the `*_down` drop signatures were updated to match, and the closed-period
   trigger now casts `(v_rec ->> 'manifest_id')::uuid`. **Backend services must
   pass a uuid, not a string**, when calling these RPCs.

6. **Not a defect:** the plan worries about
   `(payment_date AT TIME ZONE 'Africa/Kampala')` when `payment_date` is a
   `DATE`. It is fine — Postgres resolves the bare `DATE` to `timestamptz`
   before applying `AT TIME ZONE`, and the result is correct. Tested against
   both column types. Migration 38 was left alone.

---

## Design decisions baked into the SQL

- **Prices come from the server.** `sales_process_checkout` ignores any price in
  the request payload and reads `selling_price` / `cost_price` off the variant
  row. Do not add a client-supplied price path.
- **`amount_paid` is recomputed, never incremented** — derived from
  `SUM(payments) - SUM(refunds)` for the order, so a retried request cannot
  inflate it.
- **Bank accounts may go negative** (plan decision 4); Cash and Mobile Money
  hard-abort. The warn-and-confirm step for Bank belongs in the API layer, not
  the database.
- **Variant rows are always locked in ascending `id` order**, so concurrent
  checkouts serialise instead of deadlocking. Keep this in any new RPC.
- **Transfer charges leave the sending account**: `TRANSFER_OUT` is
  `amount + charges`, `TRANSFER_IN` is `amount`. Total funds fall by the charge,
  which the P&L picks up under "Bank & MoMo Charges".
- **Only `APPROVED` expenses reach the ledger.** `PENDING_APPROVAL`, `REJECTED`
  and `VOID` never do.
- **Balances ignore entries before `opening_balance_date`** — the opening
  balance is a physical count on that date and already contains them.
- **Expense approvers** must be one of `Administrator`, `Super Admin`,
  `Department`, `Finance` (see `backend/src/constants/roles.ts`), and can never
  be the requester.

---

## Error codes the API layer must map

`41_sales_transactional_rpcs.sql` raises `SALES_*` messages with these SQLSTATEs.
Map them once, in a shared handler:

| SQLSTATE | Meaning | HTTP |
| --- | --- | --- |
| `P0001` | `SALES_PERIOD_CLOSED` | 409 |
| `P0002` | not found — account, order, expense, variant, session | 404 |
| `P0003` | `SALES_INSUFFICIENT_FUNDS` | 422 |
| `P0004` | invalid amount / quantity / state, missing reason | 422 |
| `P0005` | forbidden — bad role, self-approval | 403 |
| `P0006` | `SALES_INSUFFICIENT_STOCK` | 409 |

---

## RPC signatures

```
sales_record_transfer(p_manifest_id, p_from_account_id, p_to_account_id,
                      p_amount, p_charges, p_transfer_date, p_reference,
                      p_notes, p_created_by) -> uuid

sales_approve_expense(p_manifest_id, p_expense_id, p_approver,
                      p_approver_role) -> jsonb

sales_process_checkout(p_manifest_id, p_items, p_amount_paid, p_account_id,
                       p_payment_method, p_reference, p_created_by,
                       p_order_payload) -> jsonb
    p_items: [{"variant_id": uuid, "quantity": int}]

sales_record_payment(p_manifest_id, p_order_id, p_amount, p_account_id,
                     p_payment_method, p_reference, p_created_by) -> jsonb

sales_process_refund(p_manifest_id, p_order_id, p_amount, p_account_id,
                     p_payment_method, p_reason, p_created_by) -> jsonb

sales_fulfill_order(p_manifest_id, p_order_id, p_created_by) -> jsonb

sales_complete_stock_take(p_manifest_id, p_session_id, p_items,
                          p_created_by) -> jsonb
    p_items: [{"variant_id", "system_quantity", "physical_quantity",
               "variance", "reason"}]

sales_account_balance(p_account_id) -> numeric
sales_account_balance_asof(p_account_id, p_as_of) -> numeric
```

`p_manifest_id` is **`UUID`** on every function above (and on
`sales_get_next_sequence`), matching the live tables — pass a uuid, not a
string. All other `p_*_id` parameters are `UUID`; `p_items` and
`p_order_payload` are `JSONB`.

All RPCs are `SECURITY DEFINER` with `search_path = public`, and execute is
granted to `service_role` only — `anon` and `authenticated` are revoked. **They
must be called from the backend with the service key**, not from the browser.

---

## Verification already done, and its caveat

Migrations 34–41 were applied to a real PostgreSQL 16 instance, exercised,
rolled back, and re-applied. 26 assertions passed and none failed, covering the
plan's T1–T8, T10, T24 and T26, plus the refund and stock-take paths. The
concurrency test confirmed two parallel checkouts for one remaining unit produce
exactly one order and never negative stock.

**Update (20 Sep 2026):** the caveat below was checked against the live Supabase
schema and it had in fact bitten — see correction 6. The base schema was
re-derived from the live PostgREST OpenAPI spec and every column listed below
was confirmed present with its real type. Two differences from the
reconstruction were found: `manifest_id` is `uuid` everywhere (not `TEXT`), and
`sales_order_items` has **no `manifest_id` column at all** — a standing breach of
the multi-tenant rule that nothing in 34–41 depends on, but which should be
closed separately. `sales_payments` has no `payment_date`; it uses `created_at`,
which migration 38 already had right. The corrected chain was then verified on
PostgreSQL 18 against that live-derived schema: apply 34→41, 14 RPC runtime
assertions (checkout, payment, refund, fulfil, transfer, expense approval and
self-approval rejection, stock take, balances, ledger, closed-period block, cash
overdraft block), rollback 41→34, and re-apply — all clean.

**Caveat that matters.** There is no DDL in the repo for the base sales tables
(`sales_orders`, `sales_order_items`, `sales_product_variants`,
`sales_payments`, `sales_procurement_payments`, `sales_inventory_movements`,
`sales_stock_taking_*`). They were presumably created directly in Supabase. The
test schema was **reconstructed by reading the backend services**, so the tests
prove the SQL parses, runs and behaves — but not that every column matches
production.

Columns the SQL depends on, which are worth confirming against the live schema
before the first run:

- `sales_order_items`: `unit_price`, `unit_cost_price`
- `sales_product_variants`: `stock_quantity`, `reserved_quantity`, `cost_price`,
  `selling_price`, `manifest_id`
- `sales_inventory_movements`: `type`, `quantity`, `reason`, `reference_id`
- `sales_stock_taking_items`: `system_quantity`, `physical_quantity`, `variance`,
  `reason`
- `sales_orders`: `total_amount`, `amount_paid`, `payment_status`,
  `fulfillment_status`, `updated_at`

One thing to note in `sales_process_checkout`: the order row is built with
`jsonb_populate_record`, so any key in `p_order_payload` that is not a real
column is silently ignored rather than erroring. That makes it tolerant of
schema drift, but it also means a typo'd field name fails quietly.

---

## Suggested next steps, in order

1. Backup, then apply 34 → 41.
2. Smoke-test one POS checkout and one expense approval through the RPCs
   directly in the SQL editor, against a real `manifest_id`.
3. Build `backend/src/modules/sales/accounts/` and `expenses/` (they are the
   most self-contained and unblock the two new pages).
4. Then `funds/` and `periodCloses/`.
5. Rewire `payments.service.ts` and `orders.service.ts` to the RPCs, keeping the
   transitional fallback that resolves `account_id` from `paymentMethod` when
   the client omits it.
6. Rebuild `fetchCashPosition` on `sales_account_ledger`, then the three new
   report functions.
7. Frontend pages and services last.

Follow `docs/EXECUTION_GUIDE.md` and the other four files in `docs/` for how
modules, services and validation must be structured — they override
conversational shortcuts.
