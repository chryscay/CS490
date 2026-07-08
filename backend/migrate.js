// Migration CLI. Mirrors seed.js: standalone connect -> run -> close.
//
// Usage (from backend/):
//   npm run migrate:status
//   npm run migrate:up
//   npm run migrate:down                          # rolls back the most recent applied
//   npm run migrate:create -- add-owner-scoped-indexes
//
// Reads MONGO_URI from process.env (backend/.env locally; injected env in CI/prod).

import dotenv from 'dotenv';

dotenv.config({ override: true });

import mongodb from 'mongodb';
import { runStatus, runUp, runDown, runVerify, createMigration } from './src/lib/migrate/runner.js';

const DB_NAME = 'ats';

async function main() {
  const [, , command, ...args] = process.argv;

  // `create` scaffolds a file and needs no DB connection.
  if (command === 'create') {
    const slug = args[0];
    if (!slug) {
      console.error('Usage: npm run migrate:create -- <slug>');
      process.exit(1);
    }
    console.log(`Created migration: ${await createMigration(slug)}`);
    return;
  }

  if (command === 'verify') {
    await runVerify();
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Check backend/.env (local) or injected env (CI/prod).');
    process.exit(1);
  }

  const client = new mongodb.MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    switch (command) {
      case 'status': await runStatus(db); break;
      case 'up':     await runUp(db);     break;
      case 'down':   await runDown(db);   break;
      default:
        console.error(`Unknown command: ${command ?? '(none)'}`);
        console.error('Commands: status | up | down | create <slug>');
        process.exit(1);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});