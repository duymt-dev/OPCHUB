import { Module } from '@nestjs/common';
import { AdminServiceRequestsController } from './controllers/admin-service-requests.controller';
import { ServicesController } from './controllers/services.controller';
import { ServiceAdminService } from './services/service-admin.service';
import { ServiceCatalogService } from './services/service-catalog.service';
import { ServiceRequestService } from './services/service-request.service';

/** FEATURE_SERVICES (D-05) — chỉ đăng ký khi bật cờ (whenFeature) */
@Module({
  controllers: [ServicesController, AdminServiceRequestsController],
  providers: [ServiceRequestService, ServiceAdminService, ServiceCatalogService],
})
export class ServiceHttpModule {}
