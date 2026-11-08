'use client';
import { Alert, Button, Drawer, Table, Typography } from 'antd';
import { useAiCalls } from '../../hooks/use-ai-calls';
import { AiCallFilters } from './ai-call-filters';
import { AI_CALL_COLUMNS } from './ai-call-columns';
import styles from './ai-call-log.module.css';

export function AiCallLog({
  open,
  close,
  logging,
}: {
  open: boolean;
  close: () => void;
  logging: boolean;
}) {
  return (
    <Drawer title="Nhật ký gọi AI" open={open} onClose={close} size="large" destroyOnHidden>
      {open ? <AiCallLogBody logging={logging} /> : null}
    </Drawer>
  );
}
function AiCallLogBody({ logging }: { logging: boolean }) {
  const p = useAiCalls();
  const totals = p.totals;
  return (
    <div className={styles.body}>
      {!logging ? (
        <Alert type="info" title="Đang tắt lưu nhật ký; chỉ có dữ liệu cũ (tối đa 90 ngày)" />
      ) : null}
      <AiCallFilters value={p.filters} onChange={p.update} />
      <Typography.Text>
        {totals
          ? `${totals.calls} lời gọi · Token vào: ${totals.promptTokens} · Token ra: ${totals.completionTokens} · ${totals.cost.toLocaleString('vi-VN')}đ`
          : 'Đang tải tổng…'}
      </Typography.Text>
      <Button
        loading={p.csv.isPending}
        disabled={!p.query.isSuccess}
        onClick={() => p.csv.mutate()}
      >
        Xuất CSV
      </Button>
      {p.query.isError ? (
        <Alert
          type="error"
          title="Không tải được nhật ký"
          action={<Button onClick={() => void p.query.refetch()}>Thử lại</Button>}
        />
      ) : null}
      <Table
        rowKey="id"
        columns={AI_CALL_COLUMNS}
        dataSource={p.rows}
        loading={p.query.isPending}
        pagination={false}
        scroll={{ x: 1300 }}
      />
      {p.query.hasNextPage ? (
        <Button loading={p.query.isFetchingNextPage} onClick={() => void p.query.fetchNextPage()}>
          Tải thêm
        </Button>
      ) : null}
    </div>
  );
}
