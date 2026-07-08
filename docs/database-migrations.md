# Production Database and Migrations (S3-016 / SCRUM-80)

Covers the production data store, the migration workflow, and the rollback plan
required by S3-BR-018 ("Production database changes must use versioned migration
workflow").

## Production data store

- MongoDB Atlas, cluster `cluster0.ea8iwxg.mongodb.net`, database `ats`.
- The backend connects via `process.env.MONGO_URI`:
  - Locally: loaded from `backend/.env` (gitignored).
  - On Render (production): injected as an environment variable, not a file.
- Note: production and local development currently share the same Atlas cluster
  and `ats` database. Any migration applied locally is applied to production.
  If a separate dev database is introduced later, `migrate up` must be run once
  per database.

## Migration workflow (native driver, no ORM)

Migrations are versioned scripts in `backend/migrations/`, named
`YYYYMMDDHHMMSS-slug.js` (UTC timestamp prefix so parallel branches never
collide on ordering). Each exports an `up(db)` and a `down(db)` that receive the
native `ats` Db handle. Applied migrations are tracked in the `migrations`
collection in Atlas, so runs are idempotent.

### Commands (run from `backend/`)

- `npm run migrate:create -- <slug>` — scaffold a new timestamped migration.
- `npm run migrate:status` — list applied vs pending.
- `npm run migrate:up` — apply all pending migrations, in order.
- `npm run migrate:down` — roll back the most recently applied migration.
- `npm run migrate:verify` — structurally validate every migration file
  (each must export `up`/`down` and be importable). No DB connection; this is
  the check that runs in CI.

### Authoring rules

- Keep `up` idempotent where possible (`createIndex` is naturally safe to
  re-run; guard data backfills so they only touch un-migrated documents).
- Make `down` a true reverse of `up`.
- Any migration that mutates user records must preserve the `firebaseUid` owner
  field and include a test asserting ownership is preserved.

## Rollback plan (S3-BR-018)

1. Check current state: `npm run migrate:status`.
2. Reverse the last applied migration: `npm run migrate:down`. This runs that
   migration's `down` and removes its ledger record.
3. Confirm: `npm run migrate:status` should show it pending again.

### Destructive changes

A `down` cannot recover data destroyed by an `up` (e.g. a dropped field or
collection). For destructive migrations, the rollback path is an **Atlas
snapshot restore** (Atlas → cluster → Backup → Restore) to a point in time
before the migration ran. Note this explicitly in the PR for any such migration.

## Where migrations run

- CI verifies migration files structurally (`migrate:verify`) and runs the
  runner's unit tests. CI never receives real Atlas credentials, so it does not
  apply migrations.
- Applying a migration to production (`migrate:up`) is a deliberate, documented
  step run by the deployer against the production `MONGO_URI` — not an automatic
  on-boot action, so a bad migration can never block the app from serving.

## Deferred hardening

- Concurrency lock: v1 has no advisory lock. Safe for a single Render instance;
  add a lock collection if the deploy topology ever runs the runner concurrently.