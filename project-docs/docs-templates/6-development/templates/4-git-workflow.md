# Git Workflow

> **Purpose**
>
> This document defines the standard Git workflow, branching model, commit conventions, pull request process, merge strategy, and repository collaboration guidelines for the project. It ensures all developers and AI coding assistants contribute code in a consistent, traceable, and maintainable manner.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | |
| Repository | |
| Git Hosting | GitHub / GitLab / Bitbucket |
| Workflow Model | GitHub Flow / Git Flow / Trunk-Based |
| Version | |
| Status | Draft / Review / Approved |
| Author | |
| Created Date | |
| Last Updated | |

---

# 1. Executive Summary

Provide an overview of the project's Git workflow.

Include:

- Repository strategy
- Collaboration model
- Branching workflow
- Code review process
- Merge strategy

---

# 2. Objectives

The Git workflow should:

- Maintain a clean Git history.
- Enable parallel development.
- Reduce merge conflicts.
- Improve code traceability.
- Support CI/CD automation.
- Support AI-assisted development.

---

# 3. Workflow Overview

Describe the complete development lifecycle.

Example

```
Create Branch
      ↓
Develop
      ↓
Commit
      ↓
Push
      ↓
Pull Request
      ↓
Code Review
      ↓
Automated Tests
      ↓
Approval
      ↓
Merge
      ↓
Delete Branch
```

---

# 4. Repository Strategy

Specify repository model.

Examples

- Monorepo
- Multi Repository

Document:

- Repository ownership
- Access control
- Default branch
- Protected branches

---

# 5. Branch Types

Document all supported branches.

| Branch | Purpose |
|---------|---------|
| main | Production-ready code |
| develop | Integration branch (if applicable) |
| feature/* | New feature development |
| bugfix/* | Bug fixes |
| hotfix/* | Production fixes |
| release/* | Release preparation |
| docs/* | Documentation updates |
| refactor/* | Code refactoring |
| chore/* | Maintenance tasks |

---

# 6. Branch Naming Standards

Examples

```
feature/user-management

feature/product-search

bugfix/login-timeout

hotfix/payment-error

release/v1.2.0

docs/api-versioning

refactor/order-service

chore/dependency-update
```

Rules

- Use lowercase.
- Use kebab-case.
- Prefix with branch type.
- Keep names concise and descriptive.
- **If using the `project-docs/` task-tracking workflow (`claude-docs/plan/task-list.md`), include the task ID in the branch name** — e.g. `feature/T-042-user-profile-api` — so a second developer can see at a glance (via `git branch -a` or open PRs) that a task is already being worked on, even if `task-list.md`'s `Claimed` status hasn't been pushed/pulled yet. This is a lightweight collision guard for multi-developer use, not a requirement for solo projects.

---

# 7. Development Workflow

Recommended workflow

```
Pull latest changes
        ↓
Create feature branch
        ↓
Develop
        ↓
Run tests
        ↓
Commit
        ↓
Push
        ↓
Create Pull Request
        ↓
Review
        ↓
Merge
```

---

# 8. Commit Message Standards

Use a consistent commit message format.

Recommended (Conventional Commits)

```
feat: add user profile API

fix: resolve login validation issue

docs: update API documentation

refactor: simplify order service

test: add authentication tests

style: format source files

chore: upgrade dependencies

perf: optimize product search

ci: update GitHub Actions workflow

build: update Docker configuration
```

Structure

```
type(scope): short description
```

Supported Types

- feat
- fix
- docs
- refactor
- test
- style
- perf
- build
- ci
- chore
- revert

---

# 9. Pull Request Standards

Every Pull Request should include:

- Summary
- Related Issue
- Screenshots (UI changes)
- Testing performed
- Breaking changes
- Documentation updates

Checklist

- Builds successfully
- Tests pass
- Linting passes
- Documentation updated
- Code reviewed

---

# 10. Merge Strategy

Specify merge strategy.

Recommended

- Squash Merge for feature branches
- Rebase before merge
- Fast-forward where appropriate

Avoid

- Unnecessary merge commits
- Dirty commit history

---

# 11. Code Review Workflow

Example

```
Pull Request
      ↓
Automated Checks
      ↓
Reviewer Assigned
      ↓
Review Comments
      ↓
Developer Updates
      ↓
Approval
      ↓
Merge
```

---

# 12. Conflict Resolution

When conflicts occur:

- Pull latest changes.
- Rebase feature branch.
- Resolve conflicts carefully.
- Run tests.
- Push updated branch.

Never resolve conflicts without understanding both changes.

---

# 13. Protected Branch Rules

Protected branches should require:

- Pull Requests
- Passing CI
- Successful linting
- Successful tests
- Required approvals
- No force pushes
- Signed commits (if applicable)

---

# 14. Release Workflow

Example

```
Develop
     ↓
Release Branch
     ↓
Testing
     ↓
Tag Release
     ↓
Merge to Main
     ↓
Deploy
```

---

# 15. Version Tagging

Use Semantic Versioning.

Examples

```
v1.0.0

v1.2.0

v2.0.1
```

Tag every production release.

---

# 16. Reverting Changes

Document procedures for:

- Reverting commits
- Reverting merges
- Rolling back releases
- Emergency fixes

Prefer `git revert` over rewriting shared history.

---

# 17. Git Hooks

Document project hooks.

Examples

- Pre-commit
- Commit-msg
- Pre-push

Typical validations

- Formatting
- Linting
- Unit tests
- Secret scanning

---

# 18. AI Development Workflow

AI-generated code should:

- Be committed on feature branches.
- Follow coding standards.
- Pass linting and tests.
- Include documentation updates.
- Be reviewed before merge.
- Never commit generated code directly to protected branches.

---

# 19. Security Guidelines

Never commit:

- Secrets
- API keys
- Passwords
- Tokens
- Certificates
- Environment files
- Sensitive customer data

Use

- `.gitignore`
- Secret scanning
- Environment variables

---

# 20. Best Practices

- Commit small, logical changes.
- Commit frequently.
- Write meaningful commit messages.
- Keep branches short-lived.
- Rebase regularly.
- Delete merged branches.
- Keep PRs focused.
- Update documentation with code changes.

---

# 21. Assumptions

-

-

-

---

# 22. Constraints

Examples

- Protected branches cannot be pushed directly.
- All Pull Requests require review.
- CI must pass before merge.
- Commit messages must follow Conventional Commits.
- All work must occur on feature branches.

---

# 23. Related Documents

- Development Environment
- Folder Structure
- Coding Standards
- Branching Strategy
- Code Review Guidelines
- CI/CD Pipeline
- Release Management
- Documentation Standards
- Testing Strategy
- AI Development Guidelines

---

# 24. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | | | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Technical Lead | | | |
| Solution Architect | | | |
| Development Lead | | | |

---

# AI Generation Notes

When generating this document, the AI should:

- Follow the approved Branching Strategy and CI/CD Pipeline documents.
- Recommend a simple, consistent Git workflow suitable for the project's team size.
- Use Conventional Commits as the default commit message format.
- Define branch naming, pull request requirements, merge strategy, and release tagging.
- Ensure all code changes are traceable, reviewed, tested, and documented before merging.
- Keep workflow recommendations adaptable to GitHub, GitLab, or Bitbucket while remaining platform-agnostic.