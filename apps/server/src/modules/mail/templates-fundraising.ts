import { esc, layout, type RenderedMail } from './templates';
import { vnDateText } from './templates-fee';

/** V4-610 (D-82): nhắc gia hạn T-14 / hết hạn Gói Gọi vốn */
export type FundraisingMailKind = 'renew' | 'expired';

/** Một câu dùng chung cho mail và thông báo in-app */
export function fundraisingLine(kind: FundraisingMailKind, projectName: string, endsAt: Date) {
  return kind === 'renew'
    ? `Gói Gọi vốn của dự án ${projectName} sẽ hết hạn ngày ${vnDateText(endsAt)}. Gia hạn để tiếp tục hiển thị ở mục Gọi vốn.`
    : `Gói Gọi vốn của dự án ${projectName} đã hết hạn. Phần Gọi vốn đầu tư đã tạm ẩn; gia hạn để hiển thị lại.`;
}

export function fundraisingMail(
  kind: FundraisingMailKind,
  fullName: string,
  projectName: string,
  endsAt: Date,
): RenderedMail {
  const subject =
    kind === 'renew'
      ? `Gói Gọi vốn sắp hết hạn: ${projectName}`
      : `Gói Gọi vốn đã hết hạn: ${projectName}`;
  const line = fundraisingLine(kind, projectName, endsAt);
  return {
    subject,
    html: layout(subject, `<p>Xin chào ${esc(fullName)},</p><p>${esc(line)}</p>`),
    text: line,
  };
}
