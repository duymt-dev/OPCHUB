import { Button, Empty, Result, Skeleton } from 'antd';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600, color: 'rgba(0,0,0,0.88)' }}>{title}</span>
          {description ? <span>{description}</span> : null}
        </span>
      }
    >
      {action}
    </Empty>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <Result
      status="error"
      title={title}
      subTitle={description}
      extra={
        onRetry && retryLabel ? (
          <Button type="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null
      }
    />
  );
}

/** Khung chờ cho một trang: tiêu đề + n khối nội dung */
export function PageSkeleton({ blocks = 2 }: { blocks?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} aria-busy="true">
      <Skeleton active title={{ width: 240 }} paragraph={{ rows: 1, width: 360 }} />
      {Array.from({ length: blocks }, (_, i) => (
        <div
          key={i}
          style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 8, padding: 20 }}
        >
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ))}
    </div>
  );
}
