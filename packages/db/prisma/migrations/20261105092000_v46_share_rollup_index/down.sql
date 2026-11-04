DROP INDEX regional_share_kpi;
CREATE INDEX regional_share_kpi ON regional_shares(region,status,month_key) INCLUDE(director_amount,affiliate_id,director_user_id) WHERE region IS NOT NULL;
