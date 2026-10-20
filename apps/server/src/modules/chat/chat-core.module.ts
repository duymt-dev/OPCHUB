import { Injectable, Module } from '@nestjs/common';
import type { AccessClaims } from '@/common/auth';
import { CommunityCoreModule } from '../community';
import { UploadsCoreModule } from '../uploads';
import { MeChatController } from './controllers/me-chat.controller';
import { MessagesController } from './controllers/messages.controller';
import { RoomsController } from './controllers/rooms.controller';
import { MessageRepository } from './repositories/message.repository';
import { RoomRepository } from './repositories/room.repository';
import { ChatAccessService } from './services/chat-access.service';
import { ChatFeedService } from './services/chat-feed.service';
import { ChatOverviewService } from './services/chat-overview.service';
import { MessageService } from './services/message.service';
import { PersonaMessageService } from './services/persona-message.service';
import { PersonaTurnWriter } from './services/persona-turn-writer';
import { PersonaTurnPublisher } from './services/persona-turn-publisher';
import { PersonaReplyContextService } from './services/persona-reply-context.service';
import { PersonaVisibilityService } from './services/persona-visibility.service';
import { PersonaHideRepository } from './repositories/persona-hide.repository';
import { RoomService } from './services/room.service';
import { UnreadService } from './services/unread.service';

/** Cổng `room.join` cho gateway socket (S-02): quyền thành viên + phí, trả số chưa đọc */
@Injectable()
export class ChatRoomAccess {
  constructor(
    private readonly access: ChatAccessService,
    private readonly unread: UnreadService,
    private readonly overview: ChatOverviewService,
  ) {}

  async join(user: AccessClaims, roomId: string): Promise<{ unread: number }> {
    const room = await this.access.room(roomId);
    await this.access.assertMember(user, room.groupId);
    const counts = await this.unread.counts(user.sub, [roomId]);
    return { unread: counts.get(roomId) ?? 0 };
  }

  /** NA-25: nhóm (trong danh sách xin theo dõi) mà user đang là thành viên — 1 query */
  watchable(user: AccessClaims, groupIds: readonly string[]): Promise<string[]> {
    return this.overview.memberGroups(user.sub, groupIds);
  }
}

const services = [
  PersonaVisibilityService,
  PersonaHideRepository,
  PersonaMessageService,
  PersonaTurnWriter,
  PersonaTurnPublisher,
  PersonaReplyContextService,
  MessageRepository,
  RoomRepository,
  ChatAccessService,
  UnreadService,
  ChatFeedService,
  MessageService,
  RoomService,
  ChatOverviewService,
  ChatRoomAccess,
];

/** Service chat — api (REST) + socket (gateway) + worker */
@Module({
  imports: [CommunityCoreModule, UploadsCoreModule],
  providers: services,
  exports: services,
})
export class ChatCoreModule {}

@Module({
  imports: [ChatCoreModule],
  controllers: [MeChatController, RoomsController, MessagesController],
})
export class ChatHttpModule {}
