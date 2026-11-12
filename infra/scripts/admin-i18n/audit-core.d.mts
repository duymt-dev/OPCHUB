export interface SourceFixture {
  file: string;
  source: string;
  exceptions?: readonly unknown[];
}
export function auditSourceFixture(root: string, fixture: SourceFixture): unknown;
export function sourceFixtureContext(root: string, fixture: SourceFixture): unknown;
export function analyzeSourceContext(
  context: unknown,
  root: string,
  fixture?: SourceFixture,
): unknown;
export function sourceAuditStatus(
  result: { unreviewed: readonly unknown[]; errors: readonly unknown[] },
  inventory?: boolean,
): 'PASS' | 'FAIL' | 'INVENTORY_ONLY';
