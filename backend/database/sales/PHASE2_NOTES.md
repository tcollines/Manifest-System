# Sales Phase 2 — migrations 42–43, and what the plan got wrong

Phase 2 of the gap-closure plan: stock, goods receipts and the supplier ledger
(gaps 10–13).

> **Neither migration has been run against Supabase yet.** Apply
> `APPLY_PHASE2_42_to_43.sql` in the SQL editor in one run. Phase 1 (34–41) must
> already be applied — Phase 2 calls `sales_get_next_sequence` and
> `sales_assert_sufficient_funds`, and references `sales_money_accounts`.

Neither migration rewrites existing data. The only pre-existing rows touched are
`sales_stock_taking_sessions.count_date`, back-filled from `completed_at` for
sessions that already finished.

## Files

| File | What it does |
| --- | --- |
| `42_sales_goods_receipts.sql` | GRN header + lines, supplier ledger linkage on procurement payments, `sales_record_goods_receipt` RPC |
| `43_sales_stock_count_value.sql` | `unit_cost` + generated `variance_value` on count lines, `count_date` on sessions, replaced `sales_complete_stock_take` |
| `42_down_*`, `43_down_*` | Rollbacks, in reverse order |

Apply order: `42` → `43`. Rollback order: `43_down` → `42_down`.

## Defects found in the plan

**1. Numbering, again.** The plan calls these files 41 and 42, but 41 is the
Phase 1 RPC file on disk. Phase 2 is therefore **42–43**, Phase 3 is **44** and
Phase 4 is **45**. This is the same off-by-one recorded as correction 1 in
`docs/SALES_PHASE1_HANDOFF.md`; the plan document still has the old numbers.

**2. The `unit_cost` snapshot was assigned to the wrong layer.** The plan says
"snapshot variant `cost_price` into `unit_cost` on stock count lines" under
`inventory.service.ts`. But the insert into `sales_stock_taking_items` happens
inside the Phase 1 RPC `sales_complete_stock_take`, not in the service. Left as
written, `unit_cost` would stay `0` on every new line and `variance_value` —
a generated column over `variance * unit_cost` — would always be `0`, silently.
Migration 43 therefore replaces the RPC so it takes the snapshot itself.

**3. `sales_goods_receipt_items` had no `manifest_id`.** The plan's column list
omits it, matching the existing child tables (`sales_order_items`,
`sales_procurement_request_items`) which also lack it. But the plan's own
security section requires "RLS enabled with tenant isolation (`manifest_id`)" on
all new tables, and a child table cannot express that without the column.
CLAUDE.md requires it outright. The column is present.

## Deviations from the plan, and why

- **The closed-period trigger is not attached to the GRN tables.** The plan
  lists the money tables it guards and goods receipts are not among them. A
  `PAID` or `PART_PAID` receipt still writes a `sales_procurement_payments` row,
  which *is* guarded, so a paying receipt into a closed month is already
  refused — verified. **A `CREDIT` receipt into a closed month is not**, even
  though it moves supplier payables and inventory valuation, both of which feed
  the financial position. Flagged rather than silently guarded; it needs a
  decision.

- **`cost_price` is left alone by a receipt.** Decided explicitly: actual cost
  lives on the receipt line (`unit_cost`), and `cost_price` stays a manually
  managed field. No weighted-average or latest-cost rewrite.

- **`WAITING_SUPPLIER` → `RESERVED` only when the whole order is covered.** The
  plan says just "preorder `WAITING_SUPPLIER` → `RESERVED` status update". An
  order flips only if every one of its lines can be satisfied from
  `stock_quantity - reserved_quantity` after the receipt lands; otherwise it
  stays `WAITING_SUPPLIER`. This avoids half-reserving an order on a part
  delivery. The flip also increments `reserved_quantity` and writes
  `RESERVATION` movements, which is what makes `RESERVED` mean anything —
  the plan text does not say this explicitly.

## What migration 42 replaces

