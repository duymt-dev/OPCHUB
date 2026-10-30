BEGIN;
LOCK TABLE revenue_shares IN SHARE ROW EXCLUSIVE MODE;
DROP TRIGGER IF EXISTS revenue_retained_insert ON revenue_shares;
DROP FUNCTION IF EXISTS revenue_retained_insert();
DROP TRIGGER IF EXISTS revenue_retained_update ON revenue_shares;
DROP FUNCTION IF EXISTS revenue_retained_update();
DROP TRIGGER IF EXISTS revenue_retained_delete ON revenue_shares;
DROP FUNCTION IF EXISTS revenue_retained_delete();
DROP TRIGGER IF EXISTS revenue_retained_truncate ON revenue_shares;
DROP FUNCTION IF EXISTS revenue_retained_truncate();
DROP INDEX IF EXISTS stats_daily_revenue_retained;
DELETE FROM stats_daily WHERE metric = 'affiliate_revenue_retained'
  AND dimension IN ('all', 'attributed');
COMMIT;
