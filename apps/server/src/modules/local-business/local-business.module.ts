import { NeedSearchService } from './services/need-search.service';
import { StoreSearchService } from './services/store-search.service';
import { NeedSearchRepository } from './repositories/need-search.query';
import { StoreSearchRepository } from './repositories/store-search.query';
import { StorePublicController } from './controllers/store-public.controller';
import { StorePublicService } from './services/store-public.service';
import { StorePublicRepository } from './repositories/store-public.repository';
import { Module } from '@nestjs/common';
import { NeedMatchRepository } from './repositories/need-match.query';
import { NeedMatchService } from './services/need-match.service';
import { AccountCoreModule } from '../account';
import { UploadsCoreModule } from '../uploads';
import { AdminNeedController } from './controllers/admin-need.controller';
import { AdminStoreController } from './controllers/admin-store.controller';
import { NeedController } from './controllers/need.controller';
import { StoreController } from './controllers/store.controller';
import { NeedExploreRepository } from './repositories/need-explore.repository';
import { NeedRepository } from './repositories/need.repository';
import { StoreExploreRepository } from './repositories/store-explore.repository';
import { StoreRepository } from './repositories/store.repository';
import { NeedAdminService } from './services/need-admin.service';
import { NeedExploreService } from './services/need-explore.service';
import { NeedOwnerService } from './services/need-owner.service';
import { StoreAdminService } from './services/store-admin.service';
import { StoreAutoCreateHandler } from './services/store-auto-create.handler';
import { StoreDashboardService } from './services/store-dashboard.service';
import { StoreExploreService } from './services/store-explore.service';
import { StoreMediaService } from './services/store-media.service';
import { StoreOwnerService } from './services/store-owner.service';

const services = [
  StorePublicService,
  StorePublicRepository,
  NeedMatchRepository,
  NeedMatchService,
  StoreSearchRepository,
  NeedSearchRepository,
  StoreSearchService,
  NeedSearchService,
  StoreRepository,
  StoreExploreRepository,
  StoreExploreService,
  StoreOwnerService,
  StoreMediaService,
  StoreDashboardService,
  StoreAdminService,
  StoreAutoCreateHandler,
  NeedRepository,
  NeedExploreRepository,
  NeedExploreService,
  NeedOwnerService,
  NeedAdminService,
];

/** V4-608 Gian hàng + V4-609 Nhu cầu địa phương (REQ-510/511, D-75, D-84) — dùng chung api + worker */
@Module({ imports: [AccountCoreModule, UploadsCoreModule], providers: services, exports: services })
export class LocalBusinessCoreModule {}

@Module({
  imports: [LocalBusinessCoreModule],
  controllers: [
    StorePublicController,
    StoreController,
    AdminStoreController,
    NeedController,
    AdminNeedController,
  ],
})
export class LocalBusinessHttpModule {}
