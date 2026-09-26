import { scanHistory } from './historyImport';
self.onmessage = async event => {
  try {
    const data = JSON.parse(await (event.data.file as File).text());
    const records = await scanHistory(data, event.data.settings, (done, total) => self.postMessage({ type: 'progress', done, total }));
    self.postMessage({ type: 'done', records });
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof SyntaxError ? 'This file is not valid JSON.' : error instanceof Error ? error.message : 'Could not read this export.' }); }
};
