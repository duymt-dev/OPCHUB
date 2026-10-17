/** Ranh giới import — xem coding-packs/standards/global/code-structure.md */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-not-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'feature-public-api-only',
      comment: 'Feature chỉ được import feature khác qua index.ts',
      severity: 'error',
      from: { path: '^apps/[^/]+/src/features/([^/]+)/' },
      to: {
        path: '^apps/[^/]+/src/features/',
        pathNot: ['^apps/[^/]+/src/features/$1/', '^apps/[^/]+/src/features/[^/]+/index\.tsx?$'],
      },
    },
    {
      name: 'server-module-public-api',
      comment: 'Domain server chỉ import domain khác qua modules/<x>/index.ts (nestjs-modules.md)',
      severity: 'error',
      from: { path: '^apps/server/src/modules/([^/]+)/' },
      to: {
        path: '^apps/server/src/modules/',
        pathNot: ['^apps/server/src/modules/$1/', '^apps/server/src/modules/[^/]+/index\.ts$'],
      },
    },
    {
      name: 'server-common-not-import-modules',
      comment: 'common/ là hạ tầng, không phụ thuộc domain',
      severity: 'error',
      from: { path: '^apps/server/src/common/' },
      to: { path: '^apps/server/src/modules/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // src/generated = Prisma client tự sinh (vòng import nội bộ của Prisma, không phải code của ta)
    exclude: { path: '(node_modules|\.next|dist|\.turbo|/src/generated/)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
