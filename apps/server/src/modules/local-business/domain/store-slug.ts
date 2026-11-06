import { availableStoreSlug, storeSlugBase } from '@opchub/shared';
/** Pure domain choice; repository performs the indexed candidate read in the transaction. */
export const chooseStoreSlug = (name: string, taken: readonly string[]) =>
  availableStoreSlug(storeSlugBase(name), taken);
