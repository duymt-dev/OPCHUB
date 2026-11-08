# TIP-V46-820 — actual SQL plans / migration chain

Production builders `storeSitemapQuery` and `storeOwnerSlugsQuery` executed by
`store-sitemap-plan.int.spec.ts` on10,000 wide stores with matching users/fees.
Connection-local TEMP tables clone deployed indexes, then VACUUM ANALYZE. No
public business-row changes, planner forcing, disabled scans or altered timeout.

| Query | Actual access / result | Execution |
|---|---|---:|
| Sitemap first page | Partial covering Index Only Scan on stores,1001 rows,0 heap fetches; PK visibility joins |16.773ms |
| Sitemap keyset page | Same covering index,1001 rows,0 store heap fetches; timestamp/id range before limit |15.206ms |
| Three owner IDs → slugs | Unique owner index seek,3 rows; no store Seq Scan |0.095ms |

The deployed partial index is `stores_public_sitemap_page`:
`(updated_at DESC,id DESC) INCLUDE(owner_id,slug) WHERE status='published' AND
seo_index=true`. PostgreSQL names the cloned TEMP index
`stores_updated_at_id_owner_id_slug_idx`; its definition is inherited, not a
fixture-only replacement. The narrow sitemap projection needs no late wide-row
join at all. Owner status, deletion and usable fees are checked through primary
keys inside the limited query. Both owners-table aliases use indexed lookups;
there are no application-level per-store DB calls.

Tests assert indexed access/no store Seq Scan,1001 bounded results and no overlap
between first1000 and the next keyset page. Separate real1001-row endpoint test
checks API pagination, typed cursor with six fractional digits, no duplicates or
missing fixture rows. These are fixture observations, not production SLOs.

Raw actual EXPLAIN output: [query-plans.txt](evidence/v46-820-query-plans.txt).

## Guest day range / upsert

New table `store_daily_guest_views` has PK `(store_id,day)` (equality first,
range second), FK cascade to stores and nonnegative count CHECK. Recording is
one atomic `INSERT .. ON CONFLICT .. views=views+1`, VN calendar day derived from
the supplied UTC timestamp. Dashboard selects only the7-day aggregate for the
owner's store. Member `store_daily_views`, `stores.view_count`, digest/push SQL
are not changed. Guest-state isolation/dedup/invalidation are real integration
tests, not Prisma mocks.

The actual production `storeGuestViewsQuery` was additionally executed against
300,000 connection-local fixture day rows. Its `(store_id,day)` PK served a Bitmap
Index Scan for one store and seven days (7 rows), then aggregate7, no Seq Scan;
execution0.187ms. This is fixture evidence, not a production latency guarantee.
Raw output: [guest-plan.txt](evidence/v46-820-guest-plan.txt).

## Migration

- New migration only: `20261119090000_v46_store_guest_views`; down drops only its
  new index/table. Existing migration files/checksums were not changed.
- Create-only diagnostic rejected a pre-existing applied-history checksum
  mismatch on private812, asking for destructive reset. No reset/history repair
  was attempted. New SQL/down were reviewed separately and deployed to the two
  approved private targets.
- Empty approved `opchub_v46_820_chain_test`:106 deploys →820 down (new table
  absent verified) →820 up → identical normalized pg_dump schemas. Owned chain
  DB dropped after closing its connection. No down on any reused/HOLD DB.
- [Chain evidence](evidence/v46-820-chain.json).
