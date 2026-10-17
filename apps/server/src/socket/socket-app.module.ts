import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';

/** Process Socket.IO — gateway thêm ở TIP-B22 */
@Module({
  imports: [CoreModule],
})
export class SocketAppModule {}
