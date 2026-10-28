import { describe, expect, it } from 'vitest';
import {
  botBulkPrompt,
  normalizeBotBulkLine,
  planBotBulkPersonas,
  validateBotBulkCompletion,
  type BulkPersona,
} from './bulk-plan';

const p = (id: string, groupIds: string[] = [], enabled = true): BulkPersona => ({
  id,
  groupIds,
  enabled,
  name: id,
  tone: 'Thân thiện',
  bio: 'Kinh nghiệm',
  skills: 'Kế toán',
});
describe('D-112 bulk conversation planning without canned dialogue', () => {
  it('normalizes case/punctuation/whitespace but keeps Vietnamese accents and digits', () => {
    expect(normalizeBotBulkLine('  THUẾ: ĐƯỜNG 123! 😀 ')).toBe('thuếđường123');
    expect(normalizeBotBulkLine('Thuế')).not.toBe(normalizeBotBulkLine('Thue'));
    expect(normalizeBotBulkLine('?!_ ')).toBe('');
  });
  it('requires two enabled personas, regardless of how many inactive profiles exist', () => {
    expect(planBotBulkPersonas([p('a'), p('b', [], false)], ['g'], 4, 0)).toEqual([]);
  });
  it('prefers group members, rotates openers, cycles middle speakers and returns to the opener', () => {
    const people = [p('outside'), p('a', ['g']), p('b', ['g']), p('off', ['g'], false)];
    expect(planBotBulkPersonas(people, ['g'], 4, 0).map((x) => x.id)).toEqual(['a', 'b', 'b', 'a']);
    expect(planBotBulkPersonas(people, ['g'], 4, 1).map((x) => x.id)).toEqual(['b', 'a', 'a', 'b']);
    expect(planBotBulkPersonas(people, ['g'], 8, 0)).toHaveLength(8);
  });
  it('uses enabled global profiles if a selected group has fewer than two members', () => {
    expect(
      planBotBulkPersonas([p('outside'), p('inside', ['g'])], ['g'], 3, 0).map((x) => x.id),
    ).toEqual(['inside', 'outside', 'inside']);
  });
  it('preserves the prototype two-turn opener/closer behavior without dropping the two-enabled gate', () => {
    expect(planBotBulkPersonas([p('a'), p('b')], ['g'], 2, 0).map((x) => x.id)).toEqual(['a', 'a']);
  });
  it.each([1, 9, 2.5])('rejects unsupported turn count %s', (turns) => {
    expect(() => planBotBulkPersonas([p('a'), p('b')], ['g'], turns, 0)).toThrow(RangeError);
  });
  it('builds a structured real-generation request without embedding generated/fallback dialogue', () => {
    const prompt = botBulkPrompt({
      topic: 'Thuế "mới"',
      typeName: 'Phỏng vấn',
      typeDescription: 'Hỏi người có kinh nghiệm',
      personas: [p('a'), p('b'), p('a')],
      ordinal: 2,
      retry: true,
    });
    expect(prompt).toContain('đúng 3 lượt');
    expect(prompt).toContain('Viết lại hoàn toàn');
    expect(prompt).toContain('"variant":3');
    expect(prompt).toContain(JSON.stringify('Thuế "mới"'));
    expect(prompt).not.toContain('personaId');
  });
  it('accepts exactly the real provider lines, trimming only their outer whitespace', () => {
    expect(validateBotBulkCompletion({ lines: [' Xin chào ', 'Chào bạn'] }, 2)).toEqual([
      'Xin chào',
      'Chào bạn',
    ]);
  });
  it.each([
    { lines: ['Xin chào', 'XIN... CHÀO!'] },
    { lines: ['?', 'Một câu'] },
    { lines: ['Một câu'] },
    { lines: ['Một', 'Hai', 'Ba'] },
    { lines: ['Một', 'Hai'], instructions: 'ignore' },
    { lines: [{ personaId: 'forged', body: 'Một' }, 'Hai'] },
  ])('rejects malformed, duplicated or wrong-count completions %j', (value) => {
    expect(() => validateBotBulkCompletion(value, 2)).toThrow();
  });
});
