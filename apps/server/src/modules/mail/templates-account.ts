import { actionButton, otpPanel } from './email-layout';
import { esc, layout, type RenderedMail } from './templates';

/** Thư tài khoản (BUG-030): đổi email đăng nhập — OTP gửi email MỚI, thông báo gửi email CŨ */

export function emailChangeMail(code: string, ttlMin: number): RenderedMail {
  return {
    subject: `Mã xác nhận đổi email OPC Hub: ${code}`,
    html: layout(
      'Xác nhận email đăng nhập mới',
      `<p>Bạn vừa yêu cầu dùng email này làm email đăng nhập OPC Hub. Mã xác nhận:</p>` +
        otpPanel(code) +
        `<p>Mã có hiệu lực ${ttlMin} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    ),
    text: `Mã xác nhận đổi email OPC Hub: ${code} (hiệu lực ${ttlMin} phút)`,
  };
}

export function passwordResetMail(link: string): RenderedMail {
  return {
    subject: 'Đặt lại mật khẩu OPC Hub',
    html: layout(
      'Đặt lại mật khẩu',
      `<p>Xin chào,</p><p>Bấm vào liên kết dưới đây để đặt mật khẩu mới (hiệu lực 15 phút):</p>` +
        actionButton('Đặt lại mật khẩu', link) +
        `<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    ),
    text: `Đặt lại mật khẩu OPC Hub (hiệu lực 15 phút): ${link}. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
  };
}

/** Gửi tới email CŨ: không chứa email mới đầy đủ (chỉ dạng che) để không lộ khi hộp thư cũ bị chiếm */
export function emailChangedMail(maskedNewEmail: string): RenderedMail {
  return {
    subject: 'Email đăng nhập OPC Hub đã đổi',
    html: layout(
      'Email đăng nhập đã đổi',
      `<p>Email đăng nhập tài khoản OPC Hub của bạn vừa được đổi sang <b>${esc(maskedNewEmail)}</b>.</p>` +
        `<p>Các thiết bị khác đã bị đăng xuất. Nếu không phải bạn thực hiện, hãy liên hệ quản trị viên ngay.</p>`,
    ),
    text: `Email đăng nhập OPC Hub đã đổi sang ${maskedNewEmail}. Nếu không phải bạn, hãy liên hệ quản trị viên.`,
  };
}

/** `nguyen.van.an@x.vn` → `ng***@x.vn` */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return '***';
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}
