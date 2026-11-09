import { Tag, type TableColumnsType } from 'antd';
import { AI_PROVIDER_CATALOG, type AiCallItem } from '@opchub/shared/api-domains';
import { AI_PURPOSE_LABELS, AI_STATUS_LABELS } from './ai-call-filters';

export const AI_CALL_COLUMNS: TableColumnsType<AiCallItem> = [
  {
    title: 'Thời gian',
    dataIndex: 'at',
    render: (at: string) => new Date(at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  },
  {
    title: 'Chức năng',
    dataIndex: 'purpose',
    render: (purpose: AiCallItem['purpose']) => AI_PURPOSE_LABELS[purpose],
  },
  {
    title: 'Nhà cung cấp',
    dataIndex: 'provider',
    render: (provider: AiCallItem['provider']) => AI_PROVIDER_CATALOG[provider].name,
  },
  { title: 'Mô hình', dataIndex: 'model' },
  {
    title: 'Token vào / ra',
    render: (_: unknown, row) => `${row.promptTokens} / ${row.completionTokens}`,
  },
  {
    title: 'Chi phí (đ)',
    dataIndex: 'cost',
    render: (cost: number) => cost.toLocaleString('vi-VN'),
  },
  { title: 'Độ trễ (ms)', dataIndex: 'latencyMs' },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    render: (status: AiCallItem['status']) => (
      <Tag color={{ ok: 'green', error: 'red', fallback: 'orange' }[status]}>
        {AI_STATUS_LABELS[status]}
      </Tag>
    ),
  },
  { title: 'Mã lỗi', dataIndex: 'errorCode' },
  {
    title: 'Người dùng',
    render: (_: unknown, row) =>
      `${{ member: 'Thành viên', admin: 'Quản trị', system: 'Hệ thống' }[row.actor?.realm ?? 'system']} ${row.actor?.id ?? ''}`,
  },
];
