import { Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { UploadsCoreModule } from '../uploads';
import { AdminEventsController } from './controllers/admin-events.controller';
import { EventsController } from './controllers/events.controller';
import { EventRepository } from './repositories/event.repository';
import { EventSweepRepository } from './repositories/event-sweep.repository';
import { EventSchedulerService } from './services/event-scheduler.service';
import { EventService } from './services/event.service';
import { EventAdminService } from './services/event-admin.service';
import { EventRegistrantsService } from './services/event-registrants.service';
import { EventProfileStats } from './services/profile-stats.provider';

const services = [
  EventRepository,
  EventSweepRepository,
  EventService,
  EventAdminService,
  EventRegistrantsService,
  EventSchedulerService,
];

/** Sự kiện (B31) — api; worker chỉ cần consumer thông báo (notification) */
@Module({
  imports: [AccountCoreModule, UploadsCoreModule],
  providers: [...services, EventProfileStats],
  exports: services,
})
export class EventCoreModule {}

@Module({ imports: [EventCoreModule], controllers: [EventsController, AdminEventsController] })
export class EventHttpModule {}
