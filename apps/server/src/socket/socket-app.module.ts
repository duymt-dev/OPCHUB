import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { notFound } from '@/common/errors';
import { ChatGateway } from './gateways/chat.gateway';
import { SocketAuth } from './gateways/socket-auth';
import { UserEventsSubscriber } from './gateways/user-events.subscriber';
import { ROOM_ACCESS_PORT, type RoomAccessPort } from './room-access.port';

/** Tới khi domain chat (B23) cung cấp: mọi phòng 404 */
const noRooms: RoomAccessPort = { join: () => Promise.reject(notFound('Không tìm thấy phòng')) };

/** Process Socket.IO (S-09) — gateway dùng chung module nghiệp vụ qua cổng */
@Module({
  imports: [CoreModule],
  providers: [
    SocketAuth,
    UserEventsSubscriber,
    ChatGateway,
    { provide: ROOM_ACCESS_PORT, useValue: noRooms },
  ],
})
export class SocketAppModule {}
