-- AlterTable
ALTER TABLE "events" ADD COLUMN     "reminded_1h_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_success_at" TIMESTAMPTZ(6),
    "failure_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_preferences" (
    "realm" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kinds" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_preferences_pkey" PRIMARY KEY ("realm","user_id")
);

-- CreateTable
CREATE TABLE "push_dispatches" (
    "notification_id" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_dispatches_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "push_deliveries" (
    "notification_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "lease_owner" TEXT,
    "lease_attempt" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "terminal_at" TIMESTAMPTZ(6),

    CONSTRAINT "push_deliveries_pkey" PRIMARY KEY ("notification_id","subscription_id")
);

-- CreateTable
CREATE TABLE "need_match_notifications" (
    "need_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "need_match_notifications_pkey" PRIMARY KEY ("need_id","user_id")
);

-- CreateTable
CREATE TABLE "store_digest_runs" (
    "day" DATE NOT NULL,
    "cursor" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "store_digest_runs_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_owner" ON "push_subscriptions"("realm", "user_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "push_deliveries_subscription" ON "push_deliveries"("subscription_id");

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "push_dispatches"("notification_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bounded housekeeping: exact expression used by the cleanup query.
CREATE INDEX push_subscriptions_inactive ON push_subscriptions
  ((COALESCE(last_success_at,created_at)),id);
CREATE INDEX push_deliveries_lease ON push_deliveries(lease_owner,lease_attempt)
  INCLUDE(notification_id,subscription_id) WHERE sent_at IS NULL AND terminal_at IS NULL;
CREATE INDEX events_remind_1h_due ON events(starts_at) INCLUDE(id) WHERE reminded_1h_at IS NULL;
CREATE INDEX stores_need_audience_field ON stores(field,id) INCLUDE(owner_id) WHERE status<>'hidden';
CREATE INDEX stores_need_audience_province ON stores(province,id) INCLUDE(owner_id) WHERE status<>'hidden';
CREATE INDEX store_daily_views_digest ON store_daily_views(day,store_id) INCLUDE(views) WHERE views>0;

ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_realm CHECK(realm IN ('member','admin')),
  ADD CONSTRAINT push_subscriptions_failure_count CHECK(failure_count>=0),
  ADD CONSTRAINT push_subscriptions_endpoint_length CHECK(length(endpoint)<=2048),
  ADD CONSTRAINT push_subscriptions_keys CHECK(p256dh ~ '^[A-Za-z0-9_-]{1,200}$' AND auth ~ '^[A-Za-z0-9_-]{1,200}$'),
  ADD CONSTRAINT push_subscriptions_user_agent CHECK(user_agent IS NULL OR length(user_agent)<=300);
ALTER TABLE push_preferences ADD CONSTRAINT push_preferences_realm CHECK(realm IN ('member','admin')),
  ADD CONSTRAINT push_preferences_kinds CHECK(jsonb_typeof(kinds)='object'
    AND kinds ?& ARRAY['msg','need','renew','event','store']
    AND kinds - ARRAY['msg','need','renew','event','store']='{}'::jsonb
    AND jsonb_typeof(kinds->'msg')='boolean' AND jsonb_typeof(kinds->'need')='boolean'
    AND jsonb_typeof(kinds->'renew')='boolean' AND jsonb_typeof(kinds->'event')='boolean'
    AND jsonb_typeof(kinds->'store')='boolean');
ALTER TABLE push_dispatches ADD CONSTRAINT push_dispatches_realm CHECK(realm IN ('member','admin')),
  ADD CONSTRAINT push_dispatches_kind CHECK(kind IN ('msg','need','renew','event','store','test')),
  ADD CONSTRAINT push_dispatches_test_realm CHECK(kind<>'test' OR realm='admin');
ALTER TABLE push_deliveries ADD CONSTRAINT push_deliveries_result CHECK(sent_at IS NULL OR terminal_at IS NULL);
