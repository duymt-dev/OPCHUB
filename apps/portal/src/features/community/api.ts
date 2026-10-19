import { pageSchema } from '@opchub/shared/api';
import { groupItemSchema, joinResultSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 Groups — GET /groups, POST/DELETE /groups/:id/join */

/** 34 nhóm theo tỉnh (D-29) — tải trọn một trang rồi lọc tại chỗ */
const ALL_SIZE = 100;

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
};

export const fetchGroups = () =>
  api(`/groups?page=1&size=${ALL_SIZE}`, { schema: pageSchema(groupItemSchema) });

/** Chỉ gọi sau khi TV tích ô "đồng ý nội quy + chính sách phí" (NR-R02) — server lưu vết */
export const joinGroup = (id: string, intro?: string) =>
  api(`/groups/${encodeURIComponent(id)}/join`, {
    method: 'POST',
    body: intro ? { intro, agreeRules: true as const } : { agreeRules: true as const },
    schema: joinResultSchema,
  });

export const leaveGroup = (id: string) =>
  api(`/groups/${encodeURIComponent(id)}/join`, { method: 'DELETE', schema: joinResultSchema });
