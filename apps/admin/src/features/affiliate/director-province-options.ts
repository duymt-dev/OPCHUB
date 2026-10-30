import { provinces } from '@opchub/shared/fixtures';

const provinceOrder = new Map(provinces.map(([name], index) => [name, index]));

/** Presentation only: membership changes must not move a chip under the pointer. */
export function directorProvinceOptions(
  assigned: readonly string[],
  unassigned: readonly string[],
) {
  return [...new Set([...assigned, ...unassigned])].sort(
    (a, b) =>
      (provinceOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (provinceOrder.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b, 'vi'),
  );
}
