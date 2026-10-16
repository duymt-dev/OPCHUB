# ADR-0006: Ant Design 6, không dùng pro-components

- Status: Accepted
- Date: 2026-10-16

## Context
Stack mới nhất 10/2026: Next.js 16, React 19, antd 6. `@ant-design/pro-components` chỉ hỗ trợ antd ≤ 5.

## Decision
Dùng antd 6 + `@ant-design/nextjs-registry` + `@ant-design/charts`. Tự xây `AdminTable`, `FilterBar` trong `packages/ui` thay cho ProTable.

## Consequences
Không bị kẹt ở antd 5. Tốn công dựng vài component Admin dùng chung.
