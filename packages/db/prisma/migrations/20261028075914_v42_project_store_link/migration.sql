-- TIP-V42-711 (QT-ST-PJ): projects.store_id (gian hàng đăng dự án, nullable) + projects.province
-- (D-109, BR-TRIAL-04 — tỉnh riêng của dự án, không suy từ group). KHÔNG đụng index viết tay khác.

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "province" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "store_id" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index cho lọc dự án theo gian hàng (trang chi tiết gian hàng)
CREATE INDEX "projects_store_id_idx" ON "projects"("store_id");
