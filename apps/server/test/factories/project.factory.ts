import type { ProjectSave } from '@opchub/shared/api-domains';
import { projectCardSchema } from '@opchub/shared/api-domains';
import type { TestApp } from '../setup/test-app';

/** Tên dự án test có tiền tố để dọn ở afterAll */
export const TEST_PROJECT_PREFIX = 'Dự án thử';

export const projectBody = (over: Partial<ProjectSave> = {}): ProjectSave => ({
  name: `${TEST_PROJECT_PREFIX} ${Math.random().toString(36).slice(2, 8)}`,
  // D-89 (v4): nhóm ngành giải pháp (scope `project`)
  category: 'Chuyển đổi số & AI',
  stage: 'mvp',
  summary: 'Phần mềm kế toán cho doanh nghiệp một người',
  description: '<p>Mô tả <b>đầy đủ</b></p><script>alert(1)</script>',
  testUrl: 'https://demo.example.vn',
  submit: true,
  ...over,
});

/** Tạo qua API (đúng đường ghi) rồi Admin duyệt trực tiếp trên DB khi cần `published` */
export async function createProject(
  t: TestApp,
  token: string,
  over: Partial<ProjectSave> = {},
  publish = true,
) {
  const r = await t.call('/projects', { method: 'POST', token, json: projectBody(over) });
  const card = projectCardSchema.parse(await r.json());
  if (publish) {
    await t.prisma.db.project.update({
      where: { id: card.id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }
  return card;
}

export async function removeTestProjects(t: TestApp): Promise<void> {
  await t.prisma.db.project.deleteMany({ where: { name: { startsWith: TEST_PROJECT_PREFIX } } });
}

/**
 * V4-610: Gói Gọi vốn đang hiệu lực (tab Gọi vốn + quan tâm). Dữ liệu dựng sẵn như Admin đã duyệt —
 * luồng mua → đối soát → duyệt có test riêng (test/project/fundraising.int.spec.ts).
 */
export async function activateFundraising(t: TestApp, projectId: string): Promise<void> {
  const p = await t.prisma.db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { ownerId: true },
  });
  const now = Date.now();
  await t.prisma.db.projectFundraising.create({
    data: {
      projectId,
      ownerId: p.ownerId,
      amount: 0,
      legacy: true,
      status: 'active',
      startsAt: new Date(now),
      endsAt: new Date(now + 182 * 86_400_000),
    },
  });
}
