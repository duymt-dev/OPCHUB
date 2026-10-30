-- D-120: compact eligible-candidate aggregate. The constant status key permits B-tree
-- posting-list deduplication, unlike the wide identity index used for point exclusions.
CREATE INDEX users_director_count_compact ON users (status)
  WHERE deleted_at IS NULL AND status = 'active';
