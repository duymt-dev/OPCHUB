import { DIRECTOR_REGIONS, type DirectorConfig } from '@opchub/shared/api-domains';

export const directorFixture = (): DirectorConfig => ({
  slots: DIRECTOR_REGIONS.map((region, index) => ({
    region,
    version: 3,
    provinces: [['Hà Nội'], ['Đà Nẵng'], ['Cần Thơ']][index] ?? [],
    affiliateCount: index + 1,
    bank:
      index === 0
        ? { bankName: 'Vietcombank', bankNo: '123456789', bankHolder: 'TEST USER' }
        : null,
    incumbent:
      index === 0
        ? {
            id: 'director-one',
            fullName: 'Người phụ trách',
            email: 'director@example.com',
            memberCode: 'TV000001',
            appointedAt: '2026-10-01T00:00:00Z',
          }
        : null,
  })),
  unassignedProvinces: ['Huế'],
});
export const candidateFixture = {
  items: [
    {
      id: 'candidate-two',
      fullName: 'Thành viên mới',
      email: 'candidate@example.com',
      memberCode: 'TV000002',
    },
  ],
  page: 1,
  size: 20,
  total: 1,
};
