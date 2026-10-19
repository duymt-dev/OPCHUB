import { esc } from '@/modules/mail';

/** Dữ liệu một người nhận để thay biến (NA-27) */
export interface MailVarValues {
  fullName: string;
  email: string;
  /** Tên nhóm đầu tiên của người nhận; không có → '' (V2Q-65) */
  group: string;
  loginUrl: string;
  /** BUG-036: link trang huỷ nhận (chân thư chiến dịch); không có → không chèn */
  unsubscribeUrl?: string;
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

/** Chân thư chiến dịch: "Không muốn nhận email này? Huỷ đăng ký" (BUG-036, NĐ 13/2023) */
export function unsubscribeFooter(url: string): string {
  return (
    `<p style="color:#8c8c8c;font-size:12px">Không muốn nhận email này? ` +
    `<a href="${esc(url)}" style="color:#8c8c8c">Huỷ đăng ký</a></p>`
  );
}

/** Bọc layout thư + lời chào (escape tên) quanh nội dung đã thay biến */
export function personalize(bodyHtml: string, v: MailVarValues): string {
  const footer = v.unsubscribeUrl ? unsubscribeFooter(v.unsubscribeUrl) : '';
  return (
    `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
    `<p>Xin chào ${esc(v.fullName)},</p>${replaceMailVars(bodyHtml, v)}` +
    `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p>${footer}</body></html>`
  );
}
