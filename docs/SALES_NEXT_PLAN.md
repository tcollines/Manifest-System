# Sales & Merchandise — next implementation plan

Written 20 Sep 2026, at the end of the session that shipped migrations 44–47.
This is a **plan**, not a binding standard: `docs/STANDARDS.md`,
`ENFORCEMENT.md`, `SERVICE_CONTRACTS.md`, `VALIDATION_RULES.md` and
`EXECUTION_GUIDE.md` still override it, as does `CLAUDE.md`.

Read `CLAUDE.md` § "Current work in flight" first — it is current as of the
same date. Read `docs/SALES_PHASE1_HANDOFF.md` for the Phase 1 detail.

---

## Two phase schemes — do not conflate them

This has already caused numbering drift three times, so read it once.

**The original gap-closure plan had four phases.** The plan document itself is
**not in the repo**; its structure survives only in
`backend/database/sales/PHASE1_NOTES.md`, `PHASE2_NOTES.md` and
`docs/SALES_PHASE1_HANDOFF.md`.

| Plan phase | Migrations | State |
|---|---|---|
| Phase 1 — accounts, expenses, transfers, period closes, targets, ledger, RPCs | 34–41 | applied |
| Phase 2 — stock, goods receipts, supplier ledger | 42–43 | applied |
| Phase 3 — deliveries, checkout rewrite, `event_id` on targets | was 44, now 48+ | **never written** |
| Phase 4 — vendor sales and settlements | was 45, now 49+ | **never written** |

Migrations `44`–`47` are off-plan corrections, which is why plan Phases 3 and 4
keep sliding. `sales_order_deliveries`, `sales_vendor_sales` and
`sales_vendor_settlements` exist in **no** migration — verified. The
`sales_vendor_*` branches inside `fn_check_sales_closed_period()` are
forward-looking placeholders for tables that do not exist yet.

**This document's phases are lettered A–F on purpose.** A–D are *not* plan
phases 1–4. A is UI for work already built; B, C and D are Phase 1 leftovers —
their tables arrived in migrations 36, 37 and 38 and never got a backend module
or a page. E and F are the real plan Phases 3 and 4.

---

## Where things stand

**Database.** `backend/database/sales/34`–`47` are applied and verified live.
`DATA_cleanup_sentinel_payments.sql` has been run; it is a one-off naming four
row ids, do not replay it. **The next free migration number is `48`.** Which
phase gets it depends on what you write first — check the highest number in
`backend/database/sales/` before naming a file, every time. Do not trust a
number written in any document, including this one.

**Working end to end, verified against live data:**

- `accounts/` — balances, cashbook, create, update. UI: `MoneyAccountsPage`.
- Supplier payments — record, edit, delete. UI: the payment modal on
  `ProcurementPage`. Atomic RPCs, tenant-scoped, role-gated, period-guarded.
- Goods receipts — `GET`/`POST /sales/procurement/goods-receipts`. UI: the
  Goods Receipts tab on `ProcurementPage` lists them; **there is still no form
  for the POST.**
- Supplier statement — `GET /sales/procurement/suppliers/:id/statement`.
  UI: the statement panel, drilled down from the Suppliers tab.

**Not built at all:** `expenses/`, `funds/`, `periodCloses/` backend modules,
and their pages.

---

## Recommended order

**Phase A is done** (20 Sep 2026). It was pure frontend against endpoints that
were already built, gated, validated and live-tested, so it carried no database
risk and immediately made verified work usable.

**Phase B is next.** It needs no migration — see the decision recorded there.
Phases B–D each touch money and need more care.

---

## Phase A — make the two built endpoints reachable (frontend only)

**DONE — 20 Sep 2026.** Built exactly as scoped: no migration, no backend
change. Verified live against the test manifest, both acceptance lists met.
What shipped:

- `frontend/services/sales/goodsReceiptService.ts`
- `frontend/services/sales/supplierStatementService.ts`
- `frontend/modules/sales/components/GoodsReceiptsTab.tsx`
- `frontend/modules/sales/components/SupplierStatementPanel.tsx`
- `ProcurementPage`: third tab **Goods Receipts**; Suppliers rows drill down
  into the statement, the same shape as the cashbook panel under Money
  Accounts.

The "Record Goods Receipt" form was left out, as the phase allowed. It is the
only sales endpoint still unreachable from the UI.

The rest of this section is kept as the record of what was asked for.

No migration. No backend change expected. If you find yourself needing one,
stop and say so rather than widening the phase.

### A1. Goods-receipt tab on `ProcurementPage`

`frontend/modules/sales/pages/ProcurementPage.tsx` currently has
`type Tab = 'REQUESTS' | 'SUPPLIERS'`. Add `'GOODS_RECEIPTS'`.

