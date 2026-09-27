import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardTotals } from '../lib/dashboard/totals';
import { buildReport, messageKey } from '../lib/report/buildReport';
import { detectFast } from '@promptshield/engine';
import type { ParsedMessage } from '../lib/report/types';
import type { LiveStats } from '../lib/dashboard/liveStats';
const live: LiveStats = { version: 2, prompts: 1, conversations: 1, findings: 1, shared: 1, protected: 0, categories: ['EMAIL'], score: 97, cost: 3 };
test('empty dashboard starts at 100; live sends update the same totals', () => {
 assert.deepEqual(dashboardTotals(null, null), { messages: 0, findings: 0, categories: 0, score: 100 });
 assert.deepEqual(dashboardTotals(null, live), { messages: 1, findings: 1, categories: 1, score: 97 });
});
test('export baseline combines messages and findings, unions categories, and subtracts live penalties', () => {
 const message: ParsedMessage = { conversationId:'one',conversationTitle:'test',messageId:'one',role:'user',createdAt:1,text:'test@example.com' };
 const report = buildReport([message], 1, new Map([[messageKey(message),detectFast(message.text)]]), false);
 const result = dashboardTotals(report, live);
 assert.equal(result.messages,2);assert.equal(result.findings,2);assert.equal(result.categories,1);
 assert.equal(result.score,Math.max(0,report.privacyScore-3));
 assert.equal(dashboardTotals(report,{...live,cost:1000}).score,0);
});
