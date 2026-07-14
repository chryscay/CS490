// Demo smoke test (S3-BR-020) — run before release/demo, AFTER seeding.
//   MONGO_URI=... FIREBASE_UID=<uid> [FIREBASE_UID_2=<uid2>] [FIREBASE_WEB_API_KEY=<key>] [SMOKE_BASE_URL=http://localhost:3001] npm run smoke
// Verifies demo-critical flows: backend up, auth enforced, seeded data
// round-trips through the real DAO layer, AND (when FIREBASE_WEB_API_KEY is
// set) the mutating document/job-link flows over real authenticated HTTP
// requests — not just direct DAO calls. FIREBASE_WEB_API_KEY is the same
// public value as frontend's VITE_FIREBASE_API_KEY; it's used to exchange an
// Admin-SDK-minted custom token for a real ID token, so no demo-user
// password is ever needed.
// Exits non-zero if any check fails.

import mongodb from 'mongodb';
import dotenv from 'dotenv';
import JobsDAO from './src/dao/jobsDAO.js';
import DocumentsDAO from './src/dao/documentsDAO.js';
import { getAuth } from 'firebase-admin/auth';
import './src/lib/firebase-admin.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const UID = process.env.FIREBASE_UID;
const UID2 = process.env.FIREBASE_UID_2;
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3001';

// Fixed synthetic jobId so repeated smoke runs reuse the same one document
// (documents are keyed by {firebaseUid, jobId, type}) instead of piling up
// fresh rows with no delete endpoint to clean them up.
const SMOKE_JOB_ID = '000000000000000000000001';
const SMOKE_DOC_TITLE = 'Smoke Test Document (safe to ignore)';

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

// Mint a real Firebase ID token for UID without needing a demo-user password:
// Admin SDK creates a custom token, then the public Identity Toolkit REST API
// exchanges it for an ID token the same way the client SDK would.
async function mintIdToken(uid) {
  const customToken = await getAuth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const body = await res.json();
  if (!res.ok || !body.idToken) {
    throw new Error(body.error?.message || 'Failed to mint ID token');
  }
  return body.idToken;
}

