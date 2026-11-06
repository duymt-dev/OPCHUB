import type { StorePublicConfig, StorePublicPatch } from '@opchub/shared/api-domains';
export type StorePublicSave = (input: StorePublicPatch) => Promise<StorePublicConfig>;
