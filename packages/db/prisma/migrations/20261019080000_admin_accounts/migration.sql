-- CreateEnum
CREATE TYPE "admin_user_status" AS ENUM ('active', 'locked');
-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "name" CITEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "admin_role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);
-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT,
    "role_id" TEXT,
    "password_hash" TEXT NOT NULL,
    "must_change_pwd" BOOLEAN NOT NULL DEFAULT true,
    "totp_secret_enc" BYTEA,
    "status" "admin_user_status" NOT NULL DEFAULT 'active',
    "perm_version" INTEGER NOT NULL DEFAULT 1,
    "last_login_at" TIMESTAMPTZ(6),
    "created_by" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" TEXT,
    "user_agent" TEXT,
    "ip" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_key_key" ON "admin_roles"("key");
-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");
-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_token_hash_key" ON "admin_refresh_tokens"("token_hash");
-- CreateIndex
CREATE INDEX "admin_refresh_tokens_admin_user_id_revoked_at_idx" ON "admin_refresh_tokens"("admin_user_id", "revoked_at");
-- CreateIndex
CREATE INDEX "admin_refresh_tokens_family_id_idx" ON "admin_refresh_tokens"("family_id");
-- CreateIndex
CREATE INDEX "admin_refresh_tokens_expires_at_idx" ON "admin_refresh_tokens"("expires_at");
-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Viết tay ────────────────────────────────────────────────────────────────
-- role_id chỉ NULL khi TK đã xoá mềm (vai trò bị xoá → TK phải chuyển vai trò trước, TIP-V2-203)
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_or_deleted"
  CHECK ("role_id" IS NOT NULL OR "deleted_at" IS NOT NULL);
CREATE INDEX "admin_users_role_live" ON "admin_users" ("role_id") WHERE "deleted_at" IS NULL;

-- ── Dữ liệu: 5 vai trò hệ thống (RB-R04) + ma trận mặc định §21.2 (ADM_DEF prototype ver2) ──
INSERT INTO "admin_roles" ("id", "key", "name", "description", "is_system", "updated_at") VALUES
  (gen_random_uuid()::text, 'super_admin', 'Super Admin', 'Toàn quyền hệ thống, không thể chỉnh sửa', true, now()),
  (gen_random_uuid()::text, 'admin', 'Quản trị viên', 'Vận hành toàn bộ nghiệp vụ cộng đồng', true, now()),
  (gen_random_uuid()::text, 'lecturer', 'Giảng viên', 'Đào tạo, tổ chức sự kiện/workshop, hỗ trợ thành viên trong nhóm', true, now()),
  (gen_random_uuid()::text, 'accountant', 'Kế toán', 'Phí thành viên, đối soát & chi trả hoa hồng affiliate', true, now()),
  (gen_random_uuid()::text, 'editor', 'Biên tập nội dung', 'Sự kiện, dự án, bot tương tác', true, now());

-- Super Admin không có dòng quyền (luôn đủ 25 khoá)
INSERT INTO "admin_role_permissions" ("role_id", "permission_key")
SELECT r."id", p.k FROM "admin_roles" r
JOIN (VALUES
  ('admin', 'overview.view'), ('admin', 'members.view'), ('admin', 'members.action'),
  ('admin', 'fees.view'), ('admin', 'fees.action'), ('admin', 'groups.view'), ('admin', 'groups.action'),
  ('admin', 'groups.moderate'), ('admin', 'bots.view'), ('admin', 'bots.action'), ('admin', 'events.view'),
  ('admin', 'events.action'), ('admin', 'projects.view'), ('admin', 'projects.action'),
  ('admin', 'investors.view'), ('admin', 'investors.action'), ('admin', 'services.view'),
  ('admin', 'services.action'), ('admin', 'affiliate.view'), ('admin', 'affiliate.action'),
  ('admin', 'settings.general'), ('admin', 'settings.mail'), ('admin', 'settings.log'),
  ('lecturer', 'overview.view'), ('lecturer', 'members.view'), ('lecturer', 'groups.view'),
  ('lecturer', 'groups.action'), ('lecturer', 'groups.moderate'), ('lecturer', 'events.view'),
  ('lecturer', 'events.action'),
  ('accountant', 'overview.view'), ('accountant', 'members.view'), ('accountant', 'fees.view'),
  ('accountant', 'fees.action'), ('accountant', 'services.view'), ('accountant', 'affiliate.view'),
  ('accountant', 'affiliate.action'), ('accountant', 'affiliate.payout'), ('accountant', 'settings.log'),
  ('editor', 'overview.view'), ('editor', 'groups.view'), ('editor', 'bots.view'), ('editor', 'bots.action'),
  ('editor', 'events.view'), ('editor', 'events.action'), ('editor', 'projects.view'),
  ('editor', 'projects.action')
) AS p(role_key, k) ON p.role_key = r."key";

-- ── Sao chép TK quản trị hiện có, GIỮ NGUYÊN id (audit_logs.actor_id, messages.sender_id…) ──
-- super_admin → Super Admin, admin → Quản trị viên, moderator → Giảng viên. Dòng `users` giữ tới TIP-V2-202.
-- TK không có mật khẩu (chỉ SSO): TK quản trị không đăng nhập SSO (D-62) → hash không dùng được + buộc đặt lại
INSERT INTO "admin_users" ("id", "name", "email", "phone", "role_id", "password_hash", "must_change_pwd",
  "totp_secret_enc", "status", "perm_version", "last_login_at", "created_at", "updated_at")
SELECT u."id", u."full_name", u."email", u."phone", r."id",
  COALESCE(u."password_hash", '!no-password'),
  u."must_change_password" OR u."password_hash" IS NULL,
  u."totp_secret_enc",
  CASE WHEN u."status"::text = 'active' THEN 'active' ELSE 'locked' END::"admin_user_status",
  u."perm_version", u."last_login_at", u."created_at", now()
FROM "users" u
JOIN "admin_roles" r ON r."key" = CASE u."system_role"::text
  WHEN 'super_admin' THEN 'super_admin' WHEN 'admin' THEN 'admin' ELSE 'lecturer' END
WHERE u."system_role" <> 'member' AND u."deleted_at" IS NULL;
