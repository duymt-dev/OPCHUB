/** Chỉ chấp nhận đường dẫn nội bộ (chống open redirect) */
export function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
