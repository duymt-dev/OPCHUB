import { Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { UploadsCoreModule } from '../uploads';
import { AdminStoreController } from './controllers/admin-store.controller';
import { StoreController } from './controllers/store.controller';
import { StoreExploreRepository } from './repositories/store-explore.repository';
import { StoreRepository } from './repositories/store.repository';
import { StoreAdminService } from './services/store-admin.service';
import { StoreAutoCreateHandler } from './services/store-auto-create.handler';
import { StoreExploreService } from './services/store-explore.service';
import { StoreOwnerService } from './services/store-owner.service';

const services = [
  StoreRepository,
  StoreExploreRepository,
  StoreExploreService,
  StoreOwnerService,
  StoreAdminService,
  StoreAutoCreateHandler,
];

/** V4-608 Gian hàng địa phương (REQ-510, D-75, D-84) — dùng chung api + worker */
@Module({ imports: [AccountCoreModule, UploadsCoreModule], providers: services, exports: services })
export class LocalBusinessCoreModule {}

@Module({
  imports: [LocalBusinessCoreModule],
  controllers: [StoreController, AdminStoreController],
})
export class LocalBusinessHttpModule {}
