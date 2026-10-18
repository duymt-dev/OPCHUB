import { esc } from '@/modules/mail';

/** Dữ liệu một người nhận để thay biến (NA-27) */
export interface MailVarValues {
  fullName: string;
  email: string;
  /** Tên nhóm đầu tiên của người nhận; không có → '' (V2Q-65) */
  group: string;
  loginUrl: string;
}

const VAR = /\{\{([a-z_]+)\}\}/g;

/**
 * Thay `{{ten}} {{email}} {{nhom}} {{link_dang_nhap}}` trong HTML đã sanitize lúc ghi. Giá trị qua
 * `esc()` (tên "Nguyễn <An>" → `Nguyễn &lt;An&gt;`); biến lạ giữ nguyên.
 */
export function replaceMailVars(html: string, v: MailVarValues): string {
  const values: Record<string, string> = {
    ten: v.fullName,
    email: v.email,
    nhom: v.group,
    link_dang_nhap: v.loginUrl,
  };
  return html.replace(VAR, (all, name: string) => {
    const val = values[name];
    return val === undefined ? all : esc(val);
  });
}

/** Bọc layout thư + lời chào (escape tên) quanh nội dung đã thay biến */
export function personalize(bodyHtml: string, v: MailVarValues): string {
  return (
    `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
    `<p>Xin chào ${esc(v.fullName)},</p>${replaceMailVars(bodyHtml, v)}` +
    `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`
  );
}
