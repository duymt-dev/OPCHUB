import { esc, type RenderedMail } from './templates';

const VN_WHEN = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export interface EventInfo {
  title: string;
  startsAt: Date;
  mode: 'online' | 'offline';
  address: string | null;
  mapUrl: string | null;
  meetUrl: string | null;
}

/** AT-EV02: link phòng họp (online / offline có phát) hoặc địa chỉ + bản đồ */
function whereHtml(ev: EventInfo): string {
  const meet = ev.meetUrl
    ? `<li>Link phòng họp: <a href="${esc(ev.meetUrl)}">${esc(ev.meetUrl)}</a></li>`
    : '';
  if (ev.mode === 'online') return meet || '<li>Địa điểm: Trực tuyến</li>';
  const map = ev.mapUrl ? ` · <a href="${esc(ev.mapUrl)}">Xem bản đồ</a>` : '';
  return `${ev.address ? `<li>Địa điểm: ${esc(ev.address)}${map}</li>` : ''}${meet}`;
}

/** Một dòng cho thông báo chuông: "Link phòng họp: meet.google.com/…" hoặc địa chỉ */
export function eventWhereLine(ev: EventInfo): string {
  if (ev.meetUrl) return `Link phòng họp: ${ev.meetUrl.replace(/^https:\/\//, '')}`;
  return ev.address ? `Địa điểm: ${ev.address}` : '';
}

/** Mail xác nhận đăng ký sự kiện (B31 → B41) — mọi giá trị chèn đều escape */
export function eventRegisteredMail(ev: EventInfo, fullName: string, link: string): RenderedMail {
  const when = VN_WHEN.format(ev.startsAt);
  const subject = `Xác nhận đăng ký: ${ev.title}`;
  return {
    subject,
    html:
      `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
      `<h2 style="color:#1677ff">${esc(subject)}</h2>` +
      `<p>Xin chào ${esc(fullName)},</p>` +
      `<p>Bạn đã đăng ký tham gia <b>${esc(ev.title)}</b>.</p>` +
      `<ul><li>Thời gian: ${esc(when)}</li>${whereHtml(ev)}</ul>` +
      `<p><a href="${esc(link)}">Xem chi tiết sự kiện</a></p>` +
      `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`,
    text: `Bạn đã đăng ký ${ev.title} — ${when}. ${eventWhereLine(ev)} ${link}`,
  };
}

/** NA-23: nhắc 24h trước giờ bắt đầu — kèm link phòng họp / địa chỉ */
export function eventReminderMail(ev: EventInfo, fullName: string, link: string): RenderedMail {
  const when = VN_WHEN.format(ev.startsAt);
  const subject = `Nhắc lịch: ${ev.title} bắt đầu sau 24 giờ`;
  return {
    subject,
    html:
      `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
      `<h2 style="color:#1677ff">${esc(subject)}</h2>` +
      `<p>Xin chào ${esc(fullName)},</p>` +
      `<p>Sự kiện <b>${esc(ev.title)}</b> bạn đã đăng ký sẽ bắt đầu lúc ${esc(when)}.</p>` +
      `<ul>${whereHtml(ev)}</ul>` +
      `<p><a href="${esc(link)}">Xem chi tiết sự kiện</a></p>` +
      `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`,
    text: `${ev.title} bắt đầu lúc ${when}. ${eventWhereLine(ev)} ${link}`,
  };
}
