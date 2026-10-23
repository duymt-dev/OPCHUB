import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RETIRED_SCHEDULES, SCHEDULES } from './schedules';

describe('lịch worker (TIP-V4-606)', () => {
  it('REQ-515 D-73 không còn lịch chiến dịch Marketing; lịch gỡ được xoá khi khởi động', () => {
    const ids = SCHEDULES.map((s) => s.id);
    expect(ids).not.toContain('campaigns-due');
    expect(SCHEDULES.map((s): string => s.name)).not.toContain('campaignsDue');
    expect(RETIRED_SCHEDULES.map((s) => s.id)).toEqual(['campaigns-due']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('REQ-515 processor Marketing không còn xử lý lịch campaignsDue (chỉ consumer outbox + lô)', () => {
    const src = readFileSync(join(__dirname, 'processors', 'marketing.processor.ts'), 'utf8');
    // chỉ xét code, bỏ comment (comment giải thích D-73 có nhắc tên lịch)
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/campaignsDue|QUEUES\.scheduler/);
  });
});
