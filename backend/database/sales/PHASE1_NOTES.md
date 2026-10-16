# Sales Phase 1 — migrations 39–41, and what the plan got wrong

Migrations 34–38 were already written in the repo; 39–41 finish Phase 1.

> **None of 34–41 has been run against Supabase yet.** The whole chain is
> pending. Apply it in one sitting, in order, and take a verified backup first —
> migration 34 rewrites `payment_method` values in place on `sales_payments` and
> `sales_procurement_payments`, and the original strings are not kept anywhere.

## Files

| File | What it does |
| --- | --- |
| `39_sales_targets.sql` | Targets table, RLS, seeded 2026 annual target |
| `40_sales_account_ledger_view.sql` | `sales_account_ledger` view + `sales_account_balance` / `sales_account_balance_asof` |
| `41_sales_transactional_rpcs.sql` | 8 RPCs, overdraft guard, hardened closed-period trigger |
| `34_down_*` … `41_down_*` | Rollbacks, in reverse order |

Apply order: `39` → `40` → `41`. Rollback order: `41_down` → `34_down`.

## Defects found in the plan

**1. Two files numbered 40.** The plan gives migration number 40 to both the
ledger view and the RPC file, and 41 to the Phase 2 goods receipts. The RPCs are
`41` here, so Phase 2 moves to 42–43, Phase 3 to 44, Phase 4 to 45. Nothing
downstream is written yet, so this costs nothing now and would have cost a
manual fix later.

**2. Phase 1 cannot write deliveries.** Decision 8 says every completed checkout
writes a `sales_order_deliveries` row, and the Phase 1 spec for
`sales_process_checkout` repeats it — but that table is not created until
Phase 3. `sales_process_checkout` here does stock, order, items and payment, and
Phase 3 must **replace** it (`CREATE OR REPLACE`) rather than add a second
function. Until then the P&L must recognise revenue from completed orders, not
from deliveries. Decide this before writing the P&L report, or you will write it
twice.

**3. `UNIQUE(manifest_id, period_type, period_start)` on targets breaks EVENT
targets.** Two events can start on the same day. Implemented as a partial unique
index over `YEAR` and `MONTH` only; `EVENT` rows are disambiguated by the
`event_id` column Phase 3 adds.

**4. The overdraft check needs the lock to be held by the caller.**
`sales_assert_sufficient_funds` is only safe if the caller already holds
`SELECT ... FOR UPDATE` on the account row — the function does not take the lock
itself, because the caller usually needs it for longer. Every RPC here does take
it. Any new caller must too, or two concurrent debits will both pass.

**6. `manifest_id` was `TEXT`; the live schema uses `uuid`.** Found on
20 Sep 2026 by checking the live Supabase schema before the first run — exactly
the caveat at the bottom of this file. Because PostgreSQL has no implicit
`uuid = text` operator, the chain as written failed in three places: migration
34's backfill join (`uuid = text`), migration 40's ledger view (`UNION types
uuid and text cannot be matched`), and six call sites in 41 that compare
`p_manifest_id` to `sales_orders`, `sales_product_variants` and
`sales_stock_taking_sessions`. The last group would have applied cleanly and
failed only at runtime, since plpgsql bodies are not type-checked at `CREATE`.
All nine new tables now declare `manifest_id UUID`, `p_manifest_id` is `UUID` on
all eight RPCs and on `sales_get_next_sequence`, grants/revokes and the `*_down`
drop signatures match, and the closed-period trigger casts
`(v_rec ->> 'manifest_id')::uuid`.

**7. Migration 38's timezone cast is fine.** The plan flags
`(payment_date AT TIME ZONE 'Africa/Kampala')` as needing care when
`payment_date` is a `DATE`. It does not: Postgres resolves `DATE` to
`timestamptz` there and the result is correct. Verified against both column
types. No fix was needed and none was made.

## What migration 41 changes about the closed-period trigger

Not a bug fix. Three things only:

- `SET search_path = public`, so the function cannot be redirected;
- one `to_jsonb` lookup instead of the duplicated `OLD`/`NEW` `ELSIF` chain, so
  the vendor tables in Phase 4 need no further edit here;
- error text `SALES_PERIOD_CLOSED: …` instead of `409: …`, matching the `SALES_*`
  codes the RPCs raise so the API maps one scheme.

If you would rather leave 38 alone, delete section 0 of `41`. Nothing else
depends on it.

## Error codes the API layer should map

| SQLSTATE | Meaning | Suggested HTTP |
| --- | --- | --- |
| `P0001` | `SALES_PERIOD_CLOSED` | 409 |
| `P0002` | not found (account, order, expense, variant, session) | 404 |
| `P0003` | `SALES_INSUFFICIENT_FUNDS` | 422 |
| `P0004` | invalid amount / quantity / state, missing reason | 422 |
| `P0005` | forbidden: bad role, self-approval | 403 |
| `P0006` | `SALES_INSUFFICIENT_STOCK` | 409 |

## Design decisions worth knowing

- **Prices come from the server.** `sales_process_checkout` ignores any price in
  the payload and reads `selling_price` / `cost_price` from the variant row.
- **`amount_paid` is recomputed, never incremented.** It is derived from the sum
  of payments minus refunds, so a retried request cannot inflate an order.
- **Bank accounts may go negative**, per decision 4. Cash and Mobile Money abort.
  The warn-and-confirm step for Bank belongs in the API, not the database.
- **Variant rows are always locked in ascending `id` order** so concurrent
  checkouts serialise instead of deadlocking.
- **Charges leave the sending account.** `TRANSFER_OUT` is `amount + charges`,
  `TRANSFER_IN` is `amount`. Total funds therefore fall by the charge, which is
  what you want; the P&L picks the charge up under "Bank & MoMo Charges".

## Verification already done

All eight migrations were applied to a real PostgreSQL 16 database, exercised,
rolled back, and re-applied. 26 assertions pass, none fail, covering the plan's
T1–T8, T10, T24 and T26, plus the refund and stock-take paths.

Two caveats on that: the base sales tables were reconstructed from the backend
services, not from a schema dump, and no live Supabase instance was involved.

**Re-verified 20 Sep 2026.** The base schema was regenerated from the live
Supabase PostgREST OpenAPI spec, so column names and types now match production.
Against that schema, on PostgreSQL 18: 34→41 apply, 14 RPC runtime assertions
(checkout with stock decrement, payment, refund, fulfil on a reserved paid order,
fulfil rejected on a completed order, transfer, expense approval, self-approval
rejection, stock take, balance, ledger, closed-period block, cash overdraft
block), rollback 41→34 with all Phase 1 tables dropped, and re-apply — all pass.
The combined paste bundle `APPLY_PHASE1_34_to_41.sql` was verified to apply
inside a single transaction.

Still unverified against production: nothing in this chain has yet been run
against the live Supabase instance.
So the SQL is proven to parse, run, and behave — but re-run the check against
staging before production, in case a real column differs from the reconstruction.

## Not done yet (rest of Phase 1)

The backend modules and frontend pages are untouched: `accounts/`, `expenses/`,
`funds/`, `periodCloses/`, the `payments`/`orders`/`reports` service changes, and
the five pages. The RPCs they call are ready.
