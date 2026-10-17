

-- CreateTable
CREATE TABLE "investor_summaries" (
    "investor_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_interest_id" TEXT NOT NULL,
    "kind" "investor_kind" NOT NULL,
    "organization" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "total_amount" BIGINT NOT NULL DEFAULT 0,
    "interest_count" INTEGER NOT NULL DEFAULT 0,
    "status" "investor_interest_status" NOT NULL DEFAULT 'sent',
    "last_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "investor_summaries_pkey" PRIMARY KEY ("investor_key")
);

-- CreateIndex
CREATE INDEX "investor_summaries_last_at_investor_key_idx" ON "investor_summaries"("last_at" DESC, "investor_key");

-- CreateIndex
CREATE INDEX "investor_summaries_kind_last_at_investor_key_idx" ON "investor_summaries"("kind", "last_at" DESC, "investor_key");

-- AddForeignKey
ALTER TABLE "investor_summaries" ADD CONSTRAINT "investor_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Dựng lại tổng hợp từ dữ liệu hiện có (một câu, không vòng lặp)
INSERT INTO "investor_summaries" (investor_key, user_id, first_interest_id, kind, organization, phone,
                                  total_amount, interest_count, status, last_at, updated_at)
SELECT g.investor_key, l.user_id, g.first_id, l.kind, l.organization, l.phone,
       g.total_amount, g.n, g.status, g.last_at, now()
FROM (
  SELECT investor_key,
         (array_agg(id ORDER BY created_at, id))[1] AS first_id,
         (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS last_id,
         SUM(amount)::bigint AS total_amount, count(*)::int AS n, MAX(created_at) AS last_at,
         (array_agg(status ORDER BY array_position(
           ARRAY['connected','in_discussion','sent']::investor_interest_status[], status)))[1] AS status
  FROM investor_interests GROUP BY investor_key
) g JOIN investor_interests l ON l.id = g.last_id;
