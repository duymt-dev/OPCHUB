import { CustomerYearRepository } from './customer-year.repository';
import { Module } from '@nestjs/common';
import { RegionalProjectionRepository } from './regional-projection.repository';
import { RegionalShareProjectionRepository } from './regional-share-projection.repository';

@Module({
  providers: [
    CustomerYearRepository,
    RegionalProjectionRepository,
    RegionalShareProjectionRepository,
  ],
  exports: [
    CustomerYearRepository,
    RegionalProjectionRepository,
    RegionalShareProjectionRepository,
  ],
})
export class RegionalProjectionModule {}
