import { mockDb } from './store';
import { iso, MOCK_NOW } from './util';

/**
 * Sau khi đăng ký sự kiện, server đẩy `notification.new` (SRS §13.4) để nhắc trước giờ diễn ra.
 * Mock thêm thẳng vào hộp thư của người đăng ký — giống prototype (`notify` khi đăng ký).
 */
export function notifyEventRegistered(userId: string, eventId: string): void {
  const db = mockDb();
  const e = db.events.find((x) => x.id === eventId);
  if (!e) return;
  const inbox = db.notifications.get(userId) ?? [];
  // AT-EV02: như server — link phòng họp (có Meet) hoặc địa chỉ đứng đầu
  const where = e.meetUrl
    ? `Link phòng họp: ${e.meetUrl.replace(/^https:\/\//, '')} · `
    : e.address
      ? `${e.address} · `
      : '';
  db.notifications.set(userId, [
    {
      id: `nt-ev-${eventId}-${++db.seq}`,
      type: 'event',
      title: `Đã đăng ký: ${e.title}`,
      body: `${where}Chúng tôi sẽ nhắc bạn trước khi sự kiện bắt đầu · ${e.day} ${e.time}`,
      link: `/events/${eventId}`,
      read: false,
      createdAt: iso(MOCK_NOW),
    },
    ...inbox,
  ]);
}
