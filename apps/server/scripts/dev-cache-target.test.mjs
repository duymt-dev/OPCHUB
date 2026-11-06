import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertDevCacheTarget } from './dev-cache-target.mjs';

const redis = 'redis://127.0.0.1:6381';
const database = 'postgresql://user:secret@localhost:5432/opchub_v46_812_dev';

test('retains the historical db1 target', () => {
  assert.doesNotThrow(() => assertDevCacheTarget(1, '', ''));
});
test('accepts only the owner-authorized db3 target conjunction', () => {
  assert.doesNotThrow(() => assertDevCacheTarget(3, redis, database));
});
for (const [db, redisUrl, databaseUrl] of [
  [0, redis, database],
  [2, redis, database],
  [4, redis, database],
  [3, 'redis://127.0.0.1:6379', database],
  [3, 'redis://remote:6381', database],
  [3, 'https://127.0.0.1:6381', database],
  [3, redis, database.replace('812_dev', '801_dev')],
  [3, redis, `${database}_backup`],
  [3, redis, database.replace('localhost', 'remote')],
  [3, '', database],
  [3, redis, ''],
]) {
  test(`refuses unauthorized cache reset target ${db}/${redisUrl}/${new URL(databaseUrl || 'http://missing').pathname}`, () => {
    assert.throws(() => assertDevCacheTarget(db, redisUrl, databaseUrl), {
      message: 'flush:dev-cache target is not an authorized isolated dev runtime',
    });
  });
}