Endpoint: `GET /sales/procurement/goods-receipts`, query params
`supplierId`, `from`, `to`, `page`, `limit` (limit capped at 100).

Returns an array of `sales_goods_receipts` rows, each with:

- the raw row (`grn_number`, `received_date`, `payment_terms`,
  `total_cost`, `amount_paid_on_receipt`, `delivery_note_number`, `notes`, …)
- `sales_suppliers(name)`
- `sales_goods_receipt_items(*, sales_product_variants(name, sku))`
- computed `total_paid` and `balance`

Note `total_paid` deliberately prefers the payment rows over
`amount_paid_on_receipt` — the RPC writes the on-receipt payment *as* a payment
row, so adding both double-counts. Show `total_paid` and `balance`, never the
sum of the two fields.

Create `frontend/services/sales/goodsReceiptService.ts` returning
`ServiceResponse<T>` (SERVICE_CONTRACTS §1) with explicit snake→camel mapping
(§3). Copy the shape of `frontend/services/sales/accountService.ts` — it is the
cleanest example in the codebase.

A "Record Goods Receipt" form is **optional** for this phase and probably
belongs in its own pass: `POST /sales/procurement/goods-receipts` takes
`supplierId`, `items[]` (`variantId`, `quantity`, `unitCost`,
`procurementRequestItemId?`), `paymentTerms` (`CREDIT` | `PAID` | `PART_PAID`),
and — when anything is being paid — `accountId` and `paymentMethod`. The list
view is the valuable half; get that in first.

**Acceptance:** the tab lists real receipts with supplier, date, terms, total,
paid and balance; expanding one shows its lines with variant name and SKU;
supplier and date filters work; an empty result renders an empty state, not a
spinner.

### A2. Supplier statement page

Endpoint: `GET /sales/procurement/suppliers/:id/statement`, query params
`from`, `to`. Returns:

```
{ supplier: { id, name },
  period:   { from, to, asOf },
  openingBalance,
  lines: [ { date, type: 'GOODS_RECEIPT' | 'PAYMENT', reference,
             description, debit, credit, balance } ],
  closingBalance,
  ageing,
  diagnostics: { goodsReceiptCount, paymentCount,
                 paymentsNotLinkedToGoodsReceipt,
                 unallocatedCredit, openingBalanceReceiptMissing } }
```

`diagnostics` is not debug output — surface it. `openingBalanceReceiptMissing`
being true means the ageing **understates what is owed**, because credit exists
with no matching debit. A statement that quietly shows a wrong ageing is the
failure mode this field was added to prevent.

Where the page lives is your call; a new tab on `SalesFinancialsTabsLayout.tsx`
(alongside Money Accounts) or a drill-down from the Suppliers tab both work.
Prefer the drill-down — a statement is always *for one supplier*.

**Acceptance:** running balance column is correct and matches `closingBalance`;
date range filters; ageing buckets render; the diagnostics warning is visible
when `openingBalanceReceiptMissing` is true.

---

## Phase B — period closes (module + UI, no migration)

**Why this matters:** there is no way to close a period through the app. The
whole guard infrastructure from migrations 38/45/47 depends on rows in
`sales_period_closes`, and today those can only be inserted by hand. I had to
insert one directly to test the guard.

Table (migration 38):

```
sales_period_closes(manifest_id, month DATE, closed_by TEXT NOT NULL,
                    closed_at TIMESTAMPTZ, notes TEXT)
PRIMARY KEY (manifest_id, month)
```

`month` is the **first day** of the month. `closed_by` is `NOT NULL` and is
`TEXT`, not a uuid FK — pass a name or id string.

Build:

- `backend/src/modules/sales/periodCloses/` — controller + service.
- `GET /sales/period-closes` — list closed months.
- `POST /sales/period-closes` — close a month.
- `DELETE /sales/period-closes/:month` — reopen.
- Role gate: closing and reopening are `['ADMIN', 'FINANCE']`. Do **not**
  include `HOD` — reopening a closed month lets reported figures be restated,
  and that should sit with finance and administrators.
- Zod schema in `backend/src/shared/validators/salesSchemas.ts`, `.strict()`,
  with `month` validated as `YYYY-MM-01`.

**Does it need a migration? DECIDED 20 Sep 2026 — no. Do not add guards.**
The owner's call, made explicitly. A period close is a plain insert: no check
for `PENDING_APPROVAL` expenses in the month, no check against closing a future
month. Say so in the service comment, so the absence reads as a decision rather
than an oversight. Phase B therefore needs no migration at all.

**Acceptance:** close a month through the API, confirm a supplier payment in
that month is then refused with 409 `SALES_PERIOD_CLOSED`, reopen, confirm it
is accepted again. Use a month with no real activity.

