import { Injectable, Module } from '@nestjs/common';
import type { AccessClaims } from '@/common/auth';
import { CommunityCoreModule } from '../community';
import { MeChatController } from './controllers/me-chat.controller';
import { MessagesController } from './controllers/messages.controller';
import { RoomsController } from './controllers/rooms.controller';
import { MessageRepository } from './repositories/message.repository';
import { RoomRepository } from './repositories/room.repository';
import { ChatAccessService } from './services/chat-access.service';
import { ChatOverviewService } from './services/chat-overview.service';
import { MessageService } from './services/message.service';
import { RoomService } from './services/room.service';
import { UnreadService } from './services/unread.service';

/** Cổng `room.join` cho gateway socket (S-02): quyền thành viên + phí, trả số chưa đọc */
@Injectable()
export class ChatRoomAccess {
  constructor(
    private readonly access: ChatAccessService,
    private readonly unread: UnreadService,
  ) {}

  async join(user: AccessClaims, roomId: string): Promise<{ unread: number }> {
    const room = await this.access.room(roomId);
    await this.access.assertMember(user, room.groupId);
    const counts = await this.unread.counts(user.sub, [roomId]);
    return { unread: counts.get(roomId) ?? 0 };
  }
}

const services = [
  MessageRepository,
  RoomRepository,
  ChatAccessService,
  UnreadService,
  MessageService,
  RoomService,
  ChatOverviewService,
  ChatRoomAccess,
];

/** Service chat — api (REST) + socket (gateway) + worker */
@Module({
  imports: [CommunityCoreModule],
  providers: services,
  exports: services,
})
export class ChatCoreModule {}

@Module({
  imports: [ChatCoreModule],
  controllers: [MeChatController, RoomsController, MessagesController],
})
export class ChatHttpModule {}
