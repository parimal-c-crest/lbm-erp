# Authentication

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Authentication Type | JWT + API Key |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

JWT (access + refresh token pair) authenticates interactive users; hashed/scoped/rate-limited API keys
authenticate third-party and system-to-system callers — through the identical endpoints and Guards, no
separate internal-only surface. [Source: `1-project/4-tech-stack.md` §6] Authorization (RBAC + Super
Admin) is documented separately in `3-authorization.md`. Role-gated, admin-configurable 2FA closes a
confirmed legacy gap. [Source: `decisions-log.md` ADR-075]

---

# 2. Authentication Overview

- **Login**: email + password, validated server-side; on success, an access token (short-lived) and a
  refresh token (longer-lived) are issued.
- **Identity verification**: bcrypt-hashed password comparison; 2FA challenge if the user's role
  requires it (ADR-075).
- **Token/session management**: stateless JWT — no server-side session store; a refresh token exchanges
  for a new access token without re-entering credentials.
- **Logout**: refresh token invalidated server-side (denylist/rotation, not merely "client discards
  it").
- **Lifecycle**: login → access protected resources → access token expires → refresh → eventually
  logout or refresh-token expiry forces re-login.

---

# 3. Authentication Architecture

- **Client**: Next.js frontend (server-rendered, same-origin) or a third-party system using an API key.
- **Subdomain resolution**: every request first resolves to a tenant via its subdomain
  (`<tenant>.omnna-lbm.live`) before authentication logic runs — the tenant's own database connection
  is what a JWT/API key is then validated against. [Source: `decisions-log.md` ADR-056]
- **Authentication Service**: NestJS Guards + Passport-style JWT strategy.
- **Database**: `users` table (per-tenant) for interactive accounts; a hashed-API-key table for
  third-party/system credentials.
- **No external Identity Provider** — no SoT source or decision calls for SSO/OAuth2/OpenID Connect;
  authentication is self-contained (username/password + JWT), not delegated to an external IdP.

---

# 4. Supported Authentication Methods

| Method | Description | Supported |
|---------|-------------|-----------|
| Email & Password | Primary interactive login | Yes |
| JWT | Access + refresh token pair, issued on successful login | Yes |
| Refresh Token | Exchanges for a new access token | Yes |
| API Key | Hashed at rest, scoped, rate-limited — third-party/system callers | Yes |
| 2FA (email OTP) | Role-gated, admin-configurable (ADR-075) | Yes, conditional |
| OAuth2 / OpenID Connect / SSO | No confirmed requirement | No |
| Mobile OTP (SMS) | No confirmed requirement — 2FA delivery is email-based, matching legacy's own mechanism, not SMS | No |

---

# 5. User Authentication Flow

1. User submits email + password.
2. Server validates credentials (bcrypt comparison).
3. If the user's role requires 2FA (ADR-075's admin-configurable setting), a one-time code is emailed
   and must be verified before proceeding.
4. Access token generated (JWT, short-lived).
5. Refresh token issued (longer-lived).
6. Client stores both tokens securely (httpOnly cookie or equivalent — not `localStorage`, to limit XSS
   token theft).
7. User accesses protected resources with `Authorization: Bearer <access_token>`.
8. Access token expires.
9. Client calls `/auth/refresh-token` with the refresh token to obtain a new access token.
10. User logs out — refresh token invalidated server-side.

---

# 6. Authorization Strategy

Full detail in `3-authorization.md`. Summary: Role-Based Access Control (RBAC), per the tenant-
configurable starter role catalog (ADR-002), enforced server-side via NestJS Guards on every write
endpoint, no exceptions. [Source: `decisions-log.md` ADR-006]

---

# 7. Roles & Permissions

| Role | Description |
|------|-------------|
| Counter/Sales Staff | Order entry, quoting, customer-facing transactions |
| Warehouse/Fulfillment Staff | Picking, receiving, stock transfers, delivery prep |
| Accounting/Management | Credit, statements, deposits/ROA, financial reporting |
| Purchasing Staff | Vendor management, PO creation/reconciliation, EDI |
| Admin | Users/role management, Settings, pricing configuration |
| B2B Customer | External storefront access |
| Super Admin | Platform-support access, one per tenant, never assigned to a tenant's own business users (separate axis, not a variant of Admin) |

