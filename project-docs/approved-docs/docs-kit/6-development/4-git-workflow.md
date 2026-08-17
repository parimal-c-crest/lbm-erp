# Git Workflow

> **Purpose**
>
> This document defines the standard Git workflow, branching model, commit conventions, pull
> request process, merge strategy, and repository collaboration guidelines for the LBM ERP Rewrite.
> It ensures all developers and AI coding assistants contribute code in a consistent, traceable, and
> maintainable manner.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Repository | `https://github.com/parimal-c-crest/lbm-erp.git` |
| Git Hosting | GitHub [ADR-181] |
| Workflow Model | GitHub Flow [ADR-181] |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

GitHub Flow (ADR-181) — a single long-lived `main` branch, always deployable, plus short-lived
feature branches merged via reviewed, CI-gated pull requests. No `develop` branch, no `release/*`
branching overhead — this project ships continuously from `main`, matching a small-team,
single-product, no-multi-version-support shape (no legacy-parity requirement to maintain two
release trains simultaneously).

- **Repository strategy**: one pnpm workspace monorepo (`6-development/2-folder-structure.md` §1),
  one Git repository, hosted on GitHub.
- **Collaboration model**: pull-request-gated, every change reviewed before merge (§9/§11).
- **Branching workflow**: GitHub Flow (§3/§5).
- **Code review process**: every PR requires passing CI (§13, `6-development/9-ci-cd.md`) plus at
  least one human/AI-assisted review before merge.
- **Merge strategy**: squash merge into `main` (§10) — one clean commit per feature/fix, full detail
  preserved in the PR itself.

---

# 2. Objectives

The Git workflow:

- Maintains a clean Git history — squash merges (§10), Conventional Commits (§8).
- Enables parallel development — short-lived feature branches (§5/§6), minimal shared-branch
  contention.
- Reduces merge conflicts — frequent rebasing against `main` (§12), small focused PRs (§20).
- Improves code traceability — every commit/PR traces to a task
  (`claude-docs/plan/task-list.md`, if in use) or a clear description of what changed and why.
- Supports CI/CD automation — every push to a PR branch and every merge to `main` triggers the
  pipeline in `6-development/9-ci-cd.md` (this same batch).
- Supports AI-assisted development — this project is built with heavy AI-assisted development
  (`1-project/4-tech-stack.md` §9); §18 states the same rules apply to AI-generated commits as
  human-written ones, no separate fast path.

---

# 3. Workflow Overview

```
Pull latest main
      ↓
Create feature branch
      ↓
Develop
      ↓
Commit (Conventional Commits, §8)
      ↓
Push
      ↓
Open Pull Request (§9)
      ↓
Automated Checks (CI, §13)
      ↓
Code Review (§11)
      ↓
Approval
      ↓
Squash Merge to main (§10)
      ↓
Delete Branch
```

---

# 4. Repository Strategy

- **Model**: Monorepo (`6-development/2-folder-structure.md` §1, ADR-013) — one repository holds
  the NestJS backend, Next.js frontend, shared Prisma schema, and this documentation kit.
- **Repository ownership**: `https://github.com/parimal-c-crest/lbm-erp.git`, owned under the
  `parimal-c-crest` GitHub organization/account.
- **Access control**: standard GitHub repository permissions (Write access for active
  contributors, Admin reserved for repository owner/Technical Lead) — exact team-role mapping is an
  operational decision made when contributors are onboarded, not specified further here
  `[Assumption: this document]`.
- **Default branch**: `main` — always deployable (GitHub Flow, ADR-181), never force-pushed (§13).
- **Protected branches**: `main` only — no `develop`/`release/*` branches exist to separately
  protect under this workflow model (§1).

---

# 5. Branch Types

