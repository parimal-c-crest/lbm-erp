# Non-Functional Requirements

> **Purpose**
>
> This document defines the measurable quality targets the system must meet — performance, availability, scalability, security, and operability — separate from the functional feature list in `3-feature-breakdown.md`. These are constraints implementation must design against from the start, not properties to check for after the fact.

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

# 1. Executive Summary

Why these targets matter for this project — what happens if they're missed (lost customers, compliance failure, cost overrun).

---

# 2. Performance

| Requirement | Target | Measured How |
|---|---|---|
| API response time (p95) | | |
| Page load time | | |
| Concurrent users supported | | |
| Peak transaction throughput | | |

---

# 3. Availability & Reliability

| Requirement | Target |
|---|---|
| Uptime SLA | |
| Planned maintenance window | |
| Recovery Time Objective (RTO) | |
| Recovery Point Objective (RPO) | |

---

# 4. Scalability

- Expected growth (users/data volume) over the next 12–24 months.
- Horizontal vs. vertical scaling strategy.
- Known bottlenecks anticipated at scale.

---

# 5. Security & Compliance

- Regulatory frameworks that apply (GDPR, HIPAA, SOC 2, PCI DSS, none — state explicitly).
- Data classification requirements (see `2-database/5-data-dictionary.md`'s sensitivity column).
- Encryption at rest / in transit requirements.

---

# 6. Operability

- Logging/monitoring/alerting expectations.
- Deployment frequency target.
- Rollback time target.

---

# 7. Usability & Accessibility

- Reference `4-ui/7-accessibility.md` for the compliance target; don't restate it here, just confirm it's covered.

---

# 8. Constraints

Anything that limits how these targets can be met (budget, existing infrastructure, team size).

---

# 9. Related Documents

- Project Overview
- Feature Breakdown
- Tech Stack
- Database Standards
- API Development Standards
- Deployment Strategy

---

# Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | | | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Technical Architect | | | |
| Solution Architect | | | |
| Product Owner | | | |

---

# AI Generation Notes

When generating this document, the AI should:

- Only set numeric targets that trace to a SoT source or an explicit `[Assumption: ...]` — never invent a specific SLA number without labeling it as an assumption the user should confirm.
- Keep targets measurable, not aspirational ("p95 API response under 500ms" not "the API should be fast").
- Flag any target that meaningfully constrains the tech stack or architecture choices already made elsewhere, so those documents can be reconciled.
