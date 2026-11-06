-- Match monthly GROUP BY and DISTINCT affiliate ordering for streaming index-only aggregation.
DROP INDEX regional_share_kpi;
CREATE INDEX regional_share_kpi ON regional_shares(region,status,month_key,director_user_id,affiliate_id) INCLUDE(director_amount) WHERE region IS NOT NULL;