---

## Phase C — expenses

Tables already exist (migration 36): `sales_expense_categories` and
`sales_expenses`, with `status IN ('PENDING_APPROVAL','APPROVED','REJECTED','VOID')`.

**The key fact:** creating an expense does **not** move money. The ledger
(migration 40) counts *approved* expenses only. So:

- **Create** = a plain insert. It needs a document number from
  `sales_get_next_sequence(manifest_id, 'EXP', year)` (migration 38), which is
  atomic — use it, do not generate numbers in the service.
- **Approve** = the money event, and it already has an RPC:
  `sales_approve_expense(p_manifest_id, p_expense_id, p_approver, p_approver_role)`
  returning JSONB. Route approval through it. Never flip `status` to
  `'APPROVED'` with a direct update — that bypasses whatever the RPC enforces.

Build `backend/src/modules/sales/expenses/`, plus category CRUD, plus a page.
Role gate: creating is wider (`['ADMIN','HOD','FINANCE']`), approving should be
narrower — check what `sales_approve_expense` does with `p_approver_role`
before choosing, and match it rather than guessing.

---

## Phase D — funds / transfers

Table `sales_fund_transfers` (migration 37), RPC already exists:

```
sales_record_transfer(p_manifest_id, p_from_account_id, p_to_account_id,
                      p_amount, p_charges DEFAULT 0, p_transfer_date DEFAULT NULL,
                      p_reference, p_notes, p_created_by) RETURNS UUID
```

Route through the RPC — it locks both accounts. The table has
`CHECK (from_account_id <> to_account_id)` and `charges >= 0`.

`sales_other_transactions` (same migration) is the other half: ad-hoc `IN`/`OUT`
entries against an account. There is no RPC for it; a single insert is atomic on
its own, so a service-layer insert is acceptable here — but it must still be
tenant-scoped and period-guarded (the trigger is already attached).

---

## Phase E — plan Phase 3: deliveries and the checkout rewrite

The largest remaining piece, and the one with a decision attached that affects
reporting. Per correction 2 in `docs/SALES_PHASE1_HANDOFF.md`:

- Create `sales_order_deliveries`. It does not exist in any migration.
- **`CREATE OR REPLACE sales_process_checkout`** so a completed checkout writes
  a delivery row. Do *not* add a second function — the Phase 1 version does
  order, items, stock and payment, and no delivery.
- Add the `event_id` column to targets. The partial unique index on
  `sales_targets` currently covers `YEAR` and `MONTH` only; `EVENT` rows are
  meant to be disambiguated by that column.

**Settle this before writing `fetchProfitAndLoss`, or it gets written twice:**
until Phase 3 lands the P&L must recognise revenue from *completed orders*;
afterwards it can recognise from deliveries. Pick one and write it down.

Attach `fn_check_sales_closed_period()` to any new dated money table.

## Phase F — plan Phase 4: vendor sales and settlements

`sales_vendor_sales` and `sales_vendor_settlements`. The period-guard trigger
already has `sold_at` and `settled_at` branches waiting for them, so once the
tables exist they only need the trigger attaching — the function needs no edit.
Both are money tables, so their mutations belong in RPCs on the same terms as
everything else.

No further detail survives in the repo. Recover the scope from the plan
document before starting; if it cannot be found, treat the scope as unknown and
agree it with the user rather than inventing it.

---

## Smaller items, any time

1. **Back-dating a payment before an account's `opening_balance_date` silently
   removes it from the balance.** Not a bug — `sales_account_balance_asof`
   excludes those entries by design ([40_sales_account_ledger_view.sql:169]) —
   but now that dates are editable a user can cause an unexplained balance jump.
   **DECIDED 20 Sep 2026: back-dating stays possible — do not block it.** A
   warning in the payment form when the chosen date precedes the selected
   account's `openingBalanceDate` is still worth adding, so the balance jump is
   explained rather than mysterious, but the save must go through.
2. `frontend/services/sales/procurementPaymentService.updateProcurementFinancialTotals`
   is dead weight: it warns to the console and fetches every request to find
   one. Nothing calls it. Delete it.
3. `DATABASE_URL` in `backend/.env` is stale — the Supabase pooler rejects the
   tenant, so there is no direct psql from the repo. Fix it or remove it; right
   now it silently fails anyone who tries.
4. `backend/tmp_*.{ts,js}` — about 15 scratch files, including
   `tmp_test_sales_errors.ts`. Delete the ones that are no longer referenced.

---

## Conventions that are not obvious

These were all learned the hard way in this codebase. Following them costs
nothing; breaking them has caused real defects.

