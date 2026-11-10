-- REQ-122: overview reads only the total dimension; equality precedes the day range.
-- Keep payload off B-tree sort keys and avoid indexing provincial/other dimensions.
CREATE INDEX idx_stats_daily_overview_metric_day
ON stats_daily(metric, day DESC) INCLUDE(value)
WHERE dimension = '';