`receiveProcurementItem` in `procurement.service.ts` is the current receive
path, and it is unsafe on four counts:

1. it trusts a client-supplied `currentQtyReceived`, so two concurrent receives
   both send the same base and one silently overwrites the other;
2. it reads `stock_quantity` then writes `stock_quantity + qty` with no lock —
   a plain read-modify-write race;
3. it filters neither the variant nor the request item by `manifest_id`, so an
   id from another tenant would be written to;
4. there is no transaction, so a partial failure leaves stock moved and
   `quantity_received` not, or the reverse.

`sales_record_goods_receipt` does the whole thing in one transaction, locks
variants in ascending id order like every other RPC, and derives quantities from
the database rather than the request.

## RPC signature

```
sales_record_goods_receipt(
  p_manifest_id            UUID,
  p_supplier_id            UUID,
  p_items                  JSONB,
  p_payment_terms          TEXT,               -- PAID | CREDIT | PART_PAID
  p_received_date          DATE    DEFAULT NULL,   -- defaults to today, Kampala
  p_procurement_request_id UUID    DEFAULT NULL,
  p_delivery_note_number   TEXT    DEFAULT NULL,
  p_amount_paid_on_receipt NUMERIC DEFAULT 0,
  p_account_id             UUID    DEFAULT NULL,   -- required unless CREDIT
  p_payment_method         TEXT    DEFAULT NULL,
  p_reference              TEXT    DEFAULT NULL,
  p_notes                  TEXT    DEFAULT NULL,
  p_created_by             TEXT    DEFAULT NULL
) -> jsonb

  p_items: [{"variant_id": uuid, "quantity": int, "unit_cost": numeric,
             "procurement_request_item_id": uuid | null}]

  returns: {goods_receipt_id, grn_number, total_cost, amount_paid, balance,
            lines, units_received, payment_id, orders_reserved}
```

`SECURITY DEFINER`, `search_path = public`, execute granted to `service_role`
only. Call it from the backend with the service key.

### Payment-terms rules, enforced in the RPC

| Terms | `amount_paid_on_receipt` | Account |
| --- | --- | --- |
| `CREDIT` | must be 0 | not required |
| `PAID` | must equal `total_cost` exactly | required |
| `PART_PAID` | `> 0` and `< total_cost` | required |

`total_cost` is computed from the lines, never taken from the caller.

### Error codes

Same scheme as Phase 1 — see the table in `docs/SALES_PHASE1_HANDOFF.md`.
Migration 42 raises `P0002` (supplier, request, request item, variant or account
not found), `P0003` (insufficient funds, via the Phase 1 guard), `P0004`
(bad terms, bad quantity, bad amount, no lines, missing account) and inherits
`P0001` from the closed-period trigger on the payment row.

## Verification

Applied to PostgreSQL 18 (PGlite) against a base schema generated from the live
Supabase PostgREST OpenAPI spec, with Phase 1 applied on top. **50 assertions,
all passing:**

- **40** on apply + RPC runtime: CREDIT / PAID / PART_PAID receipts, GRN
  numbering via `sales_get_next_sequence`, stock increment, `IN` movements,
  account debit and balance movement, payment-to-GRN linkage, on-account payment
  with no PO, `quantity_received` roll-up, PO status `PARTIALLY_RECEIVED` →
  `RECEIVED`, `WAITING_SUPPLIER` → `RESERVED` release with reservation,
  overdraft block, every validation rejection, `unit_cost` snapshot,
  `variance_value` computation, `count_date`, reason-required still enforced,
  and the closed-period behaviour of both a paying and a CREDIT receipt.
- **9** on rollback `43_down` → `42_down` and re-apply, including that the
  restored Phase 1 stock-take RPC still runs against the narrowed table.
- **1** on `42_down` correctly *refusing* when an on-account payment with no PO
  exists, rather than inventing a link.

**Not yet verified against production.** Nothing in this chain has been run
against the live Supabase instance.
