import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const ids: string[] = [];
const data = (name = `Test ${randomUUID()}`) => {
  const id = randomUUID();
  ids.push(id);
  return { id, name };
};
afterAll(async () => {
  await db.botConversationType.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

describe('D-112 conversation type migration', () => {
  it('preserves spelling and enforces case-insensitive uniqueness in PostgreSQL', async () => {
    const name = `Phỏng Vấn ${randomUUID()}`;
    const row = await db.botConversationType.create({ data: data(name) });
    expect(row).toMatchObject({ name, description: '' });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    await expect(
      db.botConversationType.create({ data: data(name.toUpperCase()) }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      await db.botConversationType.findUnique({ where: { name: name.toLowerCase() } }),
    ).toMatchObject({ id: row.id });
  });
  it.each([
    'Hỏi đáp',
    'THẢO LUẬN',
    'chia sẻ kinh nghiệm',
    'Giới thiệu sự kiện / dự án',
    '',
    ' x ',
    'x'.repeat(61),
  ])('cannot shadow a built-in or persist invalid name %s', async (name) => {
    await expect(db.botConversationType.create({ data: data(name) })).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
  });
  it('bounds descriptions independently of the name', async () => {
    await expect(
      db.botConversationType.create({ data: { ...data(), description: 'x'.repeat(2001) } }),
    ).rejects.toMatchObject({
      meta: { driverAdapterError: { cause: { code: '23514' } } },
    });
    expect(
      await db.botConversationType.create({ data: { ...data(), description: 'x'.repeat(2000) } }),
    ).toMatchObject({ description: 'x'.repeat(2000) });
  });
});
