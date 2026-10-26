import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { ChatCoreModule, ChatRoomAccess } from '@/modules/chat';
import { CommunityCoreModule } from '@/modules/community';
import { DashboardCoreModule } from '@/modules/dashboard';
import { MailCoreModule } from '@/modules/mail';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { ModerationCoreModule } from '@/modules/moderation';
import { OnboardingCoreModule } from '@/modules/onboarding';
import { SettingsCoreModule } from '@/modules/settings';
import { ChatGateway } from './gateways/chat.gateway';
import { ConnectRate } from './gateways/connect-rate';
import { MessageGateway } from './gateways/message.gateway';
import { MetricsGateway } from './gateways/metrics.gateway';
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
    DashboardCoreModule,
    // AccountCoreModule (qua community) cần ONBOARDING_PORT cho bảng Admin › Thành viên (V4-611)
    OnboardingCoreModule,
  ],
  providers: [
    SocketAuth,
    ConnectRate,
    UserEventsSubscriber,
    RoomEventsSubscriber,
    ChatGateway,
    MessageGateway,
    MetricsGateway,
    { provide: ROOM_ACCESS_PORT, useExisting: ChatRoomAccess },
  ],
})
export class SocketAppModule {}
