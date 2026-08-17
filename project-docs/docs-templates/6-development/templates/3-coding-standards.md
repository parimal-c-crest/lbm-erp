# Coding Standards

> **Purpose**
>
> This document defines the coding standards, programming conventions, best practices, and quality requirements that all developers and AI coding assistants must follow throughout the project. It ensures the codebase remains consistent, readable, maintainable, secure, scalable, and easy to review.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | |
| Primary Languages | |
| Frameworks | |
| Coding Standard | |
| Version | |
| Status | Draft / Review / Approved |
| Author | |
| Created Date | |
| Last Updated | |

---

# 1. Executive Summary

Provide an overview of the project's coding standards.

Include:

- Coding philosophy
- Maintainability goals
- Readability
- Consistency
- Security
- Performance

---

# 2. Objectives

Coding standards should:

- Improve code readability.
- Reduce technical debt.
- Encourage consistency.
- Simplify code reviews.
- Support AI-generated code.
- Improve maintainability.
- Reduce bugs.

---

# 3. General Coding Principles

Every implementation should follow:

- SOLID Principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- YAGNI (You Aren't Gonna Need It)
- Separation of Concerns
- Composition over Inheritance
- Fail Fast
- Principle of Least Surprise

---

# 4. Code Organization

Define standards for organizing code.

Guidelines

- Small focused files
- One responsibility per file
- Logical folder structure
- Avoid deep nesting
- Feature-based organization where appropriate

---

# 5. Naming Conventions

## Variables

- Use meaningful names.
- Avoid abbreviations.
- Avoid single-character names except loop counters.

Examples

```
customerName

orderTotal

productList
```

---

## Constants

Examples

```
MAX_LOGIN_ATTEMPTS

DEFAULT_PAGE_SIZE
```

---

## Functions

Examples

```
calculateTotal()

sendVerificationEmail()

generateInvoice()
```

Rules

- Use verbs.
- One responsibility.
- Descriptive names.

---

## Classes

Examples

```
UserService

ProductRepository

OrderValidator
```

---

## Interfaces

Examples

```
PaymentGateway

NotificationService
```

---

## Files

Examples

```
user-service.*

order-validator.*

product-repository.*
```

---

# 6. Formatting Standards

Specify

- Indentation
- Line length
- Blank lines
- Braces
- Quotes
- Trailing commas
- Import ordering

Use automated formatting tools whenever possible.

---

# 7. Comments & Documentation

Comments should explain:

- Why
- Business logic
- Complex algorithms
- Non-obvious decisions

Avoid commenting obvious code.

Use documentation comments for:

- Public classes
- Public methods
- APIs
- Shared utilities

---

# 8. Function Standards

Functions should:

- Have one responsibility.
- Be short and readable.
- Avoid deep nesting.
- Avoid side effects.
- Return early when appropriate.

Guidelines

- Minimize parameters.
- Prefer immutable inputs.
- Avoid hidden dependencies.

---

# 9. Class Standards

Classes should:

- Follow Single Responsibility Principle.
- Be cohesive.
- Use dependency injection.
- Avoid large "God Classes".
- Keep public APIs small.

---

# 10. Error Handling

Requirements

- Handle expected exceptions.
- Fail gracefully.
- Never ignore exceptions.
- Log unexpected errors.
- Return meaningful error messages.

Follow Error Handling Standards document.

---

# 11. Logging Standards

Log

- Errors
- Warnings
- Important business events
- Security events

Do not log

- Passwords
- Tokens
- Secrets
- Personal data unless approved

---

# 12. Security Guidelines

Code should:

- Validate all inputs.
- Prevent SQL Injection.
- Prevent XSS.
- Prevent CSRF.
- Escape output where required.
- Use parameterized queries.
- Protect sensitive information.
- **If the project hand-rolls HTTP routing without a framework**: match routes by exact segment count / most-specific-first, never by a loose prefix check. A general route pattern (e.g. `DELETE /resource/:id`) must never silently match a more specific nested path (e.g. `DELETE /resource/:id/sub/:subId`) — this class of bug causes both data-integrity failures (the wrong handler runs) and potential auth bypasses (a specific route's authorization check gets skipped entirely because the general route matched first).

---

# 13. Performance Guidelines

Recommendations

- Avoid duplicate queries.
- Optimize loops.
- Use lazy loading when appropriate.
- Cache expensive operations.
- Avoid unnecessary object creation.

---

# 14. Dependency Management

Guidelines

- Prefer standard libraries.
- Minimize third-party packages.
- Keep dependencies updated.
- Remove unused packages.
- Evaluate licenses before adoption.

---

# 15. Configuration Standards

Configuration should:

- Use environment variables.
- Never hardcode secrets.
- Separate environment-specific settings.
- Validate configuration during startup.

---

# 16. Testing Standards

Every implementation should include:

- Unit tests
- Integration tests
- Error handling tests
- Boundary tests
- Edge case tests

Code should be designed for testability.

---

# 17. Code Review Checklist

Verify

- Naming conventions
- Readability
- Simplicity
- Reusability
- Security
- Error handling
- Performance
- Documentation
- Test coverage
- Compliance with architecture

---

# 18. Static Analysis

Use approved tools for:

- Linting
- Formatting
- Type checking
- Static code analysis
- Dependency analysis

Document required tooling and execution commands.

---

# 19. AI Coding Guidelines

AI-generated code must:

- Follow project architecture.
- Follow naming conventions.
- Reuse existing utilities.
- Avoid duplicate implementations.
- Include appropriate documentation.
- Follow security standards.
- Be reviewed before merging.

---

# 20. Code Smells to Avoid

Examples

- God Classes
- Long Methods
- Duplicate Code
- Magic Numbers
- Hardcoded Strings
- Deep Nesting
- Excessive Comments
- Circular Dependencies
- Tight Coupling
- Dead Code

---

# 21. Refactoring Guidelines

Refactor when:

- Duplicate logic exists.
- Complexity increases.
- Readability decreases.
- Performance problems appear.
- Architecture rules are violated.

---

# 22. Best Practices

- Write readable code first.
- Optimize only after measuring.
- Prefer composition.
- Keep methods focused.
- Keep classes cohesive.
- Remove dead code.
- Follow established project patterns.
- Automate formatting and linting.

---

# 23. Assumptions

-

-

-

---

# 24. Constraints

Examples

- Approved formatter required.
- Linting must pass before merge.
- Static analysis must pass.
- No hardcoded secrets.
- Coding standards compliance mandatory.

---

# 25. Related Documents

- Development Environment
- Folder Structure
- Frontend Development Standards
- API Development Standards
- Backend Development Standards
- Logging Standards
- Error Handling
- Security Standards
- Testing Strategy
- Git Workflow

---

# 26. Revision History

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

- Follow the approved Architecture, Tech Stack, and Development Standards.
- Recommend language-appropriate coding conventions while keeping principles framework-agnostic.
- Enforce consistent naming, formatting, documentation, and code organization.
- Promote secure, maintainable, testable, and reusable code.
- Require automated formatting, linting, and static analysis wherever possible.
- Ensure AI-generated code follows existing project patterns instead of introducing new ones.
- Keep framework-specific style rules (e.g., Python PEP 8, ESLint, Prettier, Ruff, Black, PHP-CS-Fixer) configurable according to the project's selected technology stack.
- If the project's backend hand-rolls its own HTTP routing (no framework/router library), include the route-specificity guidance from §12 explicitly — this is a real, recurring bug class (a general route silently shadowing a more specific nested one) that's easy to introduce and invisible to static review; it only surfaces under actual execution.