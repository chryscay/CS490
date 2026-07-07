// Migration: 20260707204133-add-owner-scoped-indexes
// Native MongoDB driver. Both functions receive the `ats` Db handle.
// Adds owner-scoped indexes backing the hottest DAO queries (every read filters by firebaseUid).
// up is idempotent (createIndex is safe to re-run); down drops the same named indexes.

export const up = async (db) => {
  await db.collection('jobs').createIndex({ firebaseUid: 1, stage: 1 }, { name: 'jobs_owner_stage' });
  await db.collection('jobs').createIndex({ firebaseUid: 1, lastActivityAt: -1 }, { name: 'jobs_owner_lastActivity' });
  await db.collection('documents').createIndex({ firebaseUid: 1 }, { name: 'documents_owner' });
  await db.collection('users').createIndex({ firebaseUid: 1 }, { name: 'users_owner' });
};

export const down = async (db) => {
  await db.collection('jobs').dropIndex('jobs_owner_stage');
  await db.collection('jobs').dropIndex('jobs_owner_lastActivity');
  await db.collection('documents').dropIndex('documents_owner');
  await db.collection('users').dropIndex('users_owner');
};