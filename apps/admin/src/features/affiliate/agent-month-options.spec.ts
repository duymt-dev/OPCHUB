import { describe, expect, it } from 'vitest';
import { agentMonthOptions } from './agent-month-options';

describe('REQ-312 agent period calendar', () => {
  const now = Date.parse('2026-09-30T18:00:00Z');
  it('starts at the Vietnam month boundary without inserting a duplicate all option', () => {
    const options = agentMonthOptions('all', now);
    expect(options[0]).toBe('2026-10');
    expect(options).toHaveLength(24);
    expect(options).not.toContain('all');
  });
  it('retains an explicit older period outside the recent calendar', () => {
    expect(agentMonthOptions('2020-01', now)).toContain('2020-01');
    expect(agentMonthOptions('2026-10', now)).toHaveLength(24);
  });
});
