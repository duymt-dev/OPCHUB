import { mockDb } from './store';
import { publishMockNotification } from './notification-runtime';
export function mockAppTestNotification(userId: string): void {
  publishMockNotification(mockDb(), userId, {
    id: `app-test-${crypto.randomUUID()}`,
    type: 'system',
    title: 'Thông báo thử từ OPC Hub',
    body: 'Thông báo đẩy đang hoạt động trên thiết bị của bạn.',
    link: '',
    read: false,
    createdAt: new Date().toISOString(),
  });
}
