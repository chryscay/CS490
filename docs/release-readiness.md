# Release Readiness and Demo Hardening (S3-022 / SCRUM-86)

Final-sprint release checklist, smoke-test verification, and demo stabilization.
Satisfies S3-022 and rules S3-BR-016 (automated deployment), S3-BR-017
(post-deploy health checks), and S3-BR-020 (demo-critical flows covered by
smoke tests).

## 1. Deployment automation (S3-BR-016)

Merging to `main` triggers production deployment with no manual step:

- **Backend** — Render auto-deploys the pushed commit to
  `https://cs490-5kqw.onrender.com`.
- **Frontend** — Vercel auto-deploys `main` to the production frontend.
- CI (`build-and-test`) must be green before merge is allowed: lint, build,
  unit tests, and `migrate:verify`. No direct pushes to `main`; every change
  lands through a reviewed, non-author-approved PR.

Verification: confirm the latest `main` commit SHA matches the deployed build
(Render dashboard / Vercel deployment) before demo.

## 2. Post-deploy health checks (S3-BR-017)

After each merge to `main`, `.github/workflows/deploy-verify.yml` waits for the
backend to come up and polls the live health endpoint
(`GET /api/health`) with retry/backoff to tolerate free-tier cold starts. A
non-2xx after retries fails the workflow, surfacing a broken deploy immediately.

Verification: the deploy-verify run for the demo commit is green.

## 3. Smoke-test verification (S3-BR-020)

Demo-critical flows are covered by an automated smoke-test suite
(`npm run smoke`, backend) that exercises each critical path at the API level
and asserts the expected outcome. Suite maps to the demo checklist:

- Auth-scoped access and cross-user isolation (ownership 404s)
- Document lifecycle: create, list/metadata, version history
- Duplicate / rename (no unintended version)
- Archive / restore (version history preserved)
- Job-to-library linking + one-resume/one-cover-letter constraint
- Company research persistence
- Interview prep notes persistence
- Dashboard analytics (velocity / conversion / time-in-stage)

Verification: `npm run smoke` is green on the demo commit.

## 4. Pre-demo preparation checklist

Run before demo day (backed by `npm run seed`):

- [ ] Deployed environment is up (backend health check green, frontend loads).
- [ ] Primary demo user seeded with documents across multiple types, statuses,
      and tags.
- [ ] At least two jobs, with library documents linked.
- [ ] One company-research note and one interview-prep note populated.
- [ ] Timeline / stage-transition data present so analytics render non-empty.
- [ ] A second user account exists for live ownership checks.
- [ ] Browser console clean on the main flows (no errors/warnings).
- [ ] GitHub Actions tab ready to show CI + deploy verification evidence.
- [ ] Three negative unit tests identified to show and explain.

## 5. Go / No-Go criteria

Ship/demo only if all are true:

- CI (`build-and-test`) green on the demo commit.
- Deploy-verify workflow green on the demo commit.
- `npm run smoke` green.
- No open bug that breaks a demo-critical flow.
- Deployed SHA matches the intended `main` commit.

## 6. Rollback

- **Application**: revert the offending merge on `main`; the auto-deploy
  pipeline redeploys the previous good state.
- **Database**: follow the migration rollback procedure in
  `docs/database-migrations.md` (`migrate down` per migration; Atlas snapshot
  restore for destructive changes).