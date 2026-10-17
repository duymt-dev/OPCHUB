import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({ providers: [UploadsService], exports: [UploadsService] })
export class UploadsCoreModule {}

@Module({ imports: [UploadsCoreModule], controllers: [UploadsController] })
export class UploadsHttpModule {}
