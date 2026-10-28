import { afterEach, expect, it } from 'vitest';
import { openStoreProject, useStorePostingIntent } from './store-posting-intent';

afterEach(() => useStorePostingIntent.getState().close());

it('preserves the store prefill across navigation and clears it when the drawer closes', () => {
  const source = {
    id: 'st1',
    name: 'Store',
    province: 'Hà Nội',
    field: 'AI',
    audience: 'business' as const,
  };
  openStoreProject(source);
  expect(useStorePostingIntent.getState().source).toEqual(source);
  useStorePostingIntent.getState().close();
  expect(useStorePostingIntent.getState().source).toBeNull();
});
