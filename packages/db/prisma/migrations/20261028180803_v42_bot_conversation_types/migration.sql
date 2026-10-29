-- D-112 custom catalog only. Built-ins cannot be shadowed, including by direct SQL writes.
CREATE TABLE "bot_conversation_types" (
  "id" TEXT NOT NULL,
  "name" CITEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "bot_conversation_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bot_conversation_types_name_check" CHECK (
    char_length(name) BETWEEN 1 AND 60 AND name::text = btrim(name::text)
    AND name NOT IN ('Hỏi đáp', 'Thảo luận', 'Chia sẻ kinh nghiệm', 'Giới thiệu sự kiện / dự án')
  ),
  CONSTRAINT "bot_conversation_types_description_check" CHECK (char_length(description) <= 2000)
);
-- Equality seek and concurrency-safe case-insensitive uniqueness; no lower() filter needed.
CREATE UNIQUE INDEX "bot_conversation_types_name_key" ON "bot_conversation_types" ("name");
