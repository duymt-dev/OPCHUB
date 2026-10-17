import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/auth-store';
import { env } from '@/lib/env';

let socket: Socket | null = null;

/** Server đẩy realtime (Socket.IO) chỉ có khi chạy API thật; MSW không có kênh đẩy */
export const realtimeEnabled = env.NEXT_PUBLIC_API_MOCKING !== 'msw';

/**
 * Một kết nối cho cả tab (chat + thông báo); token lấy lúc (re)connect nên refresh xong tự dùng
 * token mới. Handshake JWT → server cho vào room `user:{id}` (S-02).
 */
export function getSocket(): Socket {
  socket ??= io(env.NEXT_PUBLIC_SOCKET_URL ?? '', {
    transports: ['websocket'],
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '' }),
  });
  return socket;
}