// S3-BR-020: exercise the mutating document/job-link flows over real
// authenticated HTTP requests (not just direct DAO calls), so a broken route,
// middleware wiring, or auth check would actually fail this suite.
async function authHttpChecks() {
  console.log('\nAuthenticated HTTP flow checks (S3-BR-020):');

  if (!WEB_API_KEY) {
    console.log('  [SKIP] FIREBASE_WEB_API_KEY not set — skipping authenticated HTTP flow checks.');
    return;
  }

  let idToken;
  try {
    idToken = await mintIdToken(UID);
  } catch (e) {
    check('HTTP', 'Mint ID token for authenticated checks', false, e.message);
    return;
  }
  const authed = (path, options = {}) =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers: { ...(options.headers ?? {}), Authorization: `Bearer ${idToken}` },
    });

  // Negative case (S3-BR-004/005): unsupported upload format rejected with 400.
  try {
    const form = new FormData();
    form.append('type', 'resume');
    form.append('jobId', SMOKE_JOB_ID);
    form.append('file', new Blob(['not a real image'], { type: 'image/png' }), 'smoke.png');
    const res = await authed('/api/documents/upload', { method: 'POST', body: form });
    check('HTTP', 'Upload rejects unsupported format (400)', res.status === 400);
  } catch (e) {
    check('HTTP', 'Upload rejects unsupported format (400)', false, e.message);
  }

  // Happy path upload (S3-BR-004, S3-BR-007): creates/bumps the one smoke doc.
  let smokeDocId;
  try {
    const form = new FormData();
    form.append('type', 'resume');
    form.append('title', SMOKE_DOC_TITLE);
    form.append('jobId', SMOKE_JOB_ID);
    form.append('file', new Blob(['Smoke test resume text.'], { type: 'text/plain' }), 'smoke.txt');
    const res = await authed('/api/documents/upload', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    smokeDocId = body.document?._id;
    check('HTTP', 'Upload supported format succeeds (201)', res.status === 201 && !!smokeDocId);
  } catch (e) {
    check('HTTP', 'Upload supported format succeeds (201)', false, e.message);
  }

  if (smokeDocId) {
    // Rename (S3-BR-007: metadata-only, no new version) — idempotent, renames to its own title.
    try {
      const res = await authed(`/api/documents/${smokeDocId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: SMOKE_DOC_TITLE }),
      });
      check('HTTP', 'Rename document (200)', res.status === 200);
    } catch (e) {
      check('HTTP', 'Rename document (200)', false, e.message);
    }

    // Archive then restore (S3-BR-009: reversible, version history preserved).
    try {
      const archiveRes = await authed(`/api/documents/${smokeDocId}/archive`, { method: 'POST' });
      const restoreRes = await authed(`/api/documents/${smokeDocId}/restore`, { method: 'POST' });
      check('HTTP', 'Archive then restore document (200/200)', archiveRes.status === 200 && restoreRes.status === 200);
    } catch (e) {
      check('HTTP', 'Archive then restore document (200/200)', false, e.message);
    }

    // Version history accessor (S3-BR-008: version + timestamp + ownership metadata).
    try {
      const res = await authed(`/api/documents/${smokeDocId}/versions`);
      const body = await res.json().catch(() => ({}));
      const versions = body.versions ?? [];
      const hasOwnership = versions.every((v) => v.version && v.createdAt && v.firebaseUid === UID);
      check('HTTP', 'Version history exposes ownership metadata', res.status === 200 && versions.length > 0 && hasOwnership);
    } catch (e) {
      check('HTTP', 'Version history exposes ownership metadata', false, e.message);
    }
  }

  // One-resume-per-job constraint (S3-BR-010/011): linking a second, different
  // resume onto an already-linked seeded job must be blocked with 409, not
  // silently overwritten. Read-only from the demo data's perspective.
  try {
    const jobsRes = await authed('/api/jobs');
    const jobsBody = await jobsRes.json().catch(() => ({}));
    const linkedJob = (jobsBody.jobs ?? []).find((j) => j.linkedDocuments?.resume);
    const docsRes = await authed('/api/documents');
    const docsBody = await docsRes.json().catch(() => ({}));
    const otherResume = (docsBody.documents ?? []).find(
      (d) => d.type === 'resume' && String(d._id) !== String(linkedJob?.linkedDocuments?.resume)
    );
    if (linkedJob && otherResume) {
      const res = await authed(`/api/jobs/${linkedJob._id}/linked-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'resume', documentId: otherResume._id }),
      });
      const body = await res.json().catch(() => ({}));
      check('HTTP', 'Relinking a job\'s resume without confirmReplace is blocked (409)', res.status === 409 && body.requiresConfirmation === true);
    } else {
      check('HTTP', 'Relinking a job\'s resume without confirmReplace is blocked (409)', false, 'no seeded linked job + alternate resume found');
    }
  } catch (e) {
    check('HTTP', 'Relinking a job\'s resume without confirmReplace is blocked (409)', false, e.message);
  }

  // Export (S3-BR-006): a linked document exports as a downloadable file.
  try {
    const jobsRes = await authed('/api/jobs');
    const jobsBody = await jobsRes.json().catch(() => ({}));
    const linkedJob = (jobsBody.jobs ?? []).find((j) => j.linkedDocuments?.resume);
    if (linkedJob) {
      const res = await authed(
        `/api/jobs/${linkedJob._id}/documents/${linkedJob.linkedDocuments.resume}/export?format=txt`
      );
      check('HTTP', 'Export linked document as txt (200)', res.status === 200 && (res.headers.get('content-type') || '').includes('text/plain'));
    } else {
      check('HTTP', 'Export linked document as txt (200)', false, 'no seeded linked job found');
    }
  } catch (e) {
    check('HTTP', 'Export linked document as txt (200)', false, e.message);
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
  await authHttpChecks();
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