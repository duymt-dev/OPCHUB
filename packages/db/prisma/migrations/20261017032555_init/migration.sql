-- ===== Viết tay (prisma-migrations.md bước 3) =====
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() là STABLE; bọc IMMUTABLE để dùng trong expression index (query phải gọi đúng hàm này)
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- D-41: Mã TV = 'TV' + 6 số
CREATE SEQUENCE IF NOT EXISTS member_code_seq START 1;

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('personal', 'business', 'investor');

-- CreateEnum
CREATE TYPE "system_role" AS ENUM ('super_admin', 'admin', 'moderator', 'member');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'locked');

-- CreateEnum
CREATE TYPE "business_verification" AS ENUM ('unverified', 'verified', 'pending', 'rejected');

-- CreateEnum
CREATE TYPE "sso_provider" AS ENUM ('google', 'facebook', 'linkedin', 'chatgpt', 'gemini', 'deepseek');

-- CreateEnum
CREATE TYPE "consent_kind" AS ENUM ('terms', 'privacy', 'marketing');

-- CreateEnum
CREATE TYPE "region" AS ENUM ('north', 'central', 'south');

-- CreateEnum
CREATE TYPE "group_join_mode" AS ENUM ('open', 'approval');

-- CreateEnum
CREATE TYPE "group_role" AS ENUM ('owner', 'moderator', 'member');

-- CreateEnum
CREATE TYPE "group_member_status" AS ENUM ('pending', 'member', 'rejected', 'cancelled', 'left', 'removed');

-- CreateEnum
CREATE TYPE "membership_fee_status" AS ENUM ('pending_payment', 'active', 'expiring', 'expired');

-- CreateEnum
CREATE TYPE "fee_period_source" AS ENUM ('transfer', 'manual');

-- CreateEnum
CREATE TYPE "payment_match_status" AS ENUM ('unmatched', 'matched', 'manual', 'ignored');

