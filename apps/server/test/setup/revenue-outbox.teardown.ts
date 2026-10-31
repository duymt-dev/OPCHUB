import 'reflect-metadata';
import './env';
import { Test } from '@nestjs/testing';
import { loadEnv } from '@/common/config';
import { ApiAppModule } from '@/api/api-app.module';
import { assertRevenueTestTarget, drainRevenueTestOutbox } from './revenue-outbox-drain';

/** Global teardown, not per-file: never consume an event before its test assertions. */
export default function setup() {
  return async () => {
    assertRevenueTestTarget(loadEnv());
    const app = await Test.createTestingModule({
      imports: [ApiAppModule],
    }).compile();
    try {
      await app.init();
      await drainRevenueTestOutbox(app);
    } finally {
      await app.close();
    }
  };
}