- **Every query filters `manifest_id` — including roll-ups inside RPCs.**
  Migration 46 exists solely because a `SUM` inside an RPC filtered on the
  request id alone and counted another manifest's payment.
- **Money and stock mutations go in RPCs**, atomic, `SELECT … FOR UPDATE`, and
  locked in a **consistent order across RPCs**. The established order for
  procurement is: purchase order first, then money accounts in ascending id.
  Keep it, or two RPCs will deadlock against each other.
- **Amounts are integers.** `shillings` is `.int().positive()`. `"10,000"` is
  rejected, not coerced. Inputs should refuse a decimal point rather than let a
  user type something the server will reject.
- **Schemas are `.strict()`.** An unknown key is a 422 naming the key. This is
  deliberate: a misspelt `amountPaid` used to return 201 with the payment
  silently dropped.
- **Dates.** `payment_date` is `timestamptz` holding a Kampala calendar date at
  UTC midnight. Slice the ISO string (`.slice(0,10)`) to get the day; parsing
  into a JS `Date` can shift it. Never truncate a timestamp to a day without
  `AT TIME ZONE 'Africa/Kampala'`.
- **Error sentinels carry the meaning.** RPCs raise
  `SALES_ACCOUNT_NOT_FOUND: <uuid>`; `salesErrors.ts` turns the sentinel into
  the readable prefix and maps P0001→409, P0002→404, P0003→422, P0004→422,
  P0005→403, P0006→409. Surface the backend message to the user as-is — "Cash
  has 88,000, needs 150,000" is the useful part.
- **The sentinel manifest** `00000000-0000-0000-0000-000000000000` appears in
  legacy rows and is **not** a v4 UUID, so it will not match `isUuidV4`.
- **`sales_procurement_request_items` has no `manifest_id`** — it is scoped
  through `request_id`. Not an oversight.
- **`sales_account_ledger` is a plain VIEW** and `sales_account_balance` sums it
  live. There is no stored balance. Deleting a row removes its ledger entry;
  nothing needs "repairing".
- Every migration gets a matching `<n>_down_<name>.sql`, and one that rewrites
  data says so in the header and states what the rollback cannot restore.

---

## Testing notes

- **Prove defects before reporting them** (CLAUDE.md). A wrong bug report costs
  more than silence. Several suspicions in this session turned out to be my own
  errors, caught only by reading the source first.
- **Use a control step.** When testing a guard, always include a case that
  should *succeed*. Four rejections prove nothing if the guard blocks
  everything.
- There is no direct SQL access. Use `@supabase/supabase-js` with
  `SUPABASE_SERVICE_ROLE_KEY` from a throwaway script in `backend/`, and delete
  it afterwards.
- **Scripts that delete production rows get blocked** by the permission
  classifier. Write the SQL to a file and hand it to the user to run instead —
  that is also safer.
- Live API testing is easiest through the browser pane's `javascript_tool`
  against `http://localhost:5000/api`, taking the token from
  `localStorage['sb-poazorjmzswectxvakzl-auth-token']`. It exercises the real
  HTTP layer: role gates, zod, and error mapping.
- Navigate the SPA by **clicking**, not by `navigate` to a deep URL — a hard
  navigation logged the user out once.
- In the browser pane, `ref`-based clicks resolve in the page's coordinate frame
  while `coordinate` clicks use the last screenshot's frame. When the viewport
  is emulated at a different size than the pane, ref clicks miss. Take a
  screenshot and click by coordinate.

### Known live test data (manifest `593fbdbb-8211-44ca-b3e2-8d999c88680c`)

| Thing | Id |
|---|---|
| Department | `afc0240b-0faf-48ec-a1d8-ad2f193eb891` |
| Supplier (Phaneroo Ministries International) | `fddd6729-0509-4f8c-aadf-cf55319082ef` |
| Cash account (opening date 2026-05-01) | `85721777-e005-4027-b9ab-17ab44759e72` |
| Bank | `81c0646c-9d42-49d2-8fe8-40a7ce3ec453` |
| Airtel Money | `d578990f-a800-473b-a343-b31b2621127c` |
| MTN Mobile Money | `276f9f9d-f941-425c-b8fa-3ecf76860bea` |
| Variant | `3bcd1665-2275-46c4-bdd4-46ca962cdbb9` |
| PO with payments | `6d146f93-1856-4045-8418-2849db05b94e` |
| User (for `closed_by`) | `6738fde0-08a1-4715-9f4a-f5e1f0d63fa7` |

State at handoff: Cash **895,000**, other three accounts 0, one payment
(45,000, `TEST-PAY-001`) on PO `6d146f93`, no unposted rows, no cross-manifest
rows, no period closes. This is test data and is expected to be reset before
real use.
