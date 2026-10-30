-- D-119/121/122: read-model only, never invent receipt or beneficiary history.
-- One delta per day/scope per statement, including bulk seed and reanchor.
-- Keep the migration/backfill atomic with receipt writers.
BEGIN;
LOCK TABLE revenue_shares IN SHARE ROW EXCLUSIVE MODE;
CREATE INDEX stats_daily_revenue_retained ON stats_daily (metric, dimension, day)
  INCLUDE (value) WHERE metric = 'affiliate_revenue_retained';

-- statement-break
CREATE FUNCTION revenue_retained_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  INSERT INTO stats_daily (day, metric, dimension, value)
  SELECT day, 'affiliate_revenue_retained', dimension, sum(amount)::bigint
  FROM (
    SELECT (received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
      scope.dimension, media_soft_amount::bigint AS amount
    FROM new_rows CROSS JOIN LATERAL (
      VALUES ('all'), (CASE WHEN affiliate_id IS NOT NULL THEN 'attributed' END)
    ) scope(dimension)
    WHERE scope.dimension IS NOT NULL
  ) changes
  GROUP BY day, dimension HAVING sum(amount) <> 0
  ORDER BY day, dimension
  ON CONFLICT (day, metric, dimension) DO UPDATE
    SET value = stats_daily.value + EXCLUDED.value;
  RETURN NULL;
END;
$$;

-- statement-break
CREATE TRIGGER revenue_retained_insert AFTER INSERT ON revenue_shares
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION revenue_retained_insert();

-- statement-break
CREATE FUNCTION revenue_retained_update() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  INSERT INTO stats_daily (day, metric, dimension, value)
  SELECT day, 'affiliate_revenue_retained', dimension, sum(amount)::bigint
  FROM (
    SELECT (received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
      scope.dimension, -media_soft_amount::bigint AS amount
    FROM old_rows CROSS JOIN LATERAL (
      VALUES ('all'), (CASE WHEN affiliate_id IS NOT NULL THEN 'attributed' END)
    ) scope(dimension)
    WHERE scope.dimension IS NOT NULL
    UNION ALL
    SELECT (received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
      scope.dimension, media_soft_amount::bigint AS amount
    FROM new_rows CROSS JOIN LATERAL (
      VALUES ('all'), (CASE WHEN affiliate_id IS NOT NULL THEN 'attributed' END)
    ) scope(dimension)
    WHERE scope.dimension IS NOT NULL
  ) changes
  GROUP BY day, dimension HAVING sum(amount) <> 0
  ORDER BY day, dimension
  ON CONFLICT (day, metric, dimension) DO UPDATE
    SET value = stats_daily.value + EXCLUDED.value;
  RETURN NULL;
END;
$$;

-- statement-break
CREATE TRIGGER revenue_retained_update AFTER UPDATE ON revenue_shares
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION revenue_retained_update();

-- statement-break
CREATE FUNCTION revenue_retained_delete() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  INSERT INTO stats_daily (day, metric, dimension, value)
  SELECT day, 'affiliate_revenue_retained', dimension, sum(amount)::bigint
  FROM (
    SELECT (received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
      scope.dimension, -media_soft_amount::bigint AS amount
    FROM old_rows CROSS JOIN LATERAL (
      VALUES ('all'), (CASE WHEN affiliate_id IS NOT NULL THEN 'attributed' END)
    ) scope(dimension)
    WHERE scope.dimension IS NOT NULL
  ) changes
  GROUP BY day, dimension HAVING sum(amount) <> 0
  ORDER BY day, dimension
  ON CONFLICT (day, metric, dimension) DO UPDATE
    SET value = stats_daily.value + EXCLUDED.value;
  RETURN NULL;
END;
$$;

-- statement-break
CREATE TRIGGER revenue_retained_delete AFTER DELETE ON revenue_shares
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION revenue_retained_delete();

-- statement-break
CREATE FUNCTION revenue_retained_truncate() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  DELETE FROM stats_daily
  WHERE metric = 'affiliate_revenue_retained' AND dimension IN ('all', 'attributed');
  RETURN NULL;
END;
$$;

-- statement-break
CREATE TRIGGER revenue_retained_truncate AFTER TRUNCATE ON revenue_shares
  FOR EACH STATEMENT EXECUTE FUNCTION revenue_retained_truncate();

-- statement-break
-- Existing snapshots only. Reporting seed/job use different metrics and dimension ''.
INSERT INTO stats_daily (day, metric, dimension, value)
SELECT day, 'affiliate_revenue_retained', dimension, sum(amount)::bigint
FROM (
  SELECT (received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
      scope.dimension, media_soft_amount::bigint AS amount
    FROM revenue_shares CROSS JOIN LATERAL (
      VALUES ('all'), (CASE WHEN affiliate_id IS NOT NULL THEN 'attributed' END)
    ) scope(dimension)
    WHERE scope.dimension IS NOT NULL
) existing
GROUP BY day, dimension
ORDER BY day, dimension;

-- statement-break
COMMIT;
