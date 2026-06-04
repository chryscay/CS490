# Engineering Coding Standards Document

**Ticket:** S1-001 / SCRUM-15  
**Project:** ATS for Candidates (CS490)  
**Owner:** Hammad Imtiaz  
**Status:** Sprint 1 Baseline — required before feature coding begins  

---

## 1. Core Technical Stack & Compliance
* **Backend:** Python 3.x. All python source files must follow clean, modular structure. Code logic should prioritize optimal algorithmic complexity and performance stability.
* **Frontend:** JavaScript / React. Components must be modularized and cleanly isolated.
* **Compatibility:** All software elements must be fully compatible with a Linux/Ubuntu environment.

## 2. Directory Layout & Standards
* Feature files and source modules are grouped strictly by logical functionality.
* Auxiliary assets, system guidelines, and setup procedures belong exclusively in the designated `docs/` path.
* Document files must use clean, lowercase names with hyphens for readability (e.g., `engineering-coding-standards.md`).

## 3. Git Branching & Workflow Rules
* **Branch Isolation:** No work is to be done directly on the `main` branch. 
* **Naming Pattern:** All personal feature branches must stem from `main` using the specific ticket syntax: `S1-XXX-short-description` (e.g., `S1-001-engineering-coding-standards`).
* **Pull Requests:** Features require an active pull request, thorough team review, and successful merge verification before being pulled into the base configuration.

## 4. Code Quality, Security, & Environment Management
* **Linting & Verification:** All code updates must successfully pass standard local lint and unit syntax validation protocols prior to remote commits.
* **Secrets Tracking Safety:** **Never commit hardcoded configurations, system passwords, or API keys to the repository.**
* **Environment Control:** Operational tokens must be loaded strictly from local `.env` setup files. The configuration file `.env` must be explicitly listed within the tracking exclusions file (`.gitignore`) to avoid exposure.