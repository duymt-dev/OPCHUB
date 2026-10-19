-- TIP-V2-109 (BUG-016, QT-09): liên hệ công khai của dự án. Không index (không lọc theo cột này).
ALTER TABLE "projects" ADD COLUMN "contact_email" CITEXT, ADD COLUMN "contact_phone" TEXT;
