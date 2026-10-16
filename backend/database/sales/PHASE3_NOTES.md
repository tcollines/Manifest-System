# Sales Phase 3 — migrations 48–49, deliveries and the checkout rewrite

Written 20 Sep 2026. Phase 3 is the plan phase that had never been written;
44–47 were off-plan corrections, so it starts at **48**, not the 44 the Phase 1
notes predicted.

> **Both files are applied to Supabase**, after 47, and verified live: 32
> deliveries for 32 completed orders, 43 delivery lines, revenue from
> deliveries 1,625,000 — equal to the sum of the completed orders it replaces
> as the revenue basis.

## Files

| File | What it does |
| --- | --- |
| `48_sales_order_deliveries.sql` | Both delivery tables, `sales_record_delivery`, `sales_fulfill_order` and `sales_process_checkout` replaced, the backfill, the period guard extended to deliveries |
| `49_sales_targets_event_id.sql` | `event_id` on `sales_targets`, its CHECK, its unique index, its manifest-match trigger |
| `48_down_*`, `49_down_*` | Rollbacks. Read what each says it cannot restore |
| `APPLY_PHASE3_48_to_49.sql` | The two up files concatenated, for one paste into the SQL editor |

Apply order `48` → `49`; rollback order `49_down` → `48_down`. The two are
independent — either can go on or come off without the other.

## The three scope items, and where each landed

1. **`sales_order_deliveries`** — section 1–2 of 48, as a header table plus
   `sales_order_delivery_items`.
2. **`sales_process_checkout` replaced** — section 5 of 48. The Phase 1 body
   byte for byte plus a delivery block at the end; there is still exactly one
   checkout function.
3. **`event_id` on targets** — migration 49, finishing what migration 39 left
   open (correction 3 in `docs/SALES_PHASE1_HANDOFF.md`).

## Decisions taken, which the plan left open

**Deliveries carry lines, not just a header.** Each line holds `quantity`,
`unit_price` and `unit_cost_price`, copied from the order line at delivery time
so a later price change cannot restate a handover that already happened. A
customer collecting two of three shirts is representable; a header-only table
would have had to be migrated to this shape later with live rows in it.

**Revenue is recognised from deliveries.** This is the decision the plan says
to settle before `fetchProfitAndLoss` is written. Revenue for a period is
`SUM(quantity * unit_price)` over `sales_order_delivery_items` joined to
deliveries in that period; COGS is the same sum over `unit_cost_price`.
`reports.service.ts` still recognises from orders in `COMPLETED` — that path is
now the stale one and is what the backfill exists to keep whole.

**The backfill writes history.** Every order already in `COMPLETED` gets one
delivery, dated from the order's `updated_at`, tagged
`created_by = 'migration-48-backfill'`. 32 of them on live. Without it, moving
revenue onto deliveries would silently drop every past sale out of the P&L.
The insert is `NOT EXISTS`-guarded, so re-running it does nothing.

It runs **before** the closed-period trigger is attached, deliberately. These
rows reconstruct handovers that already happened and are already reported;
guarding them would abort the whole migration as soon as any month in the
history had been closed.

## Deviations from what was there before

- **`sales_fulfill_order` is now a wrapper.** Same signature, same
  preconditions, same return (plus `delivery_id`), but the body calls
  `sales_record_delivery` with no item list. One implementation of stock,
  movements and the delivery row rather than two that can drift.

- **Delivering a `CANCELLED` order is refused.** Migration 41 only refused a
  `COMPLETED` one. Nothing calls it on a cancelled order; it had not been
  considered.

- **`RESERVED` still means "the units are held".** `READY_FOR_PICKUP` is in the
  frontend enum and nothing sets it, so it is not treated as holding a
  reservation. If something starts setting it, this is the line to revisit.

- **The period guard gained a `sales_order_deliveries` branch**, on
  `delivered_at` converted to Kampala. Every other branch is migration 47's,
  byte for byte, including reading both `OLD` and `NEW` on an `UPDATE`. Eight
  tables are guarded now, not seven.

- **A target's event must be in the target's own manifest.** A foreign key
  cannot say that, so 49 adds a trigger. `ministry_events` is the events table;
  `events` no longer exists.

## RPC signature

