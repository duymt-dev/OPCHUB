import type { ProjectFormState, ProjectStoreSource } from './types';

/** QT-ST-PJ: tên/ngành sửa được; tỉnh và liên kết theo gian hàng nguồn. */
export function prefillStoreProject(
  form: ProjectFormState,
  store: ProjectStoreSource,
): ProjectFormState {
  return {
    ...form,
    storeId: store.id,
    name: store.name,
    province: store.province,
    category: store.field,
    audience: store.audience,
  };
}
