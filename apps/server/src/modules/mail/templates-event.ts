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

interface EventInfo {
  title: string;
  startsAt: Date;
  mode: 'online' | 'offline';
  address: string | null;
}

/** Mail xác nhận đăng ký sự kiện (B31 → B41) — mọi giá trị chèn đều escape */
export function eventRegisteredMail(ev: EventInfo, fullName: string, link: string): RenderedMail {
  const when = VN_WHEN.format(ev.startsAt);
  const where = ev.mode === 'online' ? 'Trực tuyến' : (ev.address ?? '');
  const subject = `Xác nhận đăng ký: ${ev.title}`;
  return {
    subject,
    html:
      `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f">` +
      `<h2 style="color:#1677ff">${esc(subject)}</h2>` +
      `<p>Xin chào ${esc(fullName)},</p>` +
      `<p>Bạn đã đăng ký tham gia <b>${esc(ev.title)}</b>.</p>` +
      `<ul><li>Thời gian: ${esc(when)}</li>${where ? `<li>Địa điểm: ${esc(where)}</li>` : ''}</ul>` +
      `<p><a href="${esc(link)}">Xem chi tiết sự kiện</a></p>` +
      `<p style="color:#8c8c8c;font-size:12px">OPC Hub Community</p></body></html>`,
    text: `Bạn đã đăng ký ${ev.title} — ${when}. ${link}`,
  };
}
