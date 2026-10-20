'use client';

import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { Key, ReactNode } from 'react';

export interface AdminTableProps<T> {
  title?: ReactNode;
  toolbar?: ReactNode;
  rowKey: keyof T & string;
  columns: NonNullable<TableProps<T>['columns']>;
  data: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  /** Disable AntD's pager when the feature supplies its own URL-driven pagination. */
  pagination?: false;
  onPageChange?: (page: number, pageSize: number) => void;
  selectedKeys?: Key[];
  onSelect?: (keys: Key[]) => void;
  empty?: ReactNode;
}

const card = {
  background: '#fff',
  border: '1px solid #F0F0F0',
  borderRadius: 8,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
} as const;

/** Bảng quản trị chuẩn: card trắng viền #F0F0F0, phân trang server-side */
export function AdminTable<T extends object>(props: AdminTableProps<T>) {
  const { selectedKeys, onSelect } = props;
  return (
    <div style={card}>
      {props.title || props.toolbar ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {props.title ? (
            <div style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>{props.title}</div>
          ) : null}
          {props.toolbar}
        </div>
      ) : null}
      <Table<T>
        rowKey={props.rowKey}
        columns={props.columns}
        dataSource={props.data}
        loading={props.loading ?? false}
        scroll={{ x: 'max-content' }}
        {...(props.empty ? { locale: { emptyText: props.empty } } : {})}
        {...(onSelect
          ? {
              rowSelection: {
                selectedRowKeys: selectedKeys ?? [],
                onChange: (keys: Key[]) => onSelect(keys),
              },
            }
          : {})}
        pagination={
          props.pagination === false
            ? false
            : {
                current: props.page ?? 1,
                pageSize: props.pageSize ?? 10,
                total: props.total ?? props.data.length,
                showSizeChanger: false,
                ...(props.onPageChange ? { onChange: props.onPageChange } : {}),
              }
        }
      />
    </div>
  );
}
