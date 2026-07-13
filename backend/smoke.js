// Demo smoke test (S3-BR-020) — run before release/demo, AFTER seeding.
//   MONGO_URI=... FIREBASE_UID=<uid> [FIREBASE_UID_2=<uid2>] [SMOKE_BASE_URL=http://localhost:3001] npm run smoke
// Verifies demo-critical flows: backend up, auth enforced, and seeded data
// round-trips through the real DAO layer. Exits non-zero if any check fails.

import mongodb from 'mongodb';
import dotenv from 'dotenv';
import JobsDAO from './src/dao/jobsDAO.js';
import DocumentsDAO from './src/dao/documentsDAO.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const UID = process.env.FIREBASE_UID;
const UID2 = process.env.FIREBASE_UID_2;
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001';

if (!MONGO_URI || !UID) {
  console.error('Usage: MONGO_URI=... FIREBASE_UID=<uid> npm run smoke');
  process.exit(1);
}

const results = [];
const check = (id, label, passed, detail = '') => {
  results.push(passed);
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${id.padEnd(9)} ${label}${detail ? ' — ' + detail : ''}`);
};

async function httpChecks() {
  console.log('\nBackend HTTP checks:');
  try {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json().catch(() => ({}));
    check('HEALTH', 'Backend health endpoint responds ok', res.status === 200 && body.status === 'ok');
  } catch {
    check('HEALTH', 'Backend health endpoint responds ok', false, `unreachable at ${BASE}`);
  }
  for (const path of ['/api/jobs', '/api/documents']) {
    try {
      const res = await fetch(`${BASE}${path}`);
      check('AUTH', `Unauthenticated ${path} blocked (401)`, res.status === 401);
    } catch {
      check('AUTH', `Unauthenticated ${path} blocked (401)`, false, 'request failed');
    }
  }
}

async function dataChecks(client) {
  await DocumentsDAO.injectDB(client);
  await JobsDAO.injectDB(client);
  const db = client.db('ats');
  console.log('\nData-layer flow checks (seeded demo data):');

  const docs = await DocumentsDAO.findAllForOwner(UID);
  check('C05', 'Document library returns documents', docs.length > 0, `${docs.length} docs`);
  const types = new Set(docs.map((d) => d.type));
  check('C06', 'Library has resume and cover letter', types.has('resume') && types.has('coverLetter'));
  const statuses = new Set(docs.map((d) => d.status));
  check('C09/C10', 'Library has active and archived docs', statuses.has('active') && statuses.has('archived'));
  check('C06', 'At least one doc has tags', docs.some((d) => (d.tags ?? []).length > 0));
  check('C08', 'At least one doc has version history (v2+)', docs.some((d) => (d.currentVersion ?? 0) >= 2));

  // Raw job fields — presence of links / research / prep on the stored docs.
  const rawJobs = await db.collection('jobs').find({ firebaseUid: UID }).toArray();
  const linked = rawJobs.filter((j) => j.linkedDocuments && (j.linkedDocuments.resume || j.linkedDocuments.coverLetter));
  check('C11', 'At least one job has linked documents', linked.length > 0, `${linked.length} linked`);
  check('C13/C14', 'A job has company research notes', rawJobs.some((j) => j.researchNotes?.trim()));
  check('C15', 'A job has interview prep notes', rawJobs.some((j) => j.interviewPrepNotes?.trim()));

  // Analytics compute against real data without throwing.
  for (const [id, name, fn] of [
    ['C16', 'velocity', () => JobsDAO.getVelocity(UID)],
    ['C16', 'stage conversion', () => JobsDAO.getStageConversion(UID)],
    ['C17', 'time-in-stage', () => JobsDAO.getTimeInStage(UID)],
  ]) {
    try { const v = await fn(); check(id, `Analytics ${name} computes`, v !== undefined && v !== null); }
    catch (e) { check(id, `Analytics ${name} computes`, false, e.message); }
  }

  // Ownership isolation (only if a second user is seeded).
  if (UID2) {
    const docs2 = await DocumentsDAO.findAllForOwner(UID2);
    const overlap = docs.some((a) => docs2.some((b) => String(b._id) === String(a._id)));
    check('C04', 'User A / User B document sets do not overlap', !overlap);
  }
}

async function main() {
  await httpChecks();
  const client = new mongodb.MongoClient(MONGO_URI);
  try {
    await client.connect();
    await dataChecks(client);
  } finally {
    await client.close();
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed.`);
  if (passed !== results.length) process.exit(1);
}

main().catch((err) => { console.error('Smoke run failed:', err); process.exit(1); });