import { env } from './env';

const server = env.E2E_TARGET === 'server';

export const PROTO_URL = `http://localhost:${env.PROTO_PORT}`;
export const PORTAL_URL = `http://localhost:${server ? env.SERVER_PORTAL_PORT : env.PORTAL_PORT}`;
export const ADMIN_URL = `http://localhost:${server ? env.SERVER_ADMIN_PORT : env.ADMIN_PORT}`;
