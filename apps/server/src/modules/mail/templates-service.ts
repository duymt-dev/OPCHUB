import { esc, type RenderedMail } from './templates';

/** NA-22 (REQ-222): xác nhận phiếu yêu cầu dịch vụ — mã YC + tên dịch vụ */
export function serviceRequestMail(
  code: string,
  serviceName: string,
  fullName: string,
): RenderedMail {
  const subject = `Đã nhận yêu cầu ${code}: ${serviceName}`;
  return {
    subject,
    html:
      `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
      `<h2 style="color:#1677ff">${esc(subject)}</h2>` +
      `<p>Xin chào ${esc(fullName)},</p>` +
      `<p>OPC Hub đã nhận yêu cầu <b>${esc(code)}</b> cho dịch vụ <b>${esc(serviceName)}</b>.</p>` +
      `<p>OPC Hub sẽ liên hệ lại với bạn trong thời gian sớm nhất.</p>` +
      `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`,
    text: `OPC Hub đã nhận yêu cầu ${code} (${serviceName}). OPC Hub sẽ liên hệ lại với bạn.`,
  };
}
