-- OPCHUB — index bloat / unused index report (TIP-V2-561, P5-MAINT-01). READ-ONLY: SELECT only.
-- Run by index-bloat.sh: psql -X -At -F '|' -v have_pgstattuple=<true|false> -f index-bloat.sql
-- Row: index|table|size_bytes|bloat_pct|idx_scan|stats_days|unique|method
--   pgstatindex: exact leaf density from the pgstattuple extension (used when installed)
--   estimate   : expected B-tree size from reltuples + pg_stats.avg_width at the index fillfactor
-- stats_days: days since pg_stat_database.stats_reset (server start if never reset); the
-- "idx_scan = 0 for N days" rule needs that window. Unique/primary indexes are never "unused".
\if :have_pgstattuple
SELECT i.indexrelid::regclass, i.indrelid::regclass, pg_relation_size(i.indexrelid),
  CASE WHEN s.leaf_pages > 0 THEN round((100 - s.avg_leaf_density)::numeric, 1) ELSE 0 END,
  u.idx_scan, a.days, i.indisunique, 'pgstatindex'
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_am am ON am.oid = c.relam AND am.amname = 'btree'
JOIN pg_stat_user_indexes u ON u.indexrelid = i.indexrelid
CROSS JOIN LATERAL pgstatindex(i.indexrelid::regclass) s
CROSS JOIN (
  SELECT floor(extract(epoch FROM now() - coalesce(stats_reset, pg_postmaster_start_time())) / 86400)::int AS days
  FROM pg_stat_database WHERE datname = current_database()
) a
WHERE i.indisvalid
ORDER BY 3 DESC;
\else
WITH cols AS (
  SELECT i.indexrelid, i.indrelid, i.indisunique, c.reltuples, c.relpages,
    coalesce((regexp_match(array_to_string(c.reloptions, ','), 'fillfactor=(\d+)'))[1]::int, 90) AS ff,
    sum(coalesce(st.avg_width, 8)) AS key_width
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indexrelid
  JOIN pg_am am ON am.oid = c.relam AND am.amname = 'btree'
  JOIN pg_class t ON t.oid = i.indrelid
  JOIN pg_attribute att ON att.attrelid = i.indrelid AND att.attnum = ANY (i.indkey)
  LEFT JOIN pg_stats st ON st.schemaname = t.relnamespace::regnamespace::text
    AND st.tablename = t.relname AND st.attname = att.attname
  WHERE i.indisvalid
  GROUP BY i.indexrelid, i.indrelid, i.indisunique, c.reltuples, c.relpages, c.reloptions
)
SELECT x.indexrelid::regclass, x.indrelid::regclass, pg_relation_size(x.indexrelid),
  CASE WHEN x.relpages > 1 THEN greatest(0, round((100 * (1 - (ceil(
    greatest(x.reltuples, 0) * (x.key_width + 12) / (8192 * x.ff / 100.0)) + 1) / x.relpages))::numeric, 1))
  ELSE 0 END,
  u.idx_scan, a.days, x.indisunique, 'estimate'
FROM cols x
JOIN pg_stat_user_indexes u ON u.indexrelid = x.indexrelid
CROSS JOIN (
  SELECT floor(extract(epoch FROM now() - coalesce(stats_reset, pg_postmaster_start_time())) / 86400)::int AS days
  FROM pg_stat_database WHERE datname = current_database()
) a
ORDER BY 3 DESC;
\endif
