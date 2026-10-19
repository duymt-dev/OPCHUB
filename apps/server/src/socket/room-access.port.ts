import type { AccessClaims } from '@/common/auth';

/**
 * Gateway hỏi domain chat (B23) một lần khi `room.join` (S-02): phòng có tồn tại, người gọi có quyền
 * đọc + gửi; trả kèm số chưa đọc. Lỗi → ném AppError (FORBIDDEN / NOT_FOUND) → ack lỗi.
 */
export interface RoomAccessPort {
  join(user: AccessClaims, roomId: string): Promise<{ unread: number }>;
  /** NA-25: lọc nhóm user đang là thành viên để vào room `group:{id}` nhận `unread.bump` */
  watchable(user: AccessClaims, groupIds: readonly string[]): Promise<string[]>;
}

export const ROOM_ACCESS_PORT = Symbol('ROOM_ACCESS_PORT');
