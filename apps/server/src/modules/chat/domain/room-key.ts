/** @nhắc lấy từ `mentions[]` của client — chỉ giữ id hợp lệ, bỏ chính mình, tối đa 20 */
export function mentionTargets(mentions: readonly string[], senderId: string): string[] {
  return [...new Set(mentions)].filter((id) => id && id !== senderId).slice(0, 20);
}
