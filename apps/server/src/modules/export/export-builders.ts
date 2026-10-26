import { Injectable } from '@nestjs/common';
import type { ExportParams } from '@opchub/shared/api-domains';

type Kind = ExportParams['kind'];
type Built = Promise<{ csv: string; rows: number }>;
export type ExportBuilder<K extends Kind> = (params: Extract<ExportParams, { kind: K }>) => Built;

/**
 * Domain khác góp cách dựng file cho `kind` của mình (V4-614: `report`) — đăng ký lúc
 * `onModuleInit`, để module export không phụ thuộc ngược vào domain (như `ProfileStatsRegistry`).
 */
@Injectable()
export class ExportBuilders {
  private readonly builders = new Map<Kind, (params: ExportParams) => Built>();

  register<K extends Kind>(kind: K, build: ExportBuilder<K>): void {
    const isKind = (p: ExportParams): p is Extract<ExportParams, { kind: K }> => p.kind === kind;
    this.builders.set(kind, (p) => {
      if (!isKind(p)) throw new Error(`Sai loại xuất: ${p.kind}`);
      return build(p);
    });
  }

  of(kind: Kind): ((params: ExportParams) => Built) | null {
    return this.builders.get(kind) ?? null;
  }
}