Starter catalog, tenant-configurable (roles beyond this list can be added per tenant).
[Source: `decisions-log.md` ADR-002, ADR-057] Full permission matrix: `5-modules/users/7-permissions.md`
(generated JIT).

---

# 8. JWT / Token Standards

| Item | Value |
|------|-------|
| Access Token | Short-lived (exact TTL: implementation-time decision, no SoT-specified number) |
| Refresh Token | Longer-lived, rotated on use (a used refresh token is invalidated, a new one issued) |
| Signing Algorithm | Asymmetric (RS256) or HMAC (HS256) — implementation-time choice, no project-specific requirement stated |
| Claims | `sub` (user id), `tenant` (subdomain, for auditability — not used for isolation, since isolation is physical per ADR-056), `role`, `iat`, `exp` |
| Secret Management | Environment-scoped signing key/keypair, never committed to source control |
| Token Rotation | Refresh tokens rotate on every use (old one invalidated) — closes replay risk from a leaked refresh token |

```
Header.Payload.Signature
```

---

# 9. Session Management

- **Session model**: stateless — no server-side session store for interactive users. "Session"
  effectively means "holds a valid, unexpired access token."
- **Idle timeout**: governed by access-token TTL; refresh token TTL sets the outer bound before forced
  re-login.
- **Concurrent sessions**: multiple devices/tabs may hold independent token pairs simultaneously — not
  restricted to one active session per user (no SoT source requires single-session enforcement).
- **Session invalidation**: logout invalidates that specific refresh token; a password change or
  Super-Admin-triggered account deactivation invalidates all of that user's outstanding refresh tokens.
- **Logout behavior**: refresh token denylisted/rotated server-side, not merely discarded client-side.

---

# 10. Password Policy

[Source: `decisions-log.md` ADR-155]

- **Minimum length**: 8 characters.
- **Complexity**: at least one uppercase, one lowercase, one number. No special-character requirement.
- **Enforcement**: server-side on every password-set path (interactive change, CSV import, admin
  reset) — never client-side-only, closing the legacy system's entirely-client-side, toggle-gated
  complexity check.
- **Hashing**: bcrypt. [Source: `decisions-log.md` ADR-014]
- **Account lockout**: 5 failed login attempts locks the account for 15 minutes, then auto-unlocks. Real
  server-side, persistent tracking — not a session-scoped counter that resets on session loss (closing
  the legacy gap where a scripted attack that doesn't preserve session state never accumulated a
  count). [Source: `decisions-log.md` ADR-155]
- **Password history/expiration**: not specified in the SoT — no rule enforced beyond complexity and
  lockout above.

---

# 11. Multi-Factor Authentication (MFA)

[Source: `decisions-log.md` ADR-075]

- **Method**: email-based one-time code (matches legacy's own mechanism — no SMS/authenticator-app
  requirement confirmed).
- **Coverage**: role-based, but **admin-configurable** — which roles require 2FA is a setting, not a
  hardcoded allowlist. Applies to Super Admin accounts too, through the same configurable setting (no
  hardcoded-always-on exception despite the privilege level).
- **Rate-limited regeneration**: code requests capped (e.g. one new code per 60 seconds) plus a
  max-attempts window, to prevent abuse — closes the legacy gap where regeneration had no limit at all.
- **Required-email enforcement**: for any role that requires 2FA, a valid email becomes a required
  field at save time (same "required at save" pattern as ADR-032) — closes the legacy silent
  no-fallback dead end where 2FA was unusable with no admin alert.
- **Recovery codes**: not specified in the SoT — not part of this MVP's confirmed scope.

---

# 12. Account Security

- Account lockout: 5 failed attempts / 15-minute lock (§10).
- CAPTCHA: not specified in the SoT — not included in this MVP's confirmed scope.
- Device verification / IP restrictions: not specified in the SoT.
- Suspicious activity detection: covered by the general audit trail (every login logged, ADR-068) — no
  separate automated anomaly-detection system confirmed in scope.

---

# 13. Authentication APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login` | POST | Authenticate, issue access + refresh token pair |
| `/api/v1/auth/logout` | POST | Invalidate the current refresh token |
| `/api/v1/auth/refresh-token` | POST | Exchange a valid refresh token for a new access token |
| `/api/v1/auth/forgot-password` | POST | Request a password-reset email |
| `/api/v1/auth/reset-password` | POST | Complete a password reset with a valid reset token |
| `/api/v1/auth/change-password` | POST | Change password while authenticated |
| `/api/v1/auth/verify-2fa` | POST | Verify a submitted one-time code (role-gated, ADR-075) |
| `/api/v1/auth/resend-2fa` | POST | Request a new one-time code (rate-limited, ADR-075) |

---

# 14. Error Handling

| Error | HTTP Status | Description |
|--------|------------|-------------|
| Invalid Credentials | 401 | Email/password mismatch |
| Token Expired | 401 | Access or refresh token past its TTL |
| Invalid Token | 401 | Malformed or tampered token |
| Unauthorized | 403 | Valid identity, insufficient role/permission (see `3-authorization.md`) |
| Account Locked | 423 | 5-failed-attempt lockout in effect (ADR-155) |
| 2FA Required | 401 (with a distinct `error_code`) | Valid credentials, but a one-time code is still needed |
| Validation Failed | 422 | Missing/malformed request fields |

---

# 15. Security Standards

- HTTPS only, no exceptions.
- Passwords: bcrypt, never plaintext or reversibly encrypted. [Source: `decisions-log.md` ADR-014]
- JWT signed, never unsigned/`alg: none`.
- Refresh token rotation on every use (§8).
- Every input validated server-side (§10 of `1-api-design.md`).
- Brute-force protection: account lockout (§10) plus 2FA-regeneration rate limiting (§11).
- Secure cookie configuration if tokens are cookie-stored: `httpOnly`, `Secure`, `SameSite`.
- CORS policy: locked to the project's own frontend origin(s) only — see `1-api-design.md` §16.
  [Source: `decisions-log.md` ADR-176]
- Least privilege: authentication only establishes identity — it never itself grants access; every
  subsequent check is authorization's responsibility (`3-authorization.md`).

---

# 16. Logging & Auditing

Every one of the following is captured in the project-wide audit trail (ADR-068), not a separate
authentication-only log:

- Login (success and failure)
- Logout
- Failed login (feeds the lockout counter, §10)
- Password change / reset
- Account lock / auto-unlock
- Token refresh
- 2FA verification (success and failure)
- Session/token expiration

---

# 17. Assumptions

- Exact access-token/refresh-token TTL values are an implementation-time decision (§8) — no SoT source
  states specific durations; standard practice (short access token, longer refresh token) applies
  without needing developer sign-off on the exact numbers now.
- JWT signing algorithm (RS256 vs HS256) is an implementation-time choice with no project-specific
  driver either way.

---

# 18. Constraints

- HTTPS mandatory.
- Authentication required for every protected endpoint.
- Password policy and lockout policy are server-enforced, not configurable-off. [Source: `decisions-log.md`
  ADR-155]
- 2FA coverage is admin-configurable per role, not a fixed project-wide on/off switch.
  [Source: `decisions-log.md` ADR-075]

---

# 19. Related Documents

`1-api-design.md`, `3-authorization.md`, `1-project/4-tech-stack.md`,
`claude-docs/gap-analysis/decisions-log.md` (ADR-014, ADR-057, ADR-075, ADR-155)

---

# 20. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Security Architect | *(pending)* | | |
| Solution Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Authentication defined independently of business-module permissions (those live in
`5-modules/users/7-permissions.md`, JIT). Password/lockout/2FA policy and CORS policy all trace to
locked ADRs, not invented. No open `[NEEDS INPUT]` markers remain.
