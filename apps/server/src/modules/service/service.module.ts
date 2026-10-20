import { Module } from '@nestjs/common';
import { MailCoreModule } from '@/modules/mail';
import { AdminServiceRequestsController } from './controllers/admin-service-requests.controller';
import { ServicesController } from './controllers/services.controller';
import { ServiceAdminService } from './services/service-admin.service';
import { ServiceCatalogService } from './services/service-catalog.service';
import { ServiceRequestService } from './services/service-request.service';
import { ServiceRequestPatchService } from './services/service-request-patch.service';

/** FEATURE_SERVICES (D-05) — chỉ đăng ký khi bật cờ (whenFeature) */
@Module({
  imports: [MailCoreModule],
  controllers: [ServicesController, AdminServiceRequestsController],
  providers: [
    ServiceRequestService,
    ServiceAdminService,
    ServiceCatalogService,
    ServiceRequestPatchService,
  ],
})
export class ServiceHttpModule {}
