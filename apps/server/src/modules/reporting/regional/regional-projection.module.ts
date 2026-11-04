import { Module } from '@nestjs/common';
import { RegionalProjectionRepository } from './regional-projection.repository';

@Module({ providers: [RegionalProjectionRepository], exports: [RegionalProjectionRepository] })
export class RegionalProjectionModule {}
