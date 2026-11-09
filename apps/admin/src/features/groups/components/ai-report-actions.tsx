'use client';
import { Button, Space, Tag } from 'antd';
import type { Report } from '@opchub/shared/api-domains';
import { useReportAction } from '../hooks/use-moderation';

export function AiReportActions({
  report,
  days,
  onLock,
}: {
  report: Report;
  days: number;
  onLock: (r: Report) => void;
}) {
  const action = useReportAction();
  return (
    <Space wrap>
      <Tag color="blue">Chờ Admin xử lý · chưa tính vi phạm</Tag>
      <Button
        loading={action.isPending}
        onClick={() => action.mutate({ r: report, action: 'hide' })}
      >
        Ẩn tin
      </Button>
      <Button
        loading={action.isPending}
        onClick={() => action.mutate({ r: report, action: 'dismiss' })}
      >
        Bỏ qua
      </Button>
      {report.canLock ? (
        <Button danger onClick={() => onLock(report)}>
          Khóa {days} ngày
        </Button>
      ) : null}
    </Space>
  );
}
