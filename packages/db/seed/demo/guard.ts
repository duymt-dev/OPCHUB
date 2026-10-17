/** Seed demo chỉ được chạy trên DB dev/test cục bộ (TIP-B62) — chặn trước khi mở kết nối */
export const ALLOWED_DATABASES: readonly string[] = ['opchub_dev', 'opchub_test'];

/** Tên DB trong URL Postgres (`postgresql://u:p@h:5432/<db>?…`) */
export function databaseNameOf(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

/** Ném lỗi rõ ràng nếu URL không trỏ tới opchub_dev / opchub_test (không in URL vì có mật khẩu) */
export function assertDemoDatabase(url: string): string {
  const name = databaseNameOf(url);
  if (!ALLOWED_DATABASES.includes(name)) {
    throw new Error(
      `seed:demo chỉ chạy trên ${ALLOWED_DATABASES.join(' / ')} — DIRECT_URL đang trỏ tới "${name}". Dừng.`,
    );
  }
  return name;
}
