import { describe, expect, it } from 'vitest';
import { emptyForm, formFromProject, formToSave } from './model';
import { prefillStoreProject } from './store-project-model';
import { projectDetail, resetMockDb } from '@opchub/shared/mock-domains';

describe('REQ-612 QT-ST-PJ prefill', () => {
  it('gợi ý tên/ngành/đối tượng, giữ storeId và tỉnh khi gửi', () => {
    const form = prefillStoreProject(emptyForm('Chủ dự án'), {
      id: 'st1',
      name: 'Doanh nghiệp thử',
      field: 'Chuyển đổi số & AI',
      province: 'Cà Mau',
      audience: 'business',
    });
    expect(form).toMatchObject({
      storeId: 'st1',
      name: 'Doanh nghiệp thử',
      category: 'Chuyển đổi số & AI',
      province: 'Cà Mau',
      audience: 'business',
    });
    expect(formToSave({ ...form, name: 'Tên dự án riêng' }, true)).toMatchObject({
      storeId: 'st1',
      province: 'Cà Mau',
      name: 'Tên dự án riêng',
      submit: true,
    });
  });

  it('sửa dự án giữ liên kết/tỉnh; dự án độc lập mặc định không gắn gian hàng', () => {
    resetMockDb();
    const p = projectDetail('m1', 'p10');
    if (!p.ok) throw new Error('Missing project');
    const form = formFromProject({ ...p.data, storeId: 'st1', province: 'Cà Mau' });
    expect(formToSave(form, true)).toMatchObject({ storeId: 'st1', province: 'Cà Mau' });
    expect(formToSave(emptyForm('Chủ dự án'), false)).toMatchObject({
      storeId: null,
      province: '',
    });
  });
});
