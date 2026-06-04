# AI Prompting and Review Context Document

**Ticket:** S1-004 · **Project:** ATS for Candidates (CS490) · **Owner:** Project Lead (chrys)
**Canonical rules enforced:** S1-BR-001, S1-BR-006, S1-BR-008
**Status:** Sprint 1 baseline — required before feature coding begins

---

## 1. Purpose and Scope

This document defines **how our team uses AI coding assistants to generate code for this project, and how that code is reviewed, tested, and approved before it merges to `main`.**

It is a *governance and process* document, not a feature spec. It is distinct from the product's own AI features (OpenAI-powered resume / cover-letter generation described in the PRD, §4.5), which are later-sprint work. This doc is about **AI-assisted development of our codebase**.

It serves two audiences:
- **Humans** on the team, as the working agreement for using AI responsibly.
- **AI assistants** themselves, as a context file. Anyone prompting an AI to write project code should point the tool at this document plus the relevant sibling context docs.

### Sibling context documents
This is one of four Sprint 1 context documents. AI assistants and reviewers should treat the full set as the source of truth:

| ID | Document | Owner | What it governs |
|----|----------|-------|-----------------|
| S1-001 | Engineering Coding Standards | Hammad | Naming, folder structure, lint/format, error handling, API response conventions |
| S1-002 | UI/UX Standards | Talha | Navigation model, dashboard interaction, component usage, spacing/typography |
| S1-003 | Data and Security Guardrails | Chris | Per-user ownership, authorization, protected routes, prohibited cross-user patterns |
| **S1-004** | **AI Prompting and Review (this doc)** | **chrys** | **How AI-generated code is prompted, reviewed, tested, approved** |

When a prompt produces code, it must conform to **all four**. This document tells you how to get the AI to do that and how to verify it did.

---

## 2. Tech Stack Context (give this to the AI)

Any prompt that asks for project code should establish this context so the AI does not invent the wrong stack:

- **Frontend:** React + Vite (deployed on Vercel)
- **Backend:** Node.js + Express (deployed on Render)
- **Database:** MongoDB, accessed via **Prisma** (Prisma MongoDB connector — schema changes are managed through Prisma schema updates + review, not SQL migrations)
- **Auth:** Firebase Authentication. The backend verifies the Firebase ID token on protected routes, then checks record ownership by the Firebase user ID stored on each record.
- **Testing:** Vitest + React Testing Library (frontend), Supertest (backend API)
- **CI/CD:** GitHub Actions (runs lint, build, unit tests on every PR)
- **Workflow:** GitHub + Jira. One Jira ticket = one branch = one PR.

---

## 3. Approved Use and Hard Limits

### Approved AI-assisted work
- Scaffolding components, routes, and Prisma models
- Drafting unit/integration tests (Vitest / RTL / Supertest)
- Refactors, boilerplate, and repetitive edits
- Explaining unfamiliar code, debugging, and writing doc comments
- Generating example prompts and reviewing diffs

### Never paste into an AI prompt
These tie directly to **S1-009 (environment management)** and **S1-003 (security guardrails)**:
- Secrets or credentials of any kind — Firebase service-account keys, MongoDB connection strings, OpenAI/AWS keys, JWTs, `.env` contents
- Real user data or any PII
- Private tokens from CI, Render, Vercel, or Atlassian

If a secret is ever pasted into a prompt by mistake, treat it as compromised: rotate it and notify the team in Discord.

### Authorship rule
**The person who opens the PR owns the code, regardless of how much of it an AI wrote.** You must understand every line you submit and be able to explain it in review. "The AI generated it" is not an acceptable answer to a review question.

---

## 4. Prompting Standards

A good prompt makes the AI produce code that already satisfies our rules, so review is faster. Every code-generating prompt should include:

1. **The task and the Jira/story ID** (e.g., "Implement S1-010 user self-registration, SCRUM-23").
2. **The stack** (from §2) so the AI targets React+Vite / Express / Prisma+MongoDB / Firebase / Vitest etc.
3. **The relevant context docs** — at minimum S1-003 for anything touching data or routes, plus S1-001 for style.
4. **The applicable canonical business rules**, stated explicitly (see §5).
5. **A test requirement** — ask for happy-path *and* at least one non-happy-path test in the same response (see §6).
6. **File paths / existing patterns** to match, so the AI doesn't reinvent structure.

### Prompt template

```
Project: ATS for Candidates. Stack: React+Vite frontend, Node/Express backend,
MongoDB via Prisma, Firebase Authentication, tests in Vitest/RTL (frontend) and
Supertest (backend).

Task: <what to build> for story <S1-0xx / SCRUM-xx>.

Rules you MUST follow:
- Match our coding standards (S1-001) and data/security guardrails (S1-003).
- If this touches a protected route: require a verified Firebase auth token
  (S1-BR-001). Unauthenticated requests must be rejected by the backend.
- If this reads/writes user-scoped data: scope every query to the authenticated
  user's Firebase UID (S1-BR-006). Never return or modify another user's records.
- Enforce ownership SERVER-SIDE (S1-BR-008). Do not rely on frontend checks.

Deliverables:
- The implementation.
- At least one happy-path test and one non-happy-path test (validation,
  unauthorized, or cross-user denial as relevant).
- A one-line note on anything you assumed or could not verify.
```

