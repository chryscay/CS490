# CS490 - ATS for Candidates

## Project Overview
ATS for Candidates is a candidate-facing application tracking system that helps job seekers manage their job search campaign.

## Sprint 1 Focus
Sprint 1 will focus on:

- User authentication
- Protected routes
- User profile CRUD
- Profile validation
- Engineering baseline: lint, build, tests, and pull request review

We are not building job tracking, document management, AI features, metrics, or deployment in Sprint 1 unless approved.

## Getting Started

### Prerequisites
- Node.js >= 20
- npm >= 10

### Install dependencies
```bash
npm install
```

### Run frontend only
```bash
npm run frontend
```
Starts the Vite dev server at **http://localhost:5173**

### Run backend only
```bash
npm run backend
```
Starts the Express server at **http://localhost:3001**
Health check: **http://localhost:3001/api/health** → `{ "status": "ok" }`

### Run both (recommended)
```bash
npm run dev
```
Runs frontend and backend concurrently with labeled output.

---

## Team Workflow

### Branching Rules
- No direct pushes to `main`
- One Jira ticket = one branch = one pull request
- Every pull request must be reviewed before merging
- Pull requests should be small and focused

### Branch Naming
Examples:

- `SCRUM-1-repo-setup`
- `SCRUM-2-auth-backend`
- `SCRUM-3-login-page`
- `SCRUM-4-profile-api`

### Pull Request Rules
Each PR should include:

- Summary of changes
- Jira ticket number
- Testing evidence
- Screenshots if UI changed

### Sprint 1 Definition of Done
A ticket is done when:

- Code is complete
- Code builds successfully
- Tests pass
- PR is reviewed
- PR is merged into `main`