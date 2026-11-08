'use client';
import { Input, Select, Space } from 'antd';
import {
  AI_PROVIDER_IDS,
  AI_PROVIDER_CATALOG,
  AI_PURPOSES,
  type AiCallsFilter,
} from '@opchub/shared/api-domains';

const date = (iso: string) => new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 10);
export const AI_PURPOSE_LABELS = {
  bot: 'Bot',
  script: 'Kịch bản',
  content: 'Soạn nội dung',
  mod: 'Kiểm duyệt',
} as const;
export const AI_STATUS_LABELS = { ok: 'Thành công', error: 'Lỗi', fallback: 'Dự phòng' } as const;
export function AiCallFilters({
  value,
  onChange,
}: {
  value: AiCallsFilter;
  onChange: (next: AiCallsFilter) => void;
}) {
  const choice = <K extends 'purpose' | 'provider' | 'status'>(key: K, next: AiCallsFilter[K]) => {
    const patch = { ...value };
    if (next) patch[key] = next;
    else delete patch[key];
    onChange(patch);
  };
  return (
    <Space wrap>
      <Input
        type="date"
        aria-label="Từ ngày"
        value={date(value.from)}
        onChange={(e) => {
          if (e.target.value) onChange({ ...value, from: `${e.target.value}T00:00:00+07:00` });
        }}
      />
      <Input
        type="date"
        aria-label="Đến ngày"
        value={date(value.to)}
        onChange={(e) => {
          if (e.target.value) onChange({ ...value, to: `${e.target.value}T23:59:59.999+07:00` });
        }}
      />
      <Select
        virtual={false}
        aria-label="Chức năng AI"
        placeholder="Chức năng"
        allowClear
        value={value.purpose}
        options={AI_PURPOSES.map((key) => ({ value: key, label: AI_PURPOSE_LABELS[key] }))}
        onChange={(next) => choice('purpose', next)}
      />
      <Select
        virtual={false}
        aria-label="Nhà cung cấp nhật ký"
        placeholder="Nhà cung cấp"
        allowClear
        value={value.provider}
        options={AI_PROVIDER_IDS.map((key) => ({
          value: key,
          label: AI_PROVIDER_CATALOG[key].name,
        }))}
        onChange={(next) => choice('provider', next)}
      />
      <Select
        virtual={false}
        aria-label="Trạng thái lời gọi"
        placeholder="Trạng thái"
        allowClear
        value={value.status}
        options={(['ok', 'error', 'fallback'] as const).map((value) => ({
          value,
          label: AI_STATUS_LABELS[value],
        }))}
        onChange={(next) => choice('status', next)}
      />
    </Space>
  );
}
