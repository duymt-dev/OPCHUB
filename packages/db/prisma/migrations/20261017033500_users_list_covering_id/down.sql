DROP INDEX IF EXISTS "users_list";
CREATE INDEX "users_list" ON "users" ("account_type", "created_at" DESC)
  INCLUDE ("full_name", "email", "status") WHERE "deleted_at" IS NULL;
DROP INDEX IF EXISTS "users_list_all";
CREATE INDEX "users_list_all" ON "users" ("created_at" DESC)
  INCLUDE ("account_type", "full_name", "email", "status") WHERE "deleted_at" IS NULL;
