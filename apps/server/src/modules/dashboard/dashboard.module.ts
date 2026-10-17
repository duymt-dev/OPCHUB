import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardLiveService } from './dashboard-live.service';

@Module({ providers: [DashboardLiveService], controllers: [DashboardController] })
export class DashboardHttpModule {}
