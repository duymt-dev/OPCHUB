import { Injectable } from '@nestjs/common';
import { type LiveActor, LiveCountersService } from '@/common/realtime';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';

export interface SentMessage {
  id: string;
  roomId: string;
  groupId: string;
  groupName: string;
  /** null = persona / hệ thống */
  senderId: string | null;
  sender: LiveActor;
  at: Date;
}

/**
 * Sau commit một tin (người thật hoặc persona): mục "nhắn tin" ở hoạt động trực tiếp Dashboard
 * + bộ đếm tin (NA-24), và `unread.bump` vào room nhóm (NA-25) — một PUBLISH cho cả nhóm,
 * không đụng từng người nhận (S-02, S-04). Lỗi Redis không làm hỏng việc gửi tin.
 */
@Injectable()
export class ChatFeedService {
  constructor(
    private readonly live: LiveCountersService,
    private readonly roomEvents: RoomEventsPublisher,
  ) {}

  async sent(m: SentMessage): Promise<void> {
    await Promise.all([
      this.live.record('msg', m.sender, m.groupName, m.id, m.at),
      this.roomEvents.unreadBump({ roomId: m.roomId, groupId: m.groupId, senderId: m.senderId }),
    ]).catch(() => undefined);
  }
}
