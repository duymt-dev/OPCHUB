import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { clientEvents, socketRooms } from '@opchub/shared/socket';
import { AppError } from '@/common/errors';
import { PresenceService } from '@/common/realtime/presence.service';
import { ROOM_ACCESS_PORT, type RoomAccessPort } from '../room-access.port';
import { SocketAuth } from './socket-auth';
import { type Ack, type AppServer, type AppSocket, HandshakeError, toAck } from './socket-types';
import { UserEventsSubscriber } from './user-events.subscriber';

/** S-01: phát số online gom mỗi ≤ 5s; heartbeat presence 30s */
const ONLINE_FLUSH_MS = 2_000;
const HEARTBEAT_MS = 30_000;

/**
 * Gateway chat (S-02, S-09): handshake JWT → `user:{id}`; `room.join` kiểm quyền 1 lần rồi cache
 * trong `socket.data.rooms`. Gửi/react/pin tin (B23) dùng cache này, không truy vấn quyền lại.
 */
@WebSocketGateway()
export class ChatGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly auth: SocketAuth,
    private readonly presence: PresenceService,
    private readonly userEvents: UserEventsSubscriber,
    @Inject(ROOM_ACCESS_PORT) private readonly access: RoomAccessPort,
  ) {}

  afterInit(io: AppServer): void {
    io.use((socket, next) => {
      this.auth
        .authenticate(socket.handshake.auth)
        .then((user) => {
          socket.data.user = user;
          socket.data.rooms = new Set();
          void socket.join(socketRooms.user(user.sub));
          next();
        })
        .catch((err: unknown) => {
          const e =
            err instanceof AppError
              ? new HandshakeError(err.code, err.message)
              : new HandshakeError('UNAUTHORIZED', 'Vui lòng đăng nhập');
          next(e);
        });
    });
    void this.userEvents.start(io);
    this.presence.startTicker(ONLINE_FLUSH_MS, () => this.flushOnline(io));
    setInterval(() => void this.heartbeat(io).catch(() => undefined), HEARTBEAT_MS).unref();
    this.logger.log('Socket.IO sẵn sàng');
  }

  handleDisconnect(socket: AppSocket): void {
    const rooms = [...(socket.data.rooms ?? [])];
    void this.presence.leave(rooms, socket.id).catch(() => undefined);
  }

  @SubscribeMessage('room.join')
  roomJoin(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ unread: number; online: number }>> {
    return toAck(async () => {
      const { roomId } = clientEvents['room.join'].payload.parse(body);
      const { unread } = await this.access.join(socket.data.user, roomId);
      socket.data.rooms.add(roomId);
      await socket.join(socketRooms.room(roomId));
      const online = await this.presence.enter(roomId, socket.id);
      return { unread, online };
    });
  }

  @SubscribeMessage('room.leave')
  roomLeave(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<Record<string, never>>> {
    return toAck(async () => {
      const { roomId } = clientEvents['room.leave'].payload.parse(body);
      if (socket.data.rooms.delete(roomId)) {
        await socket.leave(socketRooms.room(roomId));
        await this.presence.leave([roomId], socket.id);
      }
      return {};
    });
  }

  /** Mỗi process SPOP phần phòng bẩn của mình, phát qua adapter tới mọi process */
  private async flushOnline(io: AppServer): Promise<void> {
    const ids = await this.presence.drainDirty();
    if (!ids.length) return;
    const counts = await this.presence.counts(ids);
    for (const [roomId, online] of counts) {
      io.to(socketRooms.room(roomId)).emit('room.online', { roomId, online });
    }
  }

  /** Gia hạn presence cho socket cục bộ — 1 pipeline */
  private async heartbeat(io: AppServer): Promise<void> {
    const entries: [string, string[]][] = [];
    for (const s of io.of('/').sockets.values()) {
      if (s.data.rooms?.size) entries.push([s.id, [...s.data.rooms]]);
    }
    await this.presence.touchMany(entries);
  }
}
