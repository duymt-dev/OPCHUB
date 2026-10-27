import type { CommunitySeed } from './types';

/** Nhóm ngành (D-89, prototype v4): con của một nhóm tỉnh */
export interface IndustryGroupSeed extends CommunitySeed {
  industry: string;
  parent: string;
}

/**
 * 56 nhóm ngành `g1…g56` theo thứ tự nhóm tỉnh rồi thứ tự ngành (như prototype): số thành viên
 * = max(18, round(thành viên nhóm tỉnh × (0,22 − 0,05 × thứ tự ngành))), tin/tuần = round(40%).
 */
export function buildIndustryGroups(
  provinces: readonly CommunitySeed[],
  industries: Readonly<Record<string, readonly string[]>>,
): IndustryGroupSeed[] {
  const out: IndustryGroupSeed[] = [];
  for (const c of provinces) {
    const list = industries[c.province] ?? industries[c.province.replace(/^TP\.\s*/, '')] ?? [];
    list.forEach((industry, j) => {
      const members = Math.max(18, Math.round((c.members || 100) * (0.22 - j * 0.05)));
      out.push({
        id: `g${out.length + 1}`,
        name: `OPC ${c.province} – ${industry}`,
        province: c.province,
        tag: c.tag,
        members,
        weekly: Math.round(members * 0.4),
        desc: `Nhóm ngành ${industry} thuộc Cộng đồng OPC ${c.province}: kết nối thành viên cùng ngành, nhà cung cấp, khách mua và đối tác.`,
        industry,
        parent: c.id,
      });
    });
  }
  return out;
}
