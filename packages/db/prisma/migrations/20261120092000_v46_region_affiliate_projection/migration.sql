-- B10 scope first, affiliate grouping second; payload stays off B-tree sort keys.
CREATE INDEX regional_share_affiliate_projection
ON regional_shares(region,director_user_id,affiliate_id)
INCLUDE(customer_id,base_amount,director_amount)
WHERE region IS NOT NULL;
