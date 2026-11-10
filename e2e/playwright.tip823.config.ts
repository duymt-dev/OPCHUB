import { defineConfig } from '@playwright/test';
import server from './playwright.server.config';

/** Keep existing native/MSW builds untouched while verifying this corrective TIP. */
const servers = server.webServer
  ? Array.isArray(server.webServer)
    ? server.webServer
    : [server.webServer]
  : [];

export default defineConfig({
  ...server,
  webServer: servers.map((runtime) => ({
    ...runtime,
    env: { ...runtime.env, NEXT_DIST_DIR: '.next-server-tip823' },
  })),
});
