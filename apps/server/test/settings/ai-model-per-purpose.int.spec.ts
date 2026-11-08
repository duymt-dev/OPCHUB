import { describe, expect, it } from 'vitest';
import { aiOpsFixture } from '../helpers/ai-ops-fixture';

describe('D-138 models by purpose', () => {
  const f = aiOpsFixture('TIP817-model');
  it('primary uses purpose model, fallback uses its own model and logs actual actor/model', async () => {
    await f.save({ models: { content: 'm-x' }, fallback: 'usgate' });
    await f.router
      .forPurpose('content', { actor: { realm: 'member', id: 'actor-817' } })
      .complete('x');
    expect(JSON.parse(f.a.requests.at(-1)?.body ?? '{}')).toMatchObject({ model: 'm-x' });
    expect(
      await f.t.prisma.db.llmCall.findFirst({
        where: { model: 'm-x', actorId: 'actor-817' },
        select: { actorRealm: true },
      }),
    ).toEqual({ actorRealm: 'member' });
    f.a.setMode('unavailable');
    await f.router.forPurpose('content').complete('x');
    expect(JSON.parse(f.b.requests.at(-1)?.body ?? '{}')).toMatchObject({
      model: `${f.model}-fallback`,
    });
    await f.t.prisma.db.llmCall.deleteMany({ where: { model: 'm-x', actorId: 'actor-817' } });
  });
});
