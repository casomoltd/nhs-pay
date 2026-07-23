/**
 * Drift gate: docs/api.md vs the export surface of
 * src/index.ts. Name-level, two-way — a new export missing
 * from the doc fails, and a documented name no longer
 * exported fails. The doc carries no signatures, so names
 * are the whole contract; signatures live in the source and
 * the shipped d.ts.
 *
 * Doc names are read only from table rows (first cell) and
 * "**Types:**" lines, so prose may mention anything freely.
 */

import {readFileSync} from 'node:fs';

const index = readFileSync('src/index.ts', 'utf8');
const doc = readFileSync('docs/api.md', 'utf8');

const exported = new Set();
for (const m of index.matchAll(/export (?:type )?\{([^}]*)\}/g)) {
  for (const raw of m[1].split(',')) {
    const name = raw.trim();
    if (name) exported.add(name);
  }
}

const documented = new Set();
let inTypes = false;
for (const line of doc.split('\n')) {
  if (line.startsWith('**Types:**')) inTypes = true;
  else if (line.trim() === '') inTypes = false;

  let scope = null;
  if (inTypes) scope = line;
  else if (line.startsWith('| `')) {
    scope = line.slice(0, line.indexOf('|', 2));
  }
  if (scope === null) continue;
  for (const m of scope.matchAll(/`([A-Za-z_$][\w$]*)`/g)) {
    documented.add(m[1]);
  }
}

const missing = [...exported].filter((n) => !documented.has(n)).sort();
const stale = [...documented].filter((n) => !exported.has(n)).sort();

let failed = false;
if (missing.length) {
  failed = true;
  console.error(
    `docs/api.md is missing exports: ${missing.join(', ')}`,
  );
}
if (stale.length) {
  failed = true;
  console.error(
    `docs/api.md lists withdrawn exports: ${stale.join(', ')}`,
  );
}
if (failed) {
  console.error('Update docs/api.md to match src/index.ts.');
  process.exit(1);
}
console.log(`api docs in sync: ${exported.size} exports`);
