#!/usr/bin/env node
/**
 * Every figure in this library cites a document, and every cited
 * document is supposed to have an archived copy. This asserts the
 * second half: that each Drive id in `docs/source-archive.md` still
 * resolves to a real file that anyone can fetch.
 *
 * The rule it enforces is a release rule rather than a style one: if we
 * cannot reach the document a figure came from, we cannot verify the
 * figure, and if we cannot verify it we should not ship it. A manifest
 * row pointing at a file that has been moved, re-uploaded under a new
 * id, or had its sharing revoked is exactly the silent failure the
 * archive exists to prevent — and delete-and-reupload, which mints a new
 * id, is the documented way it happens.
 *
 * Unauthenticated on purpose. The archive folder is readable by anyone
 * so that a reader can check our sources, and this check goes through
 * the same door they would, so it fails when THEY would be turned away
 * rather than when our own credentials expire.
 */
import {readFileSync} from 'node:fs';

const MANIFEST = 'docs/source-archive.md';
const DRIVE = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)\//g;
const ROW_ID = /<a id="(sa-\d+)">/;

const lines = readFileSync(MANIFEST, 'utf8').split('\n');
const rows = [];
for (const line of lines) {
  const id = ROW_ID.exec(line);
  if (!id) continue;
  const drive = [...line.matchAll(DRIVE)].map((m) => m[1]);
  if (drive.length === 0) continue;
  const cells = line.split('|').map((c) => c.trim());
  rows.push({ref: id[1], title: cells[2] ?? '', fileId: drive[0]});
}

if (rows.length === 0) {
  console.error(`✗ check-source-archive: no rows found in ${MANIFEST}`);
  process.exit(1);
}

/** Drive answers a missing or private file with an HTML page and a 200,
 *  so the status alone proves nothing — the content type is the test. */
async function reachable(fileId) {
  const url = 'https://drive.google.com/uc?export=download&id=' + fileId;
  try {
    const res = await fetch(url, {redirect: 'follow'});
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok) return {fatal: true, why: `HTTP ${res.status}`};
    if (/text\/html/i.test(type)) {
      return {fatal: true, why: `HTML, not a file (${type})`};
    }
    return null;
  } catch (err) {
    // A transport failure is OUR network, not their archive, and must
    // not fail a gate that has to work on a train. Drive answering is
    // what proves the document; Drive not being reachable proves
    // nothing either way, so it is reported and passed over.
    return {fatal: false, why: `unreachable: ${err.message}`};
  }
}

const results = await Promise.all(
  rows.map(async (r) => ({...r, problem: await reachable(r.fileId)})),
);
const broken = results.filter((r) => r.problem);
const gone = broken.filter((r) => r.problem.fatal);
const offline = broken.filter((r) => !r.problem.fatal);

for (const r of offline) {
  console.warn(`! ${r.ref} ${r.title}: ${r.problem.why}`);
}
if (offline.length > 0) {
  console.warn(
    `! check-source-archive: ${offline.length} could not be reached — `
    + 'network, not the archive. Not treated as a failure.',
  );
}

if (gone.length > 0) {
  console.error(
    `✗ check-source-archive: ${gone.length} of ${rows.length} archived `
    + 'documents are gone or no longer readable',
  );
  for (const b of gone) {
    console.error(`    ${b.ref}  ${b.title}`);
    console.error(`      ${b.fileId} — ${b.problem.why}`);
  }
  console.error(
    '\n  A figure whose source cannot be fetched cannot be verified. '
    + 'Restore the file through Drive\'s "Manage versions" — a '
    + 're-upload mints a new id and breaks every pointer to it.',
  );
  process.exit(1);
}

console.log(
  `✓ check-source-archive: all ${rows.length - offline.length} of `
  + `${rows.length} archived documents fetch`,
);