```
sales_record_delivery(
  p_manifest_id     UUID,
  p_order_id        UUID,
  p_items           JSONB       DEFAULT NULL,   -- [{"order_item_id": uuid, "quantity": int}]
  p_delivery_method TEXT        DEFAULT 'COUNTER',  -- COUNTER | PICKUP | DISPATCH
  p_delivered_at    TIMESTAMPTZ DEFAULT NULL,   -- defaults to now()
  p_reference       TEXT        DEFAULT NULL,
  p_notes           TEXT        DEFAULT NULL,
  p_created_by      TEXT        DEFAULT NULL
) RETURNS JSONB
```

`p_items` NULL means everything still outstanding on the order. The order must
be fully paid — the same rule migration 41 enforced. Sentinels raised:
`SALES_ORDER_NOT_FOUND`, `SALES_ORDER_ITEM_NOT_FOUND`, `SALES_INVALID_STATE`,
`SALES_NOT_FULLY_PAID`, `SALES_OVER_DELIVERY`, `SALES_DUPLICATE_ITEM`,
`SALES_NO_ITEMS`, `SALES_NOTHING_OUTSTANDING`, `SALES_INVALID_QUANTITY`,
`SALES_INVALID_DELIVERY_METHOD`, `SALES_INSUFFICIENT_STOCK`,
`SALES_PERIOD_CLOSED`. `salesErrors.ts` maps the codes already.

## Verification

Run on PostgreSQL 18.4 against a schema reconstructed from the live Supabase
rows, with migration 39 applied on top: **59 assertions, all passing**, across
apply, the backfill (including that it leaves open orders alone and is
idempotent), checkout completed and part-paid, part delivery, fulfil, every
refusal above, the closed-period guard with an open-month control and a
01:30 EAT boundary case, both rollbacks, and re-apply. The bundle was applied
separately inside one transaction, the way the SQL editor runs it.

Two things the run established that were not obvious:

1. **`49_down` blocks re-applying 49.** Its rollback drops `event_id` but
   leaves the EVENT target rows, which then have `period_type = 'EVENT'` and no
   event — exactly what 49's CHECK refuses. Re-applying fails with
   `check constraint "sales_targets_event_id_presence_check" ... is violated by
   some row` and applies nothing. That is the right failure, but it has to be
   cleared by hand. The rollback file says so and gives the query.

2. **Nothing double-counts stock at checkout.** The delivery block records the
   handover only; the item loop above it had already moved stock and written
   the `SALE` movements. Asserted against both the variant row and the movement
   count.

## Wired up on 21 Sep 2026

Both live write paths now run the RPCs, so a delivery row is written for every
sale again:

- `processCheckout` (`orders.service.ts`) calls `sales_process_checkout`. The
  payload it accepts changed with it — camelCase, `.strict()`, no prices from
  the client, and `accountId` required once money is taken. See CLAUDE.md.
- `fulfillOrder` (`payments.service.ts`) calls `sales_fulfill_order`, and so
  `sales_record_delivery` underneath it.

Verified against live Supabase with calls chosen to be refused, so nothing was
written: unknown variant → `SALES_VARIANT_NOT_FOUND` 404, an account from
another manifest → `SALES_ACCOUNT_NOT_FOUND` 404, fulfilling a completed order
→ `SALES_INVALID_STATE` 422, fulfilling an unpaid one → `SALES_NOT_FULLY_PAID`
422. A separate probe took a valid checkout as far as the payment insert and
tripped the payment_method CHECK on purpose, which proves the order row and its
items were built from `p_order_payload` before the transaction rolled back.
Row counts and variant stock were unchanged afterwards.

## What is still not built

- **No endpoint records a part delivery.** `sales_record_delivery` takes an
  item list; nothing calls it with one. A customer collecting two of three
  shirts is representable in the data and not yet in the API or the UI.
- **Nothing reads deliveries.** No endpoint returns an order's delivery
  history, so the UI cannot show what has been handed over or what is still
  outstanding.
- **`reports.service.ts` still recognises revenue from orders in `COMPLETED`.**
  The two bases agree today, because every completed order has exactly one
  delivery for its full quantity. They diverge on the first part delivery.
- **`fetchProfitAndLoss` does not exist yet.** When it is written, recognise
  from deliveries, per the decision above.
- **`event_id` on targets has no consumer.** There is no targets endpoint and
  no targets page, so nothing can set it or read it.
- Plan Phase 4 (vendor sales and settlements) remains unwritten. The next free
  migration number after this is `50` — check the folder before trusting that.
