import type { Scenario } from '../types';

/** Portal P-117 → P-118: Trợ lý OPC Hub (V4-613, QT-13) */
const NO_MARKUP =
  'Prototype v4 không có markup khung Trợ lý OPC Hub — chỉ có logic mồ côi `svw*` (index.html:5134), không template nào dùng; app dựng theo SRS QT-13 (chân sidebar), hành vi kiểm ở e2e assistant (Q-V4-613-1).';

export const PORTAL_ASSISTANT: Scenario[] = [
  { id: 'P-117', name: 'Trợ lý OPC Hub · đóng', start: 'user', unreachable: NO_MARKUP },
  { id: 'P-118', name: 'Trợ lý OPC Hub · mở danh mục', start: 'user', unreachable: NO_MARKUP },
];
