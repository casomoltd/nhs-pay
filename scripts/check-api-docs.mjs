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

// README drift. `docs/api.md` is gated both ways above; README.md was
// gated in NEITHER direction, which is how two renamed exports lived on
// in it unnoticed — the names were correct once and nothing re-read
// them.
//
// Scoped to SCREAMING_SNAKE_CASE because a constant in backticks is
// almost always one of ours, where a camelCase word in prose often is
// not. Narrow and quiet beats broad and ignored: a check that cries
// wolf about `npm run check` gets switched off.
const readme = readFileSync('README.md', 'utf8');
const README_ALLOW = new Set([
  // Names that are genuinely not exports of this package.
  'AGPL', 'NHS', 'PAYE', 'HCAS', 'CARE', 'GAD', 'CPI', 'ABS', 'LSA',
  'ERF', 'LRF', 'NPA', 'SPA', 'NLW', 'SI', 'MSG', 'SAS', 'GP', 'DDRB',
]);
const readmeStale = [...new Set(
  [...readme.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)].map((m) => m[1]),
)].filter((n) => !exported.has(n) && !README_ALLOW.has(n)).sort();

let failed = false;
const missing = [...exported].filter((n) => !documented.has(n)).sort();
const stale = [...documented].filter((n) => !exported.has(n)).sort();

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
  failed = true;
}
if (readmeStale.length > 0) {
  console.error(
    `README.md names exports that no longer exist: ${
      readmeStale.join(', ')}`,
  );
  console.error(
    'Rename them, or add them to README_ALLOW if they are not exports.',
  );
  failed = true;
}
// Both drift reports, then one exit. Exiting inside the first block
// hid the second whenever they broke together, so fixing one drift
// revealed the other on the next run instead of the same one.
if (failed) {
  process.exit(1);
}
console.log(`api docs in sync: ${exported.size} exports`);
