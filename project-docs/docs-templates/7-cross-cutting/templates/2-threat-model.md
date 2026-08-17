# Threat Model

> **Purpose**
>
> This document identifies the system's attack surface, the threats against it, and the mitigations in place — a security-specific companion to `3-api/2-authentication.md` / `3-authorization.md` (which define the mechanisms) and `3-coding-standards.md` (which define secure-coding rules). This document is where they're evaluated together against realistic attack scenarios.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | |
| Version | |
| Status | Draft / Review / Approved |
| Author | |
| Last Updated | |

---

# 1. Scope

What's in scope for this threat model (the application, its APIs, its data stores) and what's explicitly out of scope (e.g. physical security, third-party SaaS internals).

---

# 2. Assets

What's worth protecting — user credentials, PII, payment data, business-critical records. Cross-reference `2-database/5-data-dictionary.md`'s sensitivity classification.

---

# 3. Attack Surface

| Entry Point | Description | Exposure |
|---|---|---|
| Public API | | |
| Admin interface | | |
| File uploads | | |
| Third-party integrations | | |

---

# 4. Threats & Mitigations

One row per credible threat (STRIDE categories — Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege — are a reasonable starting checklist, not mandatory).

| Threat | Category | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|

---

# 5. Secrets Management

- Where secrets/credentials/API keys live (not in the repo — name the actual mechanism: env vars, a secrets manager, etc).
- Rotation policy.

---

# 6. Dependency & Supply Chain

- Policy for vetting third-party packages.
- Vulnerability scanning approach (if any).

---

# 7. Incident Response Hook

- Reference `10-release/2-incident-response.md` — this document doesn't duplicate the incident process, just the threats that process needs to be ready for.

---

# 8. Related Documents

- Authentication
- Authorization
- Coding Standards
- Non-Functional Requirements (Security & Compliance section)
- Incident Response

---

# Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | | | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Security Engineer | | | |
| Solution Architect | | | |

---

# AI Generation Notes

When generating this document, the AI should:

- Ground every threat in this specific system's actual attack surface, not a generic security checklist copy-pasted regardless of relevance.
- Cross-check every threat against what `3-api/2-authentication.md` and `3-authorization.md` already claim to mitigate — flag any gap between what's threatened and what's actually documented as protected.
- Mark unresolved/accepted-risk threats explicitly as such, don't silently omit ones without a clean mitigation.