### Do not blindly trust the AI
- AI invents non-existent packages, APIs, and Prisma/Mongo syntax. Verify every import and method against real docs before committing.
- AI-written tests can be tautological or assert nothing meaningful — read them, don't just run them.
- If the AI is confidently wrong twice on the same point, stop and solve it yourself.

---

## 5. Security Guardrails for AI-Generated Code (S1-BR-001 / 006 / 008)

This is the core of why S1-004 references these three rules. Both prompting and review must hold the line here.

| Rule | What it means | What the prompt must require | What the reviewer must verify |
|------|---------------|------------------------------|-------------------------------|
| **S1-BR-001** | Auth required on all protected routes | Protected endpoints verify the Firebase ID token before doing anything | No protected route is reachable without a valid token; AI didn't leave an endpoint open |
| **S1-BR-006** | Records isolated by owner identity | Every query filters by the authenticated user's Firebase UID | No query returns or mutates records the user doesn't own; no "get all" without an owner filter |
| **S1-BR-008** | Ownership enforced server-side | Ownership checks live in the backend, not just the UI | AI did not "secure" something by only hiding it in the frontend; backend rejects cross-user access |

If AI output violates any of these, the PR is blocked until fixed — even if everything else is perfect.

---

## 6. Testing Requirements for AI-Generated Code

AI-generated code follows the **same Sprint 1 test baseline** as hand-written code. No exceptions for "the AI wrote it."

- **Every story** includes at least one automated test (new or updated).
- **Auth / authorization** stories include **negative-path** tests (unauthenticated request denied; cross-user access denied).
- **Validation** stories include **field-level error assertions**.
- **Ownership** is tested to prove cross-user read/write is denied (S1-BR-006 / 007 / 008).
- **Persistence check** wherever data is created or updated.
- Frontend tests use **Vitest + React Testing Library**; backend API tests use **Supertest**.
- AI-generated tests are reviewed like any other code — confirm they actually assert behavior and would fail if the code broke.

A story is not testable-by-AI-alone: the author confirms tests pass **locally and in CI** before requesting review.

---

## 7. Review and Approval Gate

Workflow (unchanged from team agreement): **one Jira ticket → one branch → one PR → review → merge.**

### PR description must include
1. **Test evidence** — what was tested and the result (per Sprint 1 DoD).
2. **AI usage note** — a short line on which parts were AI-assisted (e.g., "registration route + tests drafted with AI, reviewed and edited by me"). This is for transparency, not blame.

### Reviewer checklist (PR Review Lead: chrys)
- [ ] Code does what the story/ticket says, and works in the running app
- [ ] Matches coding standards (S1-001) and UI/UX standards (S1-002) where relevant
- [ ] **S1-BR-001:** protected routes verify the Firebase token
- [ ] **S1-BR-006:** all user-scoped queries are owner-filtered
- [ ] **S1-BR-008:** ownership enforced server-side, not just in the UI
- [ ] No secrets, keys, or `.env` values committed
- [ ] No hallucinated packages / APIs / Prisma-Mongo calls — imports and methods verified
- [ ] Required tests present: happy-path + at least one non-happy-path, plus negative-path for auth/ownership
- [ ] Tests are meaningful (would fail if the behavior broke), not tautological
- [ ] Author can explain the code (AI authorship does not waive this)
- [ ] CI is green (lint, build, unit tests via GitHub Actions)

### Merge gate
- GitHub Actions must pass (lint + build + unit tests). **Any failing check blocks merge.**
- At least one reviewer approval required.
- CI output is visible to the reviewer before merge.

---

## 8. Definition of Done (S1-004)

- [ ] This document is published in the repo (e.g. `/docs/ai-prompting-and-review-context.md`) and linked from the docs index / README.
- [ ] It is referenced from `CLAUDE.md` / `AGENTS.md` (or equivalent) so AI assistants load it as context.
- [ ] The team has acknowledged it in Discord.
- [ ] (If required) the same content is published in Jira **Docs**.

> Per the Sprint 1 stories file, every story needs at least one automated test update. This ticket is documentation-only, so confirm with the professor whether a test stub is expected; if so, the satisfying artifact is typically a CI check that verifies the doc/link exists, or this requirement is waived for context-doc stories.

---

## 9. Quick Reference

**Before prompting:** stack context + story ID + relevant context docs + applicable S1-BR rules + "include tests."
**Before committing:** verify imports/APIs are real; read the AI's tests; no secrets.
**Before merging:** PR has test evidence + AI usage note; reviewer checklist passes; CI green.
**Always:** the PR author owns and understands the code.
