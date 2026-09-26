import { createHandlers } from '../../../lib/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const handlers=createHandlers();
export const GET=handlers.GET;
export const OPTIONS=handlers.OPTIONS;
