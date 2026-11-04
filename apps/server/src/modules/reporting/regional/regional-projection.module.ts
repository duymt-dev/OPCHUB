import { Module } from '@nestjs/common';
import { RegionalProjectionRepository } from './regional-projection.repository';
import { RegionalShareProjectionRepository } from './regional-share-projection.repository';

@Module({
  providers: [RegionalProjectionRepository, RegionalShareProjectionRepository],
  exports: [RegionalProjectionRepository, RegionalShareProjectionRepository],
})
export class RegionalProjectionModule {}
