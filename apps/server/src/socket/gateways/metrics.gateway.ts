import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { LiveMetrics } from '@opchub/shared/api-domains';
import { clientEvents, socketRooms } from '@opchub/shared/socket';
import { PermissionCheck } from '@/common/auth';
import { forbidden } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import { LiveMetricsService } from '@/modules/dashboard';
import { ROOM_ACCESS_PORT, type RoomAccessPort } from '../room-access.port';
import { type Ack, type AppServer, type AppSocket, toAck } from './socket-types';

/** NA-24: chu kỳ 3 giây; khoá Redis để chỉ một process socket phát mỗi nhịp */
const TICK_MS = 3_000;
const TICK_LOCK = 'dashboard:tick';

/**
 * Kênh số liệu realtime (NA-24) + theo dõi số đỏ nhóm (NA-25).
 * - `metrics.subscribe {scope}`: vào room `metrics:{scope}` (admin cần `overview.view`), ack trả
 *   ngay gói hiện tại. Tab ẩn / rời màn → client `metrics.unsubscribe`.
 * - Ticker: mỗi 3 giây, process giữ khoá `SET NX PX` đọc bộ đếm Redis 1 lần (không query DB) rồi
 *   phát qua adapter vào hai room; room trống thì adapter không gửi gì.
 * - `groups.watch`: vào `group:{id}` của nhóm đã tham gia để nhận `unread.bump`.
 */
@WebSocketGateway()
export class MetricsGateway implements OnGatewayInit {
  private readonly logger = new Logger(MetricsGateway.name);

  constructor(
    private readonly metrics: LiveMetricsService,
    private readonly perms: PermissionCheck,
    private readonly redis: RedisService,
    @Inject(ROOM_ACCESS_PORT) private readonly access: RoomAccessPort,
  ) {}

  afterInit(io: AppServer): void {
    setInterval(() => {
      this.tick(io).catch((err: unknown) => this.logger.warn({ err }, 'metrics tick lỗi'));
    }, TICK_MS).unref();
  }

  @SubscribeMessage('metrics.subscribe')
  subscribe(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<LiveMetrics>> {
    return toAck(async () => {
      const { scope } = clientEvents['metrics.subscribe'].payload.parse(body);
      if (scope === 'admin') {
        const can = await this.perms.checker(socket.data.user);
        if (!can('overview.view')) throw forbidden('Bạn không có quyền xem tổng quan');
      }
      await socket.join(socketRooms.metrics(scope));
      return this.payload(await this.metrics.metrics());
    });
  }

  @SubscribeMessage('metrics.unsubscribe')
  unsubscribe(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<Record<string, never>>> {
    return toAck(async () => {
      const { scope } = clientEvents['metrics.unsubscribe'].payload.parse(body);
      await socket.leave(socketRooms.metrics(scope));
      return {};
    });
  }

  @SubscribeMessage('groups.watch')
  watch(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ groupIds: string[] }>> {
    return toAck(async () => {
      const { groupIds } = clientEvents['groups.watch'].payload.parse(body);
      const ok = await this.access.watchable(socket.data.user, groupIds);
      await socket.join(ok.map(socketRooms.group));
      return { groupIds: ok };
    });
  }

  private payload(m: LiveMetrics): LiveMetrics {
    return { generatedAt: m.generatedAt, stats: m.stats, activities: m.activities };
  }

  private async tick(io: AppServer): Promise<void> {
    const got = await this.redis.client.set(TICK_LOCK, '1', 'PX', TICK_MS - 200, 'NX');
    if (got !== 'OK') return;
    const body = this.payload(await this.metrics.metrics());
    io.to([socketRooms.metrics('portal'), socketRooms.metrics('admin')]).emit(
      'metrics.updated',
      body,
    );
  }
}
