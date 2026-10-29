import { Prisma } from '@opchub/db';
import type { GroupFileKind } from '@opchub/shared/api-domains';
import { containsPattern } from '@/common/prisma/like';

export interface GroupFileRow {
  id: string;
  room_id: string;
  room_slug: string;
  room_name: string;
  kind: 'file' | 'image';
  attachment: unknown;
  sender: string;
  created_at: Date;
}

export interface GroupFileFilter {
  groupId: string;
  kind: GroupFileKind;
  q: string;
  /** Id tin cuối của trang trước (keyset `(created_at, id)`) */
  before: string | undefined;
  limit: number;
}

/** Tin file / ảnh còn hiển thị của chủ đề còn sống trong nhóm — khớp partial index `messages_files_room_created_at_id_idx` */
const VISIBLE = Prisma.sql`m.kind IN ('file', 'image') AND m.hidden_at IS NULL AND m.deleted_at IS NULL`;
const roomsOf = (groupId: string) =>
  Prisma.sql`JOIN rooms r ON r.id = m.room_id AND r.group_id = ${groupId} AND r.deleted_at IS NULL`;

const KIND_SQL: Record<Exclude<GroupFileKind, 'all'>, Prisma.Sql> = {
  doc: Prisma.sql`AND m.kind = 'file'`,
  img: Prisma.sql`AND m.kind = 'image'`,
};

/**
 * D-98 trang "File chia sẻ": mới nhất trước, keyset theo tin cuối trang trước; tìm theo tên tệp hoặc người gửi
 * (không dấu). Phòng của nhóm ít → Index Scan partial theo từng phòng, không Seq Scan `messages`.
 */
export function groupFilesQuery(f: GroupFileFilter): Prisma.Sql {
  const kind = f.kind === 'all' ? Prisma.empty : KIND_SQL[f.kind];
  const cursor = f.before
    ? Prisma.sql`AND (m.created_at, m.id) < (SELECT c.created_at, c.id FROM messages c WHERE c.id = ${f.before})`
    : Prisma.empty;
  const search = f.q
    ? Prisma.sql`AND immutable_unaccent(coalesce(m.attachment->>'name', '') || ' ' ||
        coalesce(u.full_name, p.name, '')) ILIKE immutable_unaccent(${containsPattern(f.q)})`
    : Prisma.empty;
  return Prisma.sql`
    SELECT m.id, m.room_id, r.slug AS room_slug, r.name AS room_name, m.kind::text AS kind, m.attachment,
           coalesce(u.full_name, p.name, 'Hệ thống') AS sender, m.created_at
    FROM messages m
    ${roomsOf(f.groupId)}
    LEFT JOIN users u ON u.id = m.sender_id
    LEFT JOIN personas p ON p.id = m.persona_id
    WHERE ${VISIBLE} ${kind} ${cursor} ${search}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ${f.limit}`;
}

/** Chip "Tất cả · N / Tài liệu · N / Hình ảnh · N" — đếm toàn bộ (không theo ô tìm) */
export const groupFileCountsQuery = (groupId: string) => Prisma.sql`
  SELECT count(*)::int AS "all",
         count(*) FILTER (WHERE m.kind = 'file')::int AS doc,
         count(*) FILTER (WHERE m.kind = 'image')::int AS img
  FROM messages m
  ${roomsOf(groupId)}
  WHERE ${VISIBLE}`;
