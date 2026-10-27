import { Module } from '@nestjs/common';
import { ImageRefService } from './image-ref.service';
import { LocalUploadsController } from './local-uploads.controller';
import { MediaBackfillService } from './media-backfill.service';
import { MediaGcService } from './media-gc.service';
import { PrivateFileUrlService } from './private-file-url.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  providers: [
    UploadsService,
    ImageRefService,
    MediaBackfillService,
    MediaGcService,
    PrivateFileUrlService,
  ],
  exports: [
    UploadsService,
    ImageRefService,
    MediaBackfillService,
    MediaGcService,
    PrivateFileUrlService,
  ],
})
export class UploadsCoreModule {}

@Module({ imports: [UploadsCoreModule], controllers: [UploadsController, LocalUploadsController] })
export class UploadsHttpModule {}
