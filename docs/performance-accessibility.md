# Performance and Accessibility Pass (S3-019 / SCRUM-83)

Documents the accessibility and performance audit for Sprint 3, the issues
found, and the fixes applied. Satisfies S3-019 (rules S3-BR-019, S3-BR-020).

## Tooling added

- **eslint-plugin-jsx-a11y** (frontend). Static accessibility linting wired into
  the flat ESLint config at recommended severity. Because lint already blocks
  merges in CI, accessibility regressions now block merges too — this is a
  permanent guardrail, not a one-time sweep.
- **vitest-axe** (frontend, dev). Runtime accessibility assertions: axe walks the
  rendered DOM in tests and fails on any violation. Registered via
  `expect.extend` in the accessibility test suite.

## Accessibility issues found and fixed

The initial `npm run lint` after adding jsx-a11y surfaced 9 errors across 3
components. All were fixed:

1. **Unassociated form labels — RegisterPage (3).** The username, email, and
   password `<label>`s were not tied to their inputs. Fixed with `htmlFor` + a
   matching `id` on each input, so screen readers announce the correct label and
   clicking a label focuses its field.

2. **Unassociated group labels — CareerPreferencesSection (2).** The "Target
   Roles" and "Location Preferences" headings sat above dynamically-added input
   groups, not single controls, so `htmlFor` did not apply. Converted from
   `<label>` to `<span>` (styling unchanged) to reflect that they are group
   headings, not control labels. The Work Mode and Salary fields already had
   correct `htmlFor`/`id` associations and were left as-is.

3. **Keyboard-inaccessible job card — JobCard (4).** The card was a `<li>` with
   an `onClick` but no keyboard support, so keyboard-only users could not open a
   job. Restructured so the clickable card surface is a native `<button>` (Enter/
   Space and focus for free) while the `<li>` remains a proper list item. This
   also removed a now-unnecessary click-propagation workaround around the stage
   and edit controls. A visible focus ring was added to the card button.

Post-fix: `npm run lint` reports 0 errors. (One pre-existing non-a11y
react-refresh warning in InterviewForm.jsx remains, out of scope for this pass.)

## Accessibility tests added

`frontend/src/test/accessibility.test.jsx` runs axe against the two components
that had the most violations (RegisterPage, CareerPreferencesSection) and asserts
zero violations. These guard against regression: if a future change reintroduces
an a11y problem on these components, the suite fails.

## Performance

- **Owner-scoped database indexes (shipped in S3-016).** Every DAO read is scoped
  by `firebaseUid`; the migration `20260707204133-add-owner-scoped-indexes`
  added compound indexes on the jobs, documents, and users collections
  (`firebaseUid`-leading). This lets the hottest queries use an index instead of
  a full collection scan, which is the primary query-performance win for the app.
- **Client-side filtering/sorting (S3-006).** Document library filtering and
  sorting operate on the already-fetched list rather than issuing a new request
  per interaction, avoiding round-trips.

## Known limitations / follow-ups

- axe coverage is currently on the two audited components; extending axe
  assertions to more pages is a reasonable future hardening step.
- jsx-a11y is at recommended severity; individual rules can be tightened later if
  desired.