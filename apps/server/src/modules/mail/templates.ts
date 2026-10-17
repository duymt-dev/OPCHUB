import type { WelcomeMail } from '@opchub/shared/api-domains';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
/** Mọi giá trị chèn vào HTML đều escape (họ tên, nội dung do Admin soạn) */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

const layout = (title: string, body: string) =>
  `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
  `<h2 style="color:#1677ff">${esc(title)}</h2>${body}` +
  `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`;

export function otpMail(code: string, ttlMin: number): RenderedMail {
  const subject = `Mã xác thực OPC Hub: ${code}`;
  return {
    subject,
    html: layout(
      'Xác thực email',
      `<p>Mã OTP của bạn là:</p><p style="font-size:28px;letter-spacing:6px"><b>${esc(code)}</b></p>` +
        `<p>Mã có hiệu lực ${ttlMin} phút. Không chia sẻ mã này cho bất kỳ ai.</p>`,
    ),
    text: `Mã OTP của bạn: ${code} (hiệu lực ${ttlMin} phút)`,
  };
}

/** D-47: không có mật khẩu tạm — chỉ nút "Đăng nhập" */
export function welcomeMail(tpl: WelcomeMail, fullName: string): RenderedMail {
  const rules = tpl.showRules
    ? `<ol>${tpl.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`
    : '';
  const guide = tpl.showGuide ? `<p><a href="${esc(tpl.guideUrl)}">Hướng dẫn sử dụng</a></p>` : '';
  const atts = tpl.attachments
    .map((a) => `<li><a href="${esc(a.url)}">${esc(a.title)}</a></li>`)
    .join('');
  return {
    subject: tpl.subject,
    html: layout(
      tpl.subject,
      `<p>Xin chào ${esc(fullName)},</p><p>${esc(tpl.intro)}</p>${rules}${guide}` +
        (atts ? `<ul>${atts}</ul>` : '') +
        `<p><a href="${esc(tpl.loginUrl)}" style="background:#1677ff;color:#fff;padding:8px 16px;` +
        `border-radius:6px;text-decoration:none">Đăng nhập</a></p>`,
    ),
    text: `Xin chào ${fullName},\n${tpl.intro}\nĐăng nhập: ${tpl.loginUrl}`,
  };
}
