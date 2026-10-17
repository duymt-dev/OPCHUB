import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { WorkerFactory } from './worker.factory';

/** Producer cho mọi process; WorkerFactory chỉ process worker gọi `start` */
@Global()
@Module({ providers: [QueueService, WorkerFactory], exports: [QueueService, WorkerFactory] })
export class QueueModule {}
