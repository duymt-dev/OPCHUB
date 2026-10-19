import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeMailProvider, mailboxDirName } from './fake.provider';

describe('FakeMailProvider (dev/e2e)', () => {
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'opchub-mail-'));
  });
  afterAll(() => rm(root, { recursive: true, force: true }));

  it('TD-035 ghi thư ra outDir theo email', async () => {
    const m = new FakeMailProvider({ outDir: root });
    const { messageId } = await m.send({ to: 'An.Nguyen@Mail.vn', subject: 'S', html: '<p>h</p>' });
    const files = await readdir(join(root, 'an.nguyen@mail.vn'));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(new RegExp(`^\\d+-${messageId}\\.json$`));
    const raw = await readFile(join(root, 'an.nguyen@mail.vn', files[0] ?? ''), 'utf8');
    const body = JSON.parse(raw) as Record<string, string>;
    expect(body).toMatchObject({ to: 'An.Nguyen@Mail.vn', subject: 'S', html: '<p>h</p>' });
    expect(Number.isNaN(Date.parse(body.sentAt ?? ''))).toBe(false);
    expect(m.lastTo('an.nguyen@mail.vn')?.messageId).toBe(messageId);
  });

  it('TD-035 không có outDir thì không ghi file', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'opchub-mail-none-'));
    const m = new FakeMailProvider();
    await m.send({ to: 'x@y.vn', subject: 'S', html: 'h' });
    expect(await readdir(empty)).toEqual([]);
    expect(m.sent).toHaveLength(1);
    await rm(empty, { recursive: true, force: true });
  });

  it('TD-035 tên thư mục chỉ gồm ký tự an toàn', () => {
    expect(mailboxDirName('../../etc/passwd')).toBe('__.._etc_passwd');
    expect(mailboxDirName('a b/c\\d@x.vn')).toBe('a_b_c_d@x.vn');
  });
});
