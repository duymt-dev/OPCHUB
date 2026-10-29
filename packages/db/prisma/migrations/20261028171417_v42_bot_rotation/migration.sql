-- CreateTable
CREATE TABLE "bot_rotation_cursors" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "last_script_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bot_rotation_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_rotation_cursors_group_id_key" ON "bot_rotation_cursors"("group_id");

-- AddForeignKey
ALTER TABLE "bot_rotation_cursors" ADD CONSTRAINT "bot_rotation_cursors_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- D-112: group membership and ordered script-ID cursor paths, without wide JSON lines.
CREATE INDEX bot_scripts_rotation_groups_idx ON bot_scripts USING gin (group_ids) WHERE enabled;
CREATE INDEX bot_scripts_rotation_cursor_idx ON bot_scripts (id) INCLUDE (run_at) WHERE enabled;
