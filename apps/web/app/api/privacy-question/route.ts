import { questionHandlers } from '../../../lib/server/privacyQuestion';
export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handlers = questionHandlers();
export const POST = handlers.POST;
export const OPTIONS = handlers.OPTIONS;
