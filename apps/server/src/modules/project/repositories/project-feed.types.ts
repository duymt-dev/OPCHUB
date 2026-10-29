import type { ProjectAudience, ProjectNeed, ProjectStage } from '@opchub/shared';
import type { ProjectSort, ProjectStageFilter } from '@opchub/shared/api-domains';

export interface ExploreFilter {
  storeId?: string | undefined;
  cat?: string | undefined;
  stage?: ProjectStageFilter | undefined;
  q?: string | undefined;
  sort: ProjectSort;
  /** D-89 (v4): bộ lọc bên trái của Khám phá */
  audience?: ProjectAudience | undefined;
  provinces?: string[] | undefined;
  stages?: ProjectStage[] | undefined;
  needs?: ProjectNeed[] | undefined;
}