-- CreateEnum
CREATE TYPE "export_job_status" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "member_code" TEXT NOT NULL,
    "account_type" "account_type" NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "registration_role" TEXT,
    "position" TEXT,
    "system_role" "system_role" NOT NULL DEFAULT 'member',
    "status" "user_status" NOT NULL DEFAULT 'active',
    "perm_version" INTEGER NOT NULL DEFAULT 1,
    "avatar_url" TEXT,
    "totp_secret_enc" BYTEA,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(6),
    "locked_reason" TEXT,
    "last_login_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "user_id" TEXT NOT NULL,
    "tax_code" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "representative" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "main_field" TEXT NOT NULL,
    "sub_fields" TEXT[],
    "size" TEXT,
    "country" TEXT,
    "address" TEXT,
    "verification" "business_verification" NOT NULL DEFAULT 'unverified',
    "verified_at" TIMESTAMPTZ(6),
    "lookup_raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "sso_provider" NOT NULL,
    "subject" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" TEXT,
    "user_agent" TEXT,
    "ip" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "consent_kind" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" INET,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "region" "region" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cover_url" TEXT,
    "rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "join_mode" "group_join_mode" NOT NULL DEFAULT 'approval',
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_role" "group_role" NOT NULL DEFAULT 'member',
    "status" "group_member_status" NOT NULL DEFAULT 'pending',
    "intro" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_fees" (
    "user_id" TEXT NOT NULL,
    "status" "membership_fee_status" NOT NULL DEFAULT 'pending_payment',
    "valid_until" TIMESTAMPTZ(6),
    "amount" INTEGER NOT NULL DEFAULT 600000,
    "paid_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "membership_fees_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "membership_fee_periods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "fee_period_source" NOT NULL,
    "payment_transaction_id" TEXT,
    "collected_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_fee_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "bank_txn_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "match_status" "payment_match_status" NOT NULL DEFAULT 'unmatched',
    "matched_user_id" TEXT,
    "matched_at" TIMESTAMPTZ(6),
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "color" TEXT NOT NULL,
    "scopes" TEXT[],
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "system_role" NOT NULL,
    "keys" TEXT[],
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "smtp_configs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "encryption" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "key_enc" BYTEA,
    "from_name" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "reply_to" TEXT NOT NULL,
    "daily_limit" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "smtp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invites" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "system_role" "system_role" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT 'settings',
    "summary" TEXT NOT NULL DEFAULT '',
    "diff" JSONB,
    "ip" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "dispatched_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_daily" (
    "day" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "dimension" TEXT NOT NULL DEFAULT '',
    "value" BIGINT NOT NULL,

    CONSTRAINT "stats_daily_pkey" PRIMARY KEY ("day","metric","dimension")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" "export_job_status" NOT NULL DEFAULT 'queued',
    "file_key" TEXT,
    "row_count" INTEGER,
    "error" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_member_code_key" ON "users"("member_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_system_role_idx" ON "users"("system_role");

-- CreateIndex
CREATE INDEX "business_profiles_tax_code_idx" ON "business_profiles"("tax_code");

-- CreateIndex
CREATE INDEX "business_profiles_verification_created_at_idx" ON "business_profiles"("verification", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_subject_key" ON "auth_identities"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "consents_user_id_kind_idx" ON "consents"("user_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "groups_slug_key" ON "groups"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "groups_province_key" ON "groups"("province");

-- CreateIndex
CREATE INDEX "groups_region_member_count_idx" ON "groups"("region", "member_count" DESC);

-- CreateIndex
CREATE INDEX "group_members_user_id_status_idx" ON "group_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "group_members_group_id_status_group_role_idx" ON "group_members"("group_id", "status", "group_role");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_group_id_slug_key" ON "rooms"("group_id", "slug");

-- CreateIndex
CREATE INDEX "membership_fees_status_updated_at_idx" ON "membership_fees"("status", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "membership_fee_periods_payment_transaction_id_key" ON "membership_fee_periods"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "membership_fee_periods_user_id_ends_at_idx" ON "membership_fee_periods"("user_id", "ends_at" DESC);

-- CreateIndex
CREATE INDEX "payment_transactions_matched_user_id_received_at_idx" ON "payment_transactions"("matched_user_id", "received_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_bank_txn_id_key" ON "payment_transactions"("provider", "bank_txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_sort_idx" ON "categories"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "admin_invites_token_hash_key" ON "admin_invites"("token_hash");

-- CreateIndex
CREATE INDEX "admin_invites_email_idx" ON "admin_invites"("email");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_id_idx" ON "audit_logs"("created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_created_at_idx" ON "audit_logs"("entity", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "export_jobs_requested_by_created_at_idx" ON "export_jobs"("requested_by", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_fees" ADD CONSTRAINT "membership_fees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_fee_periods" ADD CONSTRAINT "membership_fee_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_fee_periods" ADD CONSTRAINT "membership_fee_periods_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== Viết tay: index Prisma không khai báo được (query-indexing.md) =====
-- Admin Thành viên: deferred join, bằng trước (account_type) rồi sort (created_at), covering
CREATE INDEX "users_list" ON "users" ("account_type", "created_at" DESC)
  INCLUDE ("full_name", "email", "status") WHERE "deleted_at" IS NULL;
CREATE INDEX "users_list_all" ON "users" ("created_at" DESC)
  INCLUDE ("account_type", "full_name", "email", "status") WHERE "deleted_at" IS NULL;
-- Ô tìm thành viên: query dùng đúng biểu thức (immutable_unaccent(full_name) || ' ' || email::text)
CREATE INDEX "users_search" ON "users"
  USING GIN ((immutable_unaccent("full_name") || ' ' || "email"::text) gin_trgm_ops);

-- Scheduler chuyển trạng thái phí hằng ngày
CREATE INDEX "membership_fees_due" ON "membership_fees" ("valid_until")
  WHERE "status" IN ('active', 'expiring');
-- Hàng đợi GD không khớp
CREATE INDEX "payment_tx_unmatched" ON "payment_transactions" ("received_at" DESC)
  WHERE "match_status" = 'unmatched';
-- D-41: thu tay bắt buộc lý do
ALTER TABLE "membership_fee_periods" ADD CONSTRAINT "fee_period_manual_reason"
  CHECK ("source" <> 'manual' OR length(coalesce("reason", '')) > 0);
ALTER TABLE "membership_fees" ADD CONSTRAINT "membership_fee_amount_positive" CHECK ("amount" > 0);

-- Yêu cầu vào nhóm chờ duyệt
CREATE INDEX "group_members_pending" ON "group_members" ("group_id", "created_at" DESC)
  WHERE "status" = 'pending';
CREATE INDEX "groups_search" ON "groups" USING GIN (immutable_unaccent("name") gin_trgm_ops);

-- Outbox relay: FOR UPDATE SKIP LOCKED trên tập chưa gửi
CREATE INDEX "outbox_pending" ON "outbox_events" ("id") WHERE "dispatched_at" IS NULL;

-- Luật 10: audit_logs chỉ INSERT. Role app local là owner nên REVOKE không đủ → trigger chặn.
-- Production thêm REVOKE UPDATE, DELETE cho role ứng dụng (infra B64).
CREATE OR REPLACE FUNCTION audit_logs_insert_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs chỉ cho phép INSERT';
END $$;
CREATE TRIGGER "audit_logs_no_update_delete" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_insert_only();
CREATE TRIGGER "audit_logs_no_truncate" BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_insert_only();
