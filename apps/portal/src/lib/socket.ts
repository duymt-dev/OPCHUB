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
    // V2Q-92: `scope: membership` — TK chưa/hết phí vẫn nối được để nhận `membership.updated`
    // (server chỉ cho vào `user:{id}`, chặn sự kiện chat); đã có phí thì server cấp quyền đầy đủ
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? '', scope: 'membership' }),
  });
  return socket;
}

/** Phiên kết thúc (thu hồi / đăng xuất): bỏ kết nối cũ, lần đăng nhập sau tạo kết nối mới */
export function resetSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
