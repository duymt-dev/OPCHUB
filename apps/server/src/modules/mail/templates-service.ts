import { esc, layout, type RenderedMail } from './templates';

/** NA-22 (REQ-222): xác nhận phiếu yêu cầu dịch vụ — mã YC + tên dịch vụ */
export function serviceRequestMail(
  code: string,
  serviceName: string,
  fullName: string,
): RenderedMail {
  const subject = `Đã nhận yêu cầu ${code}: ${serviceName}`;
  return {
    subject,
    html: layout(
      subject,
      `<p>Xin chào ${esc(fullName)},</p>` +
        `<p>OPC Hub đã nhận yêu cầu <b>${esc(code)}</b> cho dịch vụ <b>${esc(serviceName)}</b>.</p>` +
        `<p>OPC Hub sẽ liên hệ lại với bạn trong thời gian sớm nhất.</p>`,
    ),
    text: `OPC Hub đã nhận yêu cầu ${code} (${serviceName}). OPC Hub sẽ liên hệ lại với bạn.`,
  };
}
