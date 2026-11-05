import { Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { CommunityCoreModule } from '../community';
import { LocalBusinessCoreModule } from '../local-business';
import { ProjectCoreModule } from '../project';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AdminSearchController } from './admin-search.controller';

@Module({
  imports: [AccountCoreModule, CommunityCoreModule, LocalBusinessCoreModule, ProjectCoreModule],
  providers: [SearchService],
  controllers: [SearchController, AdminSearchController],
})
export class SearchModule {}
