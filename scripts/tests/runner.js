#!/usr/bin/env node
const { readCases, fetchWithTimeout, ensureOutDirs, saveReport } = require('./helpers');
const path = require('path');

(async function main(){
  const cases = readCases(path.resolve(__dirname, 'cases'));
  const out = ensureOutDirs();
  const results = [];

  for (const c of cases) {
    const id = c.id || c.name;
    const logPath = path.join(out, 'logs', `${id}.log`);
    const entry = { id: c.id, name: c.name, passed: false, message: null };
    try {
      const opts = { method: c.method || 'GET' };
      if (c.headers) opts.headers = c.headers;
      if (c.body && (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH')) {
        opts.body = JSON.stringify(c.body);
      }
      const res = await fetchWithTimeout(c.url, opts, c.timeout || 10000);
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch(e) { /* not json */ }
      fsWrite(logPath, `status:${res.status}\nbody:\n${text}\n`);
      // basic assertions
      if (c.expect) {
        if (c.expect.status && res.status !== c.expect.status) {
          entry.message = `expected status ${c.expect.status} got ${res.status}`;
          results.push(entry);
          continue;
        }
        if (c.expect.json && json) {
          // check that expected json is a subset
          const ok = isSubset(c.expect.json, json);
          if (!ok) {
            entry.message = `json mismatch`;
            results.push(entry);
            continue;
          }
        }
      }
      entry.passed = true;
      results.push(entry);
    } catch (err) {
      entry.message = err.message;
      fsWrite(logPath, `error:\n${String(err)}\n`);
      results.push(entry);
    }
  }

  const report = { runAt: new Date().toISOString(), results };
  saveReport(out, report);
  const passed = results.every(r => r.passed);
  console.log(`Test run complete. ${results.length} cases. ${results.filter(r=>r.passed).length} passed.`);
  process.exit(passed ? 0 : 2);
})();

function fsWrite(p, s) { require('fs').writeFileSync(p, s); }
function isSubset(expected, actual) {
  if (typeof expected !== 'object' || expected === null) return expected === actual;
  for (const k of Object.keys(expected)) {
    if (!(k in actual)) return false;
    const ev = expected[k];
    const av = actual[k];
    if (typeof ev === 'object' && ev !== null) {
      if (!isSubset(ev, av)) return false;
    } else {
      if (ev !== av) return false;
    }
  }
  return true;
}