| Branch | Purpose |
|---------|---------|
| `main` | Production-ready code, always deployable. The only long-lived branch. |
| `feature/*` | New feature development. |
| `bugfix/*` | Bug fixes (non-urgent, found during normal development). |
| `hotfix/*` | Urgent production fixes, branched directly from `main`, merged back the same way as any other branch (no separate hotfix process — GitHub Flow doesn't need one since `main` is always deployable). |
| `docs/*` | Documentation-only updates (including `project-docs/` changes). |
| `refactor/*` | Code refactoring with no functional/behavioral change. |
| `chore/*` | Maintenance tasks (dependency bumps, tooling config). |

No `develop` or `release/*` branch types — GitHub Flow's single-`main` model makes both
unnecessary (§1); a `release/*` branch would only be justified if this project needed to support
multiple concurrent production versions, which it doesn't.

---

# 6. Branch Naming Standards

```
feature/sales-order-creation
feature/pricing-rule-engine
bugfix/login-token-refresh
hotfix/purchase-order-duplicate-finalize
docs/4-ui-navigation-update
refactor/sales-orders-service
chore/dependency-update
```

Rules

- Lowercase.
- kebab-case.
- Prefixed with branch type (§5).
- Concise and descriptive — names the module/concern, not a vague restatement of the type prefix.
- **If using `claude-docs/plan/task-list.md`'s task-tracking**: include the task ID —
  `feature/T-042-sales-order-creation` — so a collaborator can see at a glance (via `git branch -a`
  or open PRs) that a task is already claimed, even before `task-list.md`'s own `Claimed` status
  propagates. Given this project's current single-developer-plus-AI-assistant working mode, this is
  a lightweight convention kept ready for when a second contributor joins, not a strict requirement
  today `[Assumption: this document]`.

---

# 7. Development Workflow

```
Pull latest main
        ↓
Create feature branch (§6)
        ↓
Develop (following `6-development/3-coding-standards.md`)
        ↓
Run tests locally (`6-development/1-development-environment.md` §16)
        ↓
Commit (§8)
        ↓
Push
        ↓
Create Pull Request (§9)
        ↓
Review (§11)
        ↓
Squash Merge (§10)
```

---

# 8. Commit Message Standards

**Conventional Commits**, matching the template's recommended default (no project-specific
deviation identified):

```
feat: add sales order line-item pricing
fix: resolve purchase order duplicate-finalize guard
docs: update 4-ui navigation menu-permission matrix
refactor: simplify pricing rule resolution
test: add sales order fulfillment status transition tests
style: format frontend source files
chore: upgrade Prisma to latest stable
perf: reduce N+1 query on products list
ci: add visual regression check to GitHub Actions
```

Structure

```
type(scope): short description
```

`scope` is the module slug where applicable (e.g. `feat(sales-orders): ...`,
`fix(purchase-orders): ...`), matching `claude-docs/analysis/module-list.md`'s own slugs — keeps
commit history filterable by module.

Supported Types: `feat`, `fix`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `chore`,
`revert`. No `build` type retained separately — this project has no Docker/build-configuration
surface distinct from `ci`/`chore` given the no-Docker decision
(`6-development/1-development-environment.md` §10), so `build`-scoped commits fold into `chore`.

---

# 9. Pull Request Standards

Every Pull Request includes:

