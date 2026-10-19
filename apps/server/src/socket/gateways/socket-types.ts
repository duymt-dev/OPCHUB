import type { ErrorCode } from '@opchub/shared';
import type { SocketAckError } from '@opchub/shared/socket';
import type { Server, Socket } from 'socket.io';
import { ZodError } from 'zod';
import type { AccessClaims } from '@/common/auth';
import { AppError } from '@/common/errors';

/** Trạng thái gắn với socket: người dùng + cache quyền phòng (S-02) — không state nghiệp vụ khác */
export interface SocketData {
  user: AccessClaims;
  rooms: Set<string>;
  /** V2Q-92: kết nối chờ phí — chỉ nhận sự kiện `user:{id}`, không tính online */
  limited: boolean;
}

export type AppSocket = Socket<Record<string, never>, Record<string, never>, never, SocketData>;
export type AppServer = Server<Record<string, never>, Record<string, never>, never, SocketData>;

export type Ack<T> = { ok: true; data: T } | SocketAckError;

/** Lỗi handshake: client nhận `connect_error` với `err.message` + `err.data.code` */
export class HandshakeError extends Error {
  readonly data: { code: ErrorCode };

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.data = { code };
  }
}

/** Mọi lỗi trong handler → ack `{ ok: false }` cùng mã với REST */
export function ackError(err: unknown): SocketAckError {
  if (err instanceof AppError)
    return { ok: false, error: { code: err.code, message: err.message } };
  if (err instanceof ZodError) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ' } };
  }
  return { ok: false, error: { code: 'INTERNAL', message: 'Lỗi hệ thống, vui lòng thử lại' } };
}

export async function toAck<T>(fn: () => Promise<T>): Promise<Ack<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return ackError(err);
  }
}

/**
 * Kết nối `scope: membership` khi chưa/hết phí (V2Q-92): mọi sự kiện client trả ack
 * MEMBERSHIP_REQUIRED và bị bỏ — không tới handler chat (room.join, message.*).
 */
export function rejectClientEvents(socket: AppSocket): void {
  socket.use((packet) => {
    const ack: unknown = packet.at(-1);
    if (typeof ack !== 'function') return;
    const reply: SocketAckError = {
      ok: false,
      error: { code: 'MEMBERSHIP_REQUIRED', message: 'Vui lòng đóng phí thành viên để tiếp tục' },
    };
    (ack as (r: SocketAckError) => void)(reply);
  });
}
