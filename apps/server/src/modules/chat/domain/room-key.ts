/**
 * Phòng có id dạng `<groupId>-<slug>` (seed: `c1-general`); URL Portal dùng `key` = slug
 * (`/chat/:groupId/:key`). Phòng mới tạo theo cùng quy ước để id ổn định, dễ đọc.
 */
export const roomIdOf = (groupId: string, slug: string) => `${groupId}-${slug}`;

/** Slug chủ đề từ tên: bỏ dấu, chữ thường, `-`; trùng thì thêm số */
export function topicSlug(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'topic';
  let slug = base;
  for (let i = 2; taken.has(slug); i += 1) slug = `${base}-${i}`;
  return slug;
}

/** @nhắc lấy từ `mentions[]` của client — chỉ giữ id hợp lệ, bỏ chính mình, tối đa 20 */
export function mentionTargets(mentions: readonly string[], senderId: string): string[] {
  return [...new Set(mentions)].filter((id) => id && id !== senderId).slice(0, 20);
}
