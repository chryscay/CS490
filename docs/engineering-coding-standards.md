# Engineering Coding Standards Document

**Ticket:** SCRUM-15
**Project:** ATS for Candidates (CS490)
**Owner:** Hammad Imtiaz
**Status:** Sprint 1 Baseline — Canonical Architecture Aligned

---

## 1. Project Tech Stack & Compliance

* **Backend:** Node.js + Express. All API routing, controllers, middleware, and services must follow clean, modular patterns.
* **Frontend:** React + Vite, deployed through Vercel. Components must be modular, reusable, and clearly separated by layout, page, and feature responsibility.
* **Backend Deployment:** Render must be used for backend deployment.
* **Database & Access:** MongoDB must be used as the project database. Prisma must be used for schema modeling and database access.
* **Authentication:** Firebase Authentication must be used for user sign-up, login, identity, and protected-route verification.
* **AI Provider:** OpenAI API is a planned integration for AI-generated resume and cover letter features.
* **File Storage:** AWS S3 is a planned integration for uploaded document storage.
* **Testing:** Vitest, React Testing Library, and Supertest must be used for local testing and verification.
* **CI/CD:** GitHub Actions must be used to run linting, build checks, and tests before merge approval.
* **Runtime Compatibility:** Project setup, scripts, and dependencies must run consistently in the team’s development environment and deployment platforms, including Vercel for the frontend and Render for the backend.

## 2. Directory Layout & File Naming Conventions

* **Feature Grouping:** Source files must be grouped by logical project responsibility, such as authentication, profile, jobs, documents, AI, and shared utilities.
* **Documentation Location:** All team agreements, architecture notes, setup instructions, and coding standards must be stored inside the `docs/` folder.
* **File Naming:** Documentation files must use clean, lowercase, hyphen-separated names, such as `engineering-coding-standards.md`.
* **Case Consistency:** Source code directories and filenames should use consistent lowercase naming unless a framework convention requires otherwise.
* **Database Object Naming:** Database collection names should follow the project’s architecture baseline, including `users`, `profiles`, `jobs`, `job_activities`, `documents`, `document_versions`, and `job_document_links`. Prisma model names should clearly map to these collections while following Prisma naming conventions.

## 3. Git Workflow & Branching Architecture

* **Branch Security:** Direct commits or pushes to the `main` branch are strictly prohibited.
* **Branch Naming Pattern:** Feature work must branch off of `main` using the Jira ticket format: `SCRUM-#-short-description`

  * Example: `SCRUM-15-engineering-coding-standards`
* **Pull Request Requirement:** Code can only enter `main` through a Pull Request.
* **Merge Gate Isolation:** Pull Requests must pass GitHub Actions checks, including linting, build validation, and tests before merge approval.
* **Peer Review:** Each Pull Request must receive a peer review before being merged into `main`.
* **Merge Verification:** After merge, the team should confirm that the base branch still builds and runs successfully.

## 4. API Design & Response Structures

* **REST Endpoints:** Backend routes must follow REST-style API structure matching the architecture baseline, including routes such as `/api/auth/`, `/api/profile/`, `/api/jobs/`, `/api/documents/`, and `/api/ai/`.
* **Protected Routes:** Any route that accesses user-owned data must verify the Firebase authentication token before returning or modifying records.
* **Ownership Checks:** Backend logic must confirm that requested records belong to the authenticated Firebase user ID before allowing access.
* **Error Handling:** Express middleware and route handlers must catch failures cleanly and return consistent JSON error responses.
* **No Stack Trace Exposure:** Raw system errors, stack traces, credentials, or internal server details must not be exposed in API responses.
* **Response Consistency:** API responses should use predictable JSON structures for success and error cases.

## 5. Code Quality, Testing, & Review Standards

* **Modular Code:** Code must be separated by responsibility instead of placing large amounts of logic in a single file.
* **Frontend Testing:** React components and user interactions should be tested using Vitest and React Testing Library.
* **Backend Testing:** Express API endpoints should be tested using Supertest.
* **Linting:** All code updates must pass local linting before being committed.
* **Build Verification:** Developers must confirm that the frontend and backend build successfully before opening or updating a Pull Request.
* **Readable Naming:** Variables, functions, components, and files should use clear names that describe their purpose.
* **Comments:** Comments should explain important logic, security decisions, or non-obvious behavior. Unnecessary comments should be avoided.

## 6. Security, Environment, & Secret Safeguards

* **Zero Hardcoding Rule:** Under no circumstances may credentials, keys, tokens, or private configuration values be hardcoded into source files.
* **Protected Secrets:** This rule applies especially to:

  * Firebase service account credentials
  * MongoDB connection URIs
  * OpenAI API keys
  * AWS S3 access keys and bucket configuration
  * Render, Vercel, or GitHub deployment tokens
* **Environment Separation:** All sensitive system variables must be managed through local `.env` files or secure deployment environment settings.
* **Git Tracking Exclusion:** The `.env` file must be explicitly listed inside `.gitignore`.
* **Template Safety:** If an environment example file is needed, it should be named `.env.example` and contain placeholder values only.
* **Access Control:** User-specific data must always be tied to the authenticated Firebase user ID.
* **Security Review:** Any feature involving authentication, file uploads, AI requests, or user data must be reviewed carefully before merge.

## 7. Documentation & Maintenance

* **Documentation Updates:** Any major change to architecture, stack, environment setup, or workflow must be reflected in the appropriate `docs/` file.
* **Architecture Alignment:** Coding standards must stay aligned with the Sprint 1 Architecture Baseline.
* **Setup Instructions:** Required setup steps should be documented clearly enough for another team member to run the project locally.
* **Future Integrations:** Planned integrations such as OpenAI API and AWS S3 should be documented before implementation begins.