# TIP-V46-817 — query plans

## Method

Executed `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` against the actual exported
production query builders on the approved integration database. A temporary
`llm_calls` shadow table contained 200,000 synthetic metadata records distributed
over 90 days. The default seven-day window selected approximately 15,500 rows.
`VACUUM ANALYZE` was run; no planner switches were forced. No persistent business
records were inserted, removed or altered by this measurement.

Before/after used the same fixture and SQL, adding only the five covering indexes
from `20261117091000_v46_ai_ops_delivery`. Local timings are diagnostic, not a
production latency guarantee. Raw local evidence: `test-results/v46-817-query-plans.json`.

| Query | Before ms | After ms | Final ID/aggregate access |
|---|---:|---:|---|
| purpose + keyset, limit 50 | 1.051 | 0.875 | Index Only Scan `ai_calls_purpose_page` |
| provider + keyset, limit 50 | 0.693 | 0.664 | Index Only Scan `ai_calls_provider_page` |
| status + keyset, limit 50 | 0.691 | 0.665 | Index Only Scan `ai_calls_status_page` |
| purpose + status + keyset | 0.900 | 0.786 | Index Only Scan `ai_calls_purpose_status_page` |
| seven-day totals | 7.510 | 4.107 | Aggregate → Index Only Scan `ai_calls_metrics` |
| export batch, limit 1,000 | 11.519 | 10.522 | Index Only Scan `ai_calls_purpose_page` |

The four page queries and CSV batch first identify bounded IDs, then retrieve
their metadata through the primary key using a nested loop. An outer sort restores
the requested descending order. Before indexes the page queries used the old
timestamp index with filtering; totals used Bitmap Heap Scan.

## Index design

- Equality keys (`purpose`, `provider`, `status`, or `purpose,status`) precede
  descending `created_at,id`; `INCLUDE` supplies additional filtering columns.
- Totals use `(created_at DESC,id DESC) INCLUDE
  (purpose,status,provider,cost,prompt_tokens,completion_tokens)`.
- No prompt/response column is added. Cursor timestamps preserve PostgreSQL's
  microseconds; the integration regression covers a one-microsecond boundary.
- Export uses the same filter and keyset builder in batches of 1,000, not OFFSET.

## Boundaries and interpretation

A preliminary dense fixture placed all 200,000 rows inside seven days. PostgreSQL
correctly preferred a sequential scan for an aggregate covering essentially the
entire table (approximately 79 ms). The 90-day fixture above represents retention
with a selective default window; it does **not** establish that every 90-day
aggregate avoids sequential scans. Broad totals necessarily examine the matching
metadata. The optimizer remains free to choose its cheapest plan.

## Migration safety

The original metadata migration was not rewritten after deployment. The approved
supplement adds indexes and `moderation_ai_claims(message_id PRIMARY KEY)` with
`ON DELETE CASCADE`. Both migrations deployed on the two approved private databases.
On the temporary `opchub_v46_817_chain_test`, all 104 migrations deployed, both 817
downs ran, both ups ran, and normalized schema dumps matched. The owned chain
database was then dropped; no down ran on a HOLD/development/integration database.
Local chain evidence: `test-results/v46-817-chain.log`.
