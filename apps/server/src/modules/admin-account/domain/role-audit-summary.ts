/** Audit summaries are bounded captions; the complete permission matrix stays in diff. */
export function roleAuditSummary(names: readonly string[]): string {
  const prefix = 'cập nhật phân quyền ';
  const caption = prefix + names.join(', ');
  if (caption.length <= 500) return caption;
  const suffix = `… (${names.length} vai trò)`;
  const head = caption.slice(0, 500 - suffix.length).replace(/[\uD800-\uDBFF]$/, '');
  return head + suffix;
}
