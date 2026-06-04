# Data and Security Guardrails Context Document

**Ticket:** S1-003  
**Project:** ATS for Candidates (CS490)  
**Owner:** Christopher Cuzco  
**Canonical Rules Enforced:** S1-BR-001, S1-BR-006, S1-BR-008  
**Status:** Sprint 1 Baseline — Required Before Feature Coding Begins

---

## 1. Purpose

This document establishes the data ownership, authentication, authorization, and security standards for the ATS for Candidates application.

The purpose of these guardrails is to:

- Protect user privacy.
- Prevent unauthorized access to data.
- Ensure consistent security implementation across the application.
- Define security expectations for both human developers and AI assisted development.
- Maintain compliance with Sprint 1 business requirements.

---

## 2. Security Principles

### Principle 1: Authentication Before Access

All protected application resources require authenticated users.

Protected resources include:

- Dashboard
- Profile
- Settings
- Job Management Features
- Future Document Management Features
- Future AI Assisted Features

Unauthenticated users must not be able to access protected pages, APIs, or user specific data.

---

### Principle 2: Per-User Data Ownership

All user scoped records must belong to a specific user.

Each owned entity must contain an owner identifier.

Examples:

- Profile
- Job
- JobActivity
- Document
- DocumentVersion
- JobDocumentLink

Ownership must always be enforced through backend validation.

---

### Principle 3: Backend Authorization Is Required

Frontend checks may improve user experience, but they are not considered security controls.

All authorization decisions must be enforced on the backend.

Before granting access to user data, the backend must verify:

- The user is authenticated.
- The requested resource exists.
- The resource belongs to the authenticated user.

Backend validation is the authoritative source for access control.

---

## 3. Protected Route Behavior

Protected routes require authentication before access is granted.

Protected areas include:

- Dashboard
- Profile
- Settings
- Job Management Features

Unauthenticated users attempting to access protected resources must be redirected to the login page or receive an appropriate authorization error.

Authentication requirements apply to both frontend routes and backend API endpoints.

---

## 4. Authorization Standards

Authorization checks are required for all protected operations.

Authorization validation must occur before:

- Viewing data
- Creating records
- Updating records
- Deleting records

Users may only perform actions on records they own.

Ownership checks must be enforced consistently across all user scoped resources.

---

## 5. Prohibited Cross User Access Patterns

The following behaviors are prohibited:

- Accessing another user's profile.
- Accessing another user's jobs.
- Accessing another user's documents.
- Accessing another user's activity records.
- Modifying another user's data.
- Deleting another user's records.
- Trusting client supplied ownership information.
- Relying solely on frontend authorization checks.

All ownership validation must occur on the backend.

---

## 6. Development Expectations

All developers are responsible for following these guardrails when implementing new features.

Security considerations must be included during:

- Development
- Code Review
- Testing
- Pull Request Approval

Features involving user owned data are not considered complete unless ownership validation is implemented and tested.

---

## 7. Definition of Done

A feature involving user owned data is considered complete only when:

- Authentication requirements are enforced.
- Ownership validation is implemented.
- Authorization checks exist on the backend.
- Cross user access is prevented.
- Security related tests have been completed.
- Sprint 1 business rules are satisfied.

---
