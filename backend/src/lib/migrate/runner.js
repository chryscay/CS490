// Migration runner — versioned MongoDB migrations for the native driver.
// Pure orchestration. File I/O is injected via `source` so tests can supply
// fake migrations (same spirit as injectDB). The CLI in backend/migrate.js
// calls these with no source, defaulting to the real filesystem.

import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../../../migrations'); // -> backend/migrations
const LEDGER = 'migrations';

// Default source: reads real migration files from backend/migrations/.
export const fsSource = {
  async list() {
    if (!existsSync(MIGRATIONS_DIR)) return [];
    const entries = await readdir(MIGRATIONS_DIR);
    return entries
      .filter((f) => f.endsWith('.js'))
      .map((f) => f.replace(/\.js$/, ''))
      .sort(); // timestamp prefix => chronological
  },
  async load(name) {
    const full = path.join(MIGRATIONS_DIR, `${name}.js`);
    if (!existsSync(full)) {
      throw new Error(
        `Migration file ${name}.js not found. Restore the file, or use an Atlas snapshot for recovery.`
      );
    }
    const mod = await import(pathToFileURL(full).href);
    if (typeof mod.up !== 'function' || typeof mod.down !== 'function') {
      throw new Error(`Migration ${name} must export async up(db) and down(db).`);
    }
    return mod;
  },
};

async function getAppliedNames(db) {
  const docs = await db.collection(LEDGER).find({}, { projection: { name: 1 } }).toArray();
  return new Set(docs.map((d) => d.name));
}

export async function runStatus(db, source = fsSource) {
  const names = await source.list();
  const applied = await getAppliedNames(db);
  if (names.length === 0) {
    console.log('No migration files found in backend/migrations/.');
    return { applied: [], pending: [] };
  }
  console.log('Migration status:');
  const pending = [];
  for (const name of names) {
    const isApplied = applied.has(name);
    if (!isApplied) pending.push(name);
    console.log(`  [${isApplied ? 'x' : ' '}] ${name}`);
  }
  console.log(`\n${applied.size} applied, ${pending.length} pending.`);
  return { applied: [...applied], pending };
}

export async function runUp(db, source = fsSource) {
  const names = await source.list();
  const applied = await getAppliedNames(db);
  const pending = names.filter((n) => !applied.has(n));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return { appliedNow: [] };
  }

  const appliedNow = [];
  for (const name of pending) {
    const mod = await source.load(name);
    console.log(`Applying ${name} ...`);
    await mod.up(db); // if this throws, we stop and do NOT record it
    await db.collection(LEDGER).insertOne({ name, appliedAt: new Date(), direction: 'up' });
    appliedNow.push(name);
    console.log(`  applied ${name}`);
  }
  console.log(`\nApplied ${appliedNow.length} migration(s).`);
  return { appliedNow };
}

export async function runDown(db, source = fsSource) {
  const appliedDocs = await db.collection(LEDGER).find({}).toArray();
  if (appliedDocs.length === 0) {
    console.log('No applied migrations to roll back.');
    return { rolledBack: null };
  }

  // Roll back the most recently applied = highest name in filename (timestamp) order.
  const last = appliedDocs.map((d) => d.name).sort().at(-1);
  const mod = await source.load(last); // throws with recovery guidance if file is missing

  console.log(`Rolling back ${last} ...`);
  await mod.down(db); // if this throws, we stop and KEEP the ledger record
  await db.collection(LEDGER).deleteOne({ name: last });
  console.log(`  rolled back ${last}`);
  return { rolledBack: last };
}

export async function runVerify(source = fsSource) {
  const names = await source.list();
  if (names.length === 0) {
    console.log('No migration files to verify.');
    return { verified: [] };
  }
  console.log('Verifying migration files:');
  for (const name of names) {
    await source.load(name); // throws if unloadable or missing up/down
    console.log(`  ok ${name}`);
  }
  console.log(`\nVerified ${names.length} migration file(s).`);
  return { verified: names };
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}

const STUB = `// Migration: {{name}}
// Native MongoDB driver. Both functions receive the \`ats\` Db handle.
// Keep \`up\` idempotent (safe to re-run); make \`down\` a true reverse where possible.
// For destructive changes \`down\` cannot recover, note the Atlas-snapshot fallback in the PR.

export const up = async (db) => {
  // e.g. await db.collection('jobs').createIndex({ firebaseUid: 1 });
};

export const down = async (db) => {
  // e.g. await db.collection('jobs').dropIndex('firebaseUid_1');
};
`;

export async function createMigration(slug) {
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!clean) throw new Error('Provide a slug, e.g. add-owner-scoped-indexes');
  const name = `${timestamp()}-${clean}`;
  const file = `${name}.js`;
  await mkdir(MIGRATIONS_DIR, { recursive: true });
  const full = path.join(MIGRATIONS_DIR, file);
  if (existsSync(full)) throw new Error(`Migration already exists: ${file}`);
  await writeFile(full, STUB.replace('{{name}}', name), 'utf8');
  return path.relative(process.cwd(), full);
}