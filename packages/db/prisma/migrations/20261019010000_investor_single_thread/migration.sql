-- TIP-V2-107 (IV-R01…R03, NA-11): một luồng trao đổi NĐT ↔ OPC Hub theo investor_key.
-- Đổi tên bảng ghi chú Admin (giữ dữ liệu) và gộp tin trao đổi theo quan tâm vào đó.
ALTER TABLE "investor_admin_notes" RENAME TO "investor_comments";
ALTER TABLE "investor_comments" RENAME CONSTRAINT "investor_admin_notes_pkey" TO "investor_comments_pkey";
ALTER INDEX "investor_admin_notes_investor_key_created_at_idx" RENAME TO "investor_comments_investor_key_created_at_idx";
ALTER TABLE "investor_comments" ADD COLUMN "interest_id" TEXT;

INSERT INTO "investor_comments" ("id", "investor_key", "interest_id", "author_id", "from_investor", "body", "created_at")
SELECT m."id", i."investor_key", i."id", m."author_id", m."from_investor", m."body", m."created_at"
FROM "investor_thread_messages" m
JOIN "investor_interests" i ON i."id" = m."thread_key"
ON CONFLICT ("id") DO NOTHING;

DROP TABLE "investor_thread_messages";
