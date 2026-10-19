import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { ChatCoreModule, ChatRoomAccess } from '@/modules/chat';
import { CommunityCoreModule } from '@/modules/community';
import { MailCoreModule } from '@/modules/mail';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { ModerationCoreModule } from '@/modules/moderation';
import { SettingsCoreModule } from '@/modules/settings';
import { ChatGateway } from './gateways/chat.gateway';
import { ConnectRate } from './gateways/connect-rate';
import { MessageGateway } from './gateways/message.gateway';
import { RoomEventsSubscriber } from './gateways/room-events.subscriber';
import { SocketAuth } from './gateways/socket-auth';
import { UserEventsSubscriber } from './gateways/user-events.subscriber';
import { ROOM_ACCESS_PORT } from './room-access.port';

/** Process Socket.IO (S-09) — gateway dùng chung module nghiệp vụ (cùng bộ Core như worker) */
@Module({
  imports: [
    CoreModule,
    SettingsCoreModule,
    MailCoreModule,
    MembershipFeeCoreModule,
    CommunityCoreModule,
    ChatCoreModule,
    ModerationCoreModule,
  ],
  providers: [
    SocketAuth,
    ConnectRate,
    UserEventsSubscriber,
    RoomEventsSubscriber,
    ChatGateway,
    MessageGateway,
    { provide: ROOM_ACCESS_PORT, useExisting: ChatRoomAccess },
  ],
})
export class SocketAppModule {}
