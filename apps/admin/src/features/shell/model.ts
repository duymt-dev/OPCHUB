/** "Vừa xong / x phút / giờ / ngày trước" của thông báo (như Portal) */
export function noticeAgo(
  at: string,
  now: number,
): { key: 'now' | 'minutes' | 'hours' | 'days'; n: number } {
  const s = Math.max(0, (now - Date.parse(at)) / 1000);
  if (s < 60) return { key: 'now', n: 0 };
  if (s < 3600) return { key: 'minutes', n: Math.floor(s / 60) };
  if (s < 86400) return { key: 'hours', n: Math.floor(s / 3600) };
  return { key: 'days', n: Math.floor(s / 86400) };
}

/**
 * BUG-023: `link` của thông báo là route Admin khi bắt đầu bằng `/` (không `//`) và khớp một
 * prefix menu (`/requests`, `/requests?code=…`, `/requests/…`). Không khớp → null (link Portal).
 */
export function adminLinkOf(link: string, prefixes: readonly string[]): string | null {
  if (!link.startsWith('/') || link.startsWith('//') || link.startsWith('/\\')) return null;
  const path = link.split(/[?#]/)[0] ?? '';
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`)) ? link : null;
}
