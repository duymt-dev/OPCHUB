// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { classifyChunkPayloads } from '../../../../../infra/scripts/admin-intl/chunk-contract.mjs';

const schema = z.object({
  assets: z.array(
    z.object({ file: z.string(), tags: z.array(z.string()), locales: z.array(z.string()) }),
  ),
  errors: z.array(z.string()),
});
function audit(source: string, complete = false) {
  return schema.parse(classifyChunkPayloads([{ file: 'fixture.js', source }], complete));
}

describe('D-141 AC824-16 actual chunk markers and negative isolation gate', () => {
  it.each(['lo', 'km', 'my'])(
    'recognizes plain and escaped JSON date payloads for %s',
    (locale) => {
      const json = JSON.stringify({ locale });
      for (const source of [json, JSON.stringify(json)]) {
        const result = audit(`intervalFormatTemplates;${source}`);
        expect(result.errors).toEqual([]);
        expect(result.assets[0]?.tags).toEqual([`${locale}-date`]);
      }
    },
  );
  it('recognizes number data without misclassifying the shared executable core', () => {
    expect(audit('minimumGroupingDigits;({locale:"lo"})').assets[0]?.tags).toEqual(['lo-number']);
    expect(audit('minimumGroupingDigits;intervalFormatTemplates').assets).toEqual([]);
  });
  it('rejects combined unselected locale payloads, even if only one would be evaluated', () => {
    const result = audit('intervalFormatTemplates;{"locale":"lo"};{"locale":"my"}');
    expect(result.assets[0]?.locales).toEqual(['lo', 'my']);
    expect(result.errors).toEqual(['mixed locale payload: fixture.js']);
  });
  it('fails a full build inventory with missing/unrecognized data rather than claiming zero payload', () => {
    expect(audit('unrecognized core', true).errors).toHaveLength(6);
  });
});

it.each([
  'intervalFormatTemplates;{"locale":"lo"}',
  'intervalFormatTemplates;{"locale":"lo"};{"locale":"my"}',
])('D-141 AC824-16 actual chunk CLI matches shared classifier JSON and exit: %s', (source) => {
  const actual = spawnSync(
    process.execPath,
    ['infra/scripts/audit-admin-intl-chunks.mjs', '--fixture'],
    {
      cwd: resolve(__dirname, '../../../../..'),
      encoding: 'utf8',
      input: JSON.stringify({ files: [{ file: 'fixture.js', source }], complete: false }),
    },
  );
  expect(actual.status, actual.stderr).toBe(0);
  expect(schema.parse(JSON.parse(actual.stdout) as unknown)).toEqual(audit(source));
});