- **Summary** — what changed and why (the "why" especially, per
  `6-development/3-coding-standards.md` §7's comment philosophy applied at the PR level too).
- **Related Issue/Task** — link to the GitHub Issue or `claude-docs/plan/task-list.md` entry, where
  one exists.
- **Screenshots** — required for any UI change (`4-ui/` consuming change), before/after where
  practical.
- **Testing performed** — which test categories from
  `6-development/3-coding-standards.md` §16 apply and were run.
- **Breaking changes** — called out explicitly if the change alters an API contract
  (`3-api/8-api-versioning.md`) or database schema in a way other in-flight work needs to know
  about.
- **Documentation updates** — whether `project-docs/` (e.g. a `5-modules/<slug>/` doc) needed a
  corresponding update, and whether it was made.

Checklist (mirrors CI's own gates, `6-development/9-ci-cd.md`, so nothing here is aspirational-only):

- Builds successfully.
- Tests pass (`6-development/3-coding-standards.md` §16).
- Linting passes (`6-development/3-coding-standards.md` §18).
- Documentation updated where applicable.
- Code reviewed (§11).

---

# 10. Merge Strategy

**Squash Merge** for every PR into `main` — one clean, Conventional-Commits-formatted commit per
feature/fix on `main`'s history; the PR itself (not `main`'s commit log) is where granular
in-progress commits live.

- Rebase (not merge-commit) feature branches onto `main` before merging, to keep the PR's diff
  current and avoid unnecessary merge commits inside the branch itself.
- Fast-forward is not applicable as a separate strategy here — squash merge always produces a new
  commit on `main`, by design (it's what makes `main`'s history clean regardless of how messy the
  feature branch's own commit history was).

Avoid

- Unnecessary merge commits — no merging `main` back into a feature branch repeatedly; rebase
  instead (§12).
- Dirty commit history on `main` — squash merge is specifically what prevents this; a feature
  branch's own WIP-commit history is never a concern since it's discarded at merge.

---

# 11. Code Review Workflow

```
Pull Request opened
      ↓
Automated Checks (CI, §13) — must pass before review is meaningful
      ↓
Reviewer Assigned
      ↓
Review Comments (against `6-development/3-coding-standards.md` §17's checklist)
      ↓
Developer Updates
      ↓
Approval (≥1 required, §13)
      ↓
Squash Merge (§10)
```

Given this project's current working mode (developer + Claude Code as an AI development partner,
per `1-project/4-tech-stack.md` §9), review may itself be AI-assisted (e.g. via this project's own
`/code-review` tooling) in addition to or instead of a second human reviewer where no second human
contributor is yet available — the review checklist and CI gates apply identically either way; this
is a staffing-model note, not a lowered bar `[Assumption: this document]`.

---

# 12. Conflict Resolution

When conflicts occur:

- Pull latest `main`.
- Rebase the feature branch onto `main` (not merge `main` into the branch, §10).
- Resolve conflicts carefully — never accept "theirs"/"ours" wholesale without reading both sides.
- Re-run tests locally after resolving (`6-development/1-development-environment.md` §16) — a
  conflict resolution that compiles isn't necessarily a conflict resolution that's still correct.
- Push the updated (rebased) branch — force-push to the *feature* branch is expected after a rebase
  (never to `main`, §13).

Never resolve conflicts without understanding both changes — a mechanical "keep the newer one"
resolution is exactly the kind of convention-only judgment call this project's whole architecture
is trying to move away from at the code level (`6-development/3-coding-standards.md` §1).

---

# 13. Protected Branch Rules

`main` requires:

- Pull Requests — no direct pushes to `main`, ever.
- Passing CI (`6-development/9-ci-cd.md`) — lint, typecheck, unit/integration tests, build.
- Successful linting (`6-development/3-coding-standards.md` §18) as part of CI.
- Successful tests as part of CI.
- Required approvals — at least 1 (§11's staffing-model note applies to who/what provides it).
- No force pushes to `main` — ever, matching this project's own broader "never skip hooks/force-push
  without explicit authorization" operating principle.
- Signed commits: not required in MVP — no SoT source mandates it, and GitHub's own PR-based audit
  trail already provides change traceability for this project's threat model
  (`7-cross-cutting/2-threat-model.md`, not yet generated) `[Assumption: this document]`.

---

# 14. Release Workflow

GitHub Flow has no separate release-branch step — `main` is always deployable, so "release" is
"merge to `main`, then deploy":

```
Feature branch
     ↓
Pull Request + Review + CI (§9-§13)
     ↓
Squash Merge to main
     ↓
Deploy (`6-development/7-deployment-strategy.md`, late wave, deferred)
```

No separate `release/*` branch or release-candidate testing phase distinct from what CI/PR review
already covers — appropriate for this project's continuous-deployment-shaped workflow, revisited
only if a future need for release trains/staged rollouts emerges
`[Assumption: this document]`.

---

# 15. Version Tagging

Semantic Versioning (`vMAJOR.MINOR.PATCH`), tagged on `main` for each meaningful production
deployment milestone:

```
v0.1.0   (first deployable milestone — not necessarily "first module complete")
v1.0.0   (MVP: all 15 modules live)
```

Exact tagging cadence (e.g. per-deploy vs. per-milestone) is an operational decision made once
`6-development/7-deployment-strategy.md` (late wave) defines the actual deployment cadence, not
specified further here `[Assumption: this document]`.

---

# 16. Reverting Changes

- **Reverting commits**: `git revert` on `main` (never `git reset --hard` on shared history) —
  produces a new commit undoing the change, preserving history.
- **Reverting merges**: `git revert -m 1 <merge-commit>` where a merge commit exists; with squash
  merge (§10) as the standard strategy, most reverts are simple single-commit reverts, not merge-
  commit reverts.
- **Rolling back releases**: deployment-level rollback strategy deferred to
  `6-development/7-deployment-strategy.md` (late wave) — Git-level revert (above) is the source-
  control half of this, not the full production rollback procedure.
- **Emergency fixes**: a `hotfix/*` branch (§5) follows the exact same PR/review/CI process (§7-§13)
  as any other change — GitHub Flow's "always deployable `main`" premise means there's no separate,
  lower-rigor emergency path, which is itself a deliberate safeguard against exactly the kind of
  convention-only shortcut this project's architecture is designed to eliminate.

Prefer `git revert` over rewriting shared history (`main`) — rewriting is reserved for a
not-yet-merged feature branch only (§12).

---

# 17. Git Hooks

- **Pre-commit**: lint-staged (ESLint + Prettier, `6-development/3-coding-standards.md` §18) against
  staged files only — fast, local feedback before a commit is even made.
- **Commit-msg**: Conventional Commits format validation (§8) — a commit message not matching the
  `type(scope): description` pattern is rejected locally, before it ever reaches CI.
- **Pre-push**: not mandated beyond what pre-commit already covers — a full test-suite run on every
  push would slow local iteration without CI-equivalent benefit, since CI (§13) already gates the
  PR itself.

Typical validations: formatting/linting (pre-commit), commit message format (commit-msg). Secret
scanning is handled at the CI level (`6-development/9-ci-cd.md`) rather than as a local hook, so it
can't be bypassed by an uninstalled/disabled local hook.

Exact hook-management tooling (e.g. Husky) is an implementation-time choice, not specified further
here `[Assumption: this document]`.

---

# 18. AI Development Workflow

AI-generated code:

- Is committed on feature branches (§5) — never directly to `main`.
- Follows `6-development/3-coding-standards.md` in full, including §19's AI-specific coding
  guidelines.
- Passes linting and tests (§13) — the same CI gates as any other change, no exemption.
- Includes documentation updates where applicable (§9) — an AI assistant generating a module's code
  also updates that module's `5-modules/<slug>/` documentation if the implementation diverges from
  what's documented, rather than letting the two drift.
- Is reviewed before merge (§11) — human or AI-assisted review, per this project's current staffing
  model (§11's note), but never auto-merged without any review step.
- Never commits directly to `main` — the protected-branch rule (§13) applies identically regardless
  of whether a human or an AI assistant authored the change.

---

# 19. Security Guidelines

Never commit:

- Secrets, API keys, passwords, tokens, certificates.
- `.env`/`.env.local` files (only `.env.example` is committed,
  `6-development/1-development-environment.md` §18).
- Sensitive customer data — no production data ever copied into a fixture/seed file committed to
  the repository.

Use:

- `.gitignore` (`6-development/2-folder-structure.md` §17).
- Secret scanning — GitHub's native secret-scanning feature (available on GitHub repositories,
  ADR-181) enabled as a CI/repository-level safeguard, in addition to the pre-commit discipline in
  §17.
- Environment variables exclusively for anything secret/environment-specific
  (`6-development/3-coding-standards.md` §15).

---

# 20. Best Practices

- Commit small, logical changes — one concern per commit where practical, even though squash merge
  (§10) means `main`'s history only shows the final combined commit.
- Commit frequently on the feature branch — small commits are easier to review individually before
  the eventual squash.
- Write meaningful commit messages (§8) — the squashed commit message is what `main`'s history
  actually shows, so it needs to stand alone.
- Keep branches short-lived — GitHub Flow's core premise; a feature branch open for weeks
  accumulates the exact merge-conflict/drift risk this workflow is designed to avoid.
- Rebase regularly against `main` (§12) rather than letting a branch drift far behind.
- Delete merged branches (§3) — no accumulation of stale branches cluttering `git branch -a`.
- Keep PRs focused — one feature/fix per PR, not a bundle of unrelated changes (makes review and
  potential revert both cleaner).
- Update documentation with code changes (§9, §18) — `project-docs/` stays current, not a
  point-in-time snapshot that drifts from the real codebase.

---

# 21. Assumptions

- Exact team-role-to-GitHub-permission mapping is an onboarding-time decision, not specified further
  here `[Assumption: this document]`.
- Task-ID-in-branch-name convention (§6) is kept ready for a future second contributor but not
  strictly enforced under the current single-developer-plus-AI-assistant working mode
  `[Assumption: this document]`.
- Review may be AI-assisted given current staffing, applying the same bar as human review, not a
  lowered one (§11) `[Assumption: this document]`.
- Signed commits are not required in MVP — GitHub's PR-based audit trail is treated as sufficient
  traceability for now (§13) `[Assumption: this document]`.
- Exact release-tagging cadence (§15) and Git-hook-management tooling (§17) are deferred to
  implementation time, not specified further here `[Assumption: this document]`.

---

# 22. Constraints

- Protected branches (`main`) cannot be pushed directly (§13).
- All Pull Requests require review (§11, §13).
- CI must pass before merge (§13, `6-development/9-ci-cd.md`).
- Commit messages must follow Conventional Commits (§8).
- All work occurs on feature branches (§5-§7) — never directly on `main`.

---

# 23. Related Documents

- `6-development/1-development-environment.md`
- `6-development/2-folder-structure.md`
- `6-development/3-coding-standards.md`
- `6-development/9-ci-cd.md`
- `1-project/4-tech-stack.md`
- `decisions-log.md` (ADR-013, ADR-019, ADR-181)

---

# 24. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Technical Lead | | Pending | |
| Solution Architect | | Pending | |
| Development Lead | | Pending | |

---

# AI Generation Notes

- Follows `6-development/2-folder-structure.md` and `6-development/3-coding-standards.md`.
- Recommends GitHub Flow (ADR-181, developer-confirmed) — appropriate for this project's small-team,
  single-release-train, continuous-deployment shape, rather than Git Flow's heavier branching model.
- Uses Conventional Commits as the commit message format (§8), with module-slug scoping added on
  top for this project's specific module vocabulary.
- Defines branch naming (§6), pull request requirements (§9), merge strategy (§10), and release
  tagging (§15).
- Ensures all code changes are traceable, reviewed, tested, and documented before merging (§9-§13).
- Uses GitHub-specific mechanisms (branch protection, secret scanning, Actions —
  `6-development/9-ci-cd.md`) directly rather than a platform-agnostic placeholder, since the
  hosting platform is now confirmed (ADR-181).
