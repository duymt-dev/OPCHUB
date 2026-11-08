/** Session-local fixtures: same query columns, types and production index key order; no public rows touched. */
export const PUSH_PLAN_FIXTURE = `DO $$ BEGIN
  CREATE TEMP TABLE users AS SELECT id,account_type,deleted_at FROM public.users WITH NO DATA;
  CREATE UNIQUE INDEX plan_users_pk ON users(id);
  CREATE TEMP TABLE membership_fees AS SELECT user_id,status,valid_until FROM public.membership_fees WITH NO DATA;
  CREATE UNIQUE INDEX plan_fee_user ON membership_fees(user_id);
  CREATE TEMP TABLE stores AS SELECT id,owner_id,status,field,province,intro FROM public.stores WITH NO DATA;
  CREATE UNIQUE INDEX plan_stores_pk ON stores(id);
  CREATE INDEX plan_stores_field ON stores(field,id) INCLUDE(owner_id) WHERE status<>'hidden';
  CREATE INDEX plan_stores_province ON stores(province,id) INCLUDE(owner_id) WHERE status<>'hidden';
  CREATE TEMP TABLE store_items AS SELECT id,store_id,name,sort FROM public.store_items WITH NO DATA;
  CREATE INDEX plan_store_items ON store_items(store_id,sort,id);
  CREATE TEMP TABLE store_daily_views AS SELECT store_id,day,views FROM public.store_daily_views WITH NO DATA;
  CREATE UNIQUE INDEX plan_store_views_pk ON store_daily_views(store_id,day);
  CREATE INDEX plan_store_views_digest ON store_daily_views(day,store_id) INCLUDE(views) WHERE views>0;
  CREATE TEMP TABLE push_subscriptions AS
    SELECT id,realm,user_id,created_at,endpoint,p256dh,auth FROM public.push_subscriptions WITH NO DATA;
  CREATE UNIQUE INDEX plan_subscriptions_pk ON push_subscriptions(id);
  CREATE INDEX plan_subscriptions_owner ON push_subscriptions(realm,user_id,created_at DESC,id DESC);
  CREATE TEMP TABLE notifications AS SELECT id,user_id,title,body,link FROM public.notifications WITH NO DATA;
  CREATE UNIQUE INDEX plan_notifications_pk ON notifications(id);
  CREATE TEMP TABLE push_dispatches AS
    SELECT notification_id,realm,kind,created_at FROM public.push_dispatches WITH NO DATA;
  CREATE UNIQUE INDEX plan_dispatches_pk ON push_dispatches(notification_id);
  CREATE TEMP TABLE events AS SELECT id,starts_at,reminded_1h_at FROM public.events WITH NO DATA;
  CREATE INDEX plan_events_remind ON events(starts_at) INCLUDE(id) WHERE reminded_1h_at IS NULL;

  INSERT INTO users SELECT 'u'||i,'business'::account_type,NULL FROM generate_series(1,10000) i;
  INSERT INTO membership_fees SELECT 'u'||i,'active'::membership_fee_status,now()+interval '1 day'
    FROM generate_series(1,10000) i;
  INSERT INTO stores SELECT 's'||i,'u'||i,'published'::store_status,
    CASE WHEN i=10000 THEN 'target' ELSE 'field'||(i%100) END,
    CASE WHEN i=10000 THEN 'target' ELSE 'province'||(i%34) END,repeat('wide intro ',100)
    FROM generate_series(1,10000) i;
  INSERT INTO store_items SELECT 'i'||i,'s'||i,'product',0 FROM generate_series(1,10000) i;
  INSERT INTO store_daily_views SELECT 's'||i,
    CASE WHEN i=10000 THEN DATE '2086-08-16' ELSE DATE '2086-08-15' END,7 FROM generate_series(1,10000) i;
  INSERT INTO push_subscriptions SELECT 'd'||i,'member','u'||i,now()-interval '1 minute',
    'https://push.invalid/'||i,'test-p256dh','test-auth' FROM generate_series(1,10000) i;
  INSERT INTO notifications SELECT 'n'||i,'u'||i,'Title',repeat('body ',200),'/dashboard'
    FROM generate_series(1,10000) i;
  INSERT INTO push_dispatches SELECT 'n'||i,'member','msg',now() FROM generate_series(1,10000) i;
  INSERT INTO events SELECT 'e'||i,
    CASE WHEN i=10000 THEN now()+interval '50 minutes' ELSE now()+interval '100 days' END,NULL
    FROM generate_series(1,10000) i;
  ANALYZE users; ANALYZE membership_fees; ANALYZE stores; ANALYZE store_items;
  ANALYZE store_daily_views; ANALYZE push_subscriptions; ANALYZE notifications;
  ANALYZE push_dispatches; ANALYZE events;
END $$`;
