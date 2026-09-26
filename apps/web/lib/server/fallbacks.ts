import chatgpt from '../../../../fixtures/tool-safety/chatgpt.json';
import claude from '../../../../fixtures/tool-safety/claude.json';
import gemini from '../../../../fixtures/tool-safety/gemini.json';
import copilot from '../../../../fixtures/tool-safety/copilot.json';
import perplexity from '../../../../fixtures/tool-safety/perplexity.json';
import deepseek from '../../../../fixtures/tool-safety/deepseek.json';
import meta_ai from '../../../../fixtures/tool-safety/meta_ai.json';
import grammarly from '../../../../fixtures/tool-safety/grammarly.json';
import { ToolSafetySchema } from './contracts';
import type { ToolId } from '@promptshield/engine';
import type { ToolSafety } from './contracts';
const fixtures = {chatgpt,claude,gemini,copilot,perplexity,deepseek,meta_ai,grammarly};
export function fallbackFor(tool: ToolId): ToolSafety { const value=ToolSafetySchema.parse(fixtures[tool]); return {...value,source:'fallback',answers:value.answers.map(a=>({...a,citations:a.citations.map(c=>({url:c.url,...(c.title===undefined?{}:{title:c.title})}))}))}; }
