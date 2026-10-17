import { Module } from '@nestjs/common';
import { ConfigModule } from '@/common/config';

/** Process Socket.IO — gateway thêm ở TIP-B22 */
@Module({
  imports: [ConfigModule],
})
export class SocketAppModule {}
