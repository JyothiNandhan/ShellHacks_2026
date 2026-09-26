import { z } from 'zod';
export const toolIds = ['chatgpt','claude','gemini','copilot','perplexity','deepseek','meta_ai','grammarly'] as const;
export const ToolIdSchema = z.enum(toolIds);
export const toolNames = { chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',copilot:'Copilot',perplexity:'Perplexity',deepseek:'DeepSeek',meta_ai:'Meta AI',grammarly:'Grammarly' };
export const questions = [
 { questionId:'training', question:'Are my conversations used for model training by default?' },
 { questionId:'retention', question:'How long are my conversations kept?' },
 { questionId:'opt_out', question:'How can I stop my conversations being used for training?' },
 { questionId:'delete', question:'How can I delete my conversations?' },
] as const;
export const ToolSafetySchema = z.object({
 toolId:ToolIdSchema, toolName:z.string().min(1), generatedAt:z.string().datetime(), source:z.enum(['snowflake','cache','fallback']),
 answers:z.array(z.object({ questionId:z.enum(['training','retention','opt_out','delete']), question:z.string().min(1), answer:z.string().min(1), citations:z.array(z.object({url:z.url().refine(v=>new URL(v).protocol==='https:'),title:z.string().optional()})) })).length(4)
}).refine(v=>new Set(v.answers.map(a=>a.questionId)).size===4);
export const UNKNOWN = "The policy pages we checked don't clearly say.";
