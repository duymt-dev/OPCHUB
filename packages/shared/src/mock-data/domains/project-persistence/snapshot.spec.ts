import { beforeEach, expect, it } from 'vitest';
import { projectSaveSchema } from '../../../api-domains';
import { saveProject } from '../ops-project-portal';
import { extOf } from '../project-store';
import { mockDb, resetMockDb } from '../store';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from '../community-persistence/snapshot';

beforeEach(() => resetMockDb());

it('D-108 persisted edit is published in a fresh runtime; moderation and store association survive', () => {
  const result = saveProject(
    'm1',
    projectSaveSchema.parse({
      name: 'Published edit',
      category: 'Chuyển đổi số & AI',
      summary: 'Updated project summary',
      testUrl: 'https://example.test',
      submit: true,
      storeId: 'st1',
      province: 'Hà Nội',
    }),
    'p10',
  );
  expect(result.ok).toBe(true);
  const saved = captureCommunitySnapshot();
  resetMockDb();
  restoreCommunitySnapshot(JSON.parse(JSON.stringify(saved)) as unknown);
  const project = mockDb().projects.find((p) => p.id === 'p10');
  expect(project).toMatchObject({ name: 'Published edit', status: 'published' });
  if (!project) throw new Error('Missing restored project');
  expect(extOf(project)).toMatchObject({ storeId: 'st1', province: 'Hà Nội' });
  project.status = 'hidden';
  const hidden = captureCommunitySnapshot();
  resetMockDb();
  restoreCommunitySnapshot(hidden);
  expect(mockDb().projects.find((p) => p.id === 'p10')?.status).toBe('hidden');
});

it('validates all project fields before changing any persisted domain', () => {
  const before = captureCommunitySnapshot();
  expect(() =>
    restoreCommunitySnapshot({ ...before, projects: { projects: [], ext: [['p10', {}]] } }),
  ).toThrow();
  expect(captureCommunitySnapshot()).toEqual(before);
});
