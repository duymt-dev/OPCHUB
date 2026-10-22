import { actionButton } from './email-layout';
import { esc, layout, type RenderedMail } from './templates';

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
    html: layout(
      subject,
      `<p>Xin chào ${esc(fullName)},</p>` +
        `<p>Bạn đã đăng ký tham gia <b>${esc(ev.title)}</b>.</p>` +
        `<ul><li>Thời gian: ${esc(when)}</li>${whereHtml(ev)}</ul>` +
        actionButton('Xem chi tiết sự kiện', link),
    ),
    text: `Bạn đã đăng ký ${ev.title} — ${when}. ${eventWhereLine(ev)} ${link}`,
  };
}

/** NA-23: nhắc 24h trước giờ bắt đầu — kèm link phòng họp / địa chỉ */
export function eventReminderMail(ev: EventInfo, fullName: string, link: string): RenderedMail {
  const when = VN_WHEN.format(ev.startsAt);
  const subject = `Nhắc lịch: ${ev.title} bắt đầu sau 24 giờ`;
  return {
    subject,
    html: layout(
      subject,
      `<p>Xin chào ${esc(fullName)},</p>` +
        `<p>Sự kiện <b>${esc(ev.title)}</b> bạn đã đăng ký sẽ bắt đầu lúc ${esc(when)}.</p>` +
        `<ul>${whereHtml(ev)}</ul>` +
        actionButton('Xem chi tiết sự kiện', link),
    ),
    text: `${ev.title} bắt đầu lúc ${when}. ${eventWhereLine(ev)} ${link}`,
  };
}
