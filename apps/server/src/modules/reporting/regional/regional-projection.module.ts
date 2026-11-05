import { MyRegionProjectionRepository } from './my-region-projection.repository';
import { CustomerYearRepository } from './customer-year.repository';
import { Module } from '@nestjs/common';
import { RegionalProjectionRepository } from './regional-projection.repository';
import { RegionalShareProjectionRepository } from './regional-share-projection.repository';

@Module({
  providers: [
    MyRegionProjectionRepository,
    CustomerYearRepository,
    RegionalProjectionRepository,
    RegionalShareProjectionRepository,
  ],
  exports: [
    MyRegionProjectionRepository,
    CustomerYearRepository,
    RegionalProjectionRepository,
    RegionalShareProjectionRepository,
  ],
})
export class RegionalProjectionModule {}
