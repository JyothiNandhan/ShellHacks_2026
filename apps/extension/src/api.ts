/** Person 2 integration boundary. Replace these explicit stubs with contract 5.7.
 * getAdapter=null deliberately keeps site guards inactive until real integration.
 */
import type { Settings,DetectionResult,Finding,EventSource,EventAction,PlaceholderMapper } from '@promptshield/engine';
import type { Extracted } from '@promptshield/engine/files';
export interface GatePayload {mode:'paste'|'file'|'send'|'cant_check';title:string;items:Array<{label:string;value:string;why:string;placeholder:string}>;topics:Array<{label:string;snippet:string;why:string}>;fileName?:string;reason?:string;}
export type GateChoice='primary'|'secondary'|'cancel';
export interface SiteAdapter {readonly site:string;}
function pending():never{throw new Error('Person 2 extension API is not connected');}
export function getAdapter():SiteAdapter|null{return null;}
export async function getSettings():Promise<Settings>{return pending();}
export function convId():string{return pending();}
export async function getMapper():Promise<PlaceholderMapper>{return pending();}
export async function saveMapper(_mapper:PlaceholderMapper):Promise<void>{return pending();}
export async function detectWithTimeout(_text:string,_ms?:number):Promise<DetectionResult>{return pending();}
export async function splitForPrompt(_result:DetectionResult):Promise<{toAsk:Finding[];allowlisted:Finding[]}>{return pending();}
export async function openGate(_payload:GatePayload):Promise<GateChoice>{return pending();}
export async function approve(_findings:Finding[]):Promise<void>{return pending();}
export async function logEvents(_findings:Finding[],_source:EventSource,_action:EventAction):Promise<void>{return pending();}
export async function extractFile(_file:File):Promise<Extracted>{return pending();}
