const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DEFAULT_TIMEOUT = 10000;

async function fetchWithTimeout(url, opts = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, ...opts });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function readCases(dir) {
  const d = path.resolve(dir);
  const files = fs.readdirSync(d).filter(f => f.endsWith('.json')).sort();
  return files.map(f => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
}

function ensureOutDirs() {
  const base = path.resolve(__dirname, '../../out/tests');
  fs.mkdirSync(base, { recursive: true });
  fs.mkdirSync(path.join(base, 'logs'), { recursive: true });
  return base;
}

function saveReport(base, report) {
  fs.writeFileSync(path.join(base, 'report.json'), JSON.stringify(report, null, 2));
  const summary = report.results.map(r => `${r.id} ${r.name} => ${r.passed ? 'PASS' : 'FAIL'}${r.message ? ' - ' + r.message : ''}`).join('\n');
  fs.writeFileSync(path.join(base, 'report.txt'), `Summary:\n${summary}\n`);
}

module.exports = { fetchWithTimeout, readCases, ensureOutDirs, saveReport };
