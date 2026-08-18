# Validation Rules — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.1 |
| Status | Draft |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: define every validation rule for this module's inputs. **Scope**: User/Role/Profile/
Group forms, Time Clock/Personal-Day submissions, CSV import. **Validation philosophy**:
client-side (`react-hook-form` + `zod`) is UX convenience only; server-side (`class-validator` +
`class-transformer`) is authoritative — shared schema shape by construction (ADR-174), closing the
legacy system's near-total absence of server-side validation (`3-business-rules.md` Headline
Finding).

---

# 2. Validation Categories

Required Fields · Format · Length · Range · Cross-Field · Business Validation · Import Validation ·
File Validation (barcode label upload, if applicable) · API Validation.

---

# 3. Field Validation

| Field | Rule | Error Message |
|---|---|---|
| Email | Required, valid email format, unique | "Email address is required." / "Enter a valid email address." / "This email is already in use." |
| Username | Required, unique (the real login identifier — distinct from Email, developer decision, `4-schema.md`) | "Username is required." / "This username is already taken." |
| Password (on set) | Required, min 8 characters, ≥1 uppercase, ≥1 lowercase, ≥1 number (ADR-155 — locked, no special-character requirement) | "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number." |
| First Name | Required | "First name is required." |
| Role | Required (every User must have exactly one effective Role, R2) | "Role is required." |
| Email (when Role requires 2FA) | Conditionally required — ADR-075: required if the User's Role has `two_factor_requirement.required = true` | "Email is required for a role that requires two-factor authentication." |
| Time Clock — Clock Out | Must be after Clock In when both present | "Clock out time cannot be earlier than clock in time." |
| Personal Day — Date range | Start ≤ End | "End time cannot be earlier than start time." |
| Clock-In Task Detail — Labor Status | One of `Working`/`Break`/`Lunch` (ADR-077) | "Select a valid labor status." |

Every field's `aria-required`/`aria-invalid`/`aria-describedby` wiring follows the shared form-field
wrapper component (`4-ui/5-form-standards.md` §8) — not restated per field here.

---

# 4. Cross-Field Validation

- **Personal Day start/end time**: end must not precede start (`zod` `.superRefine()`, mirrored
  server-side).
- **Time Clock clock-in/clock-out**: clock-out, when set, must not precede clock-in — closes the
  legacy admin-override screens' confirmed absence of this check (`calculations.md` §5).
- **Role deletion transfer-target**: the selected transfer-target Role must not be the Role being
  deleted (closes a class of self-referential edge case not explicitly separated in the legacy
  system).

---

# 5. Business Validation

- **Referenced Role/Profile/Group exists** before a User save completes.
- **User is active** (Account Status) — checked at authentication, not at every subsequent request
  (session-scoped, per the login flow).
- **User owns the record** — self-service fields (own password, own preferences, own Personal Day
  submissions) enforce ownership as a domain invariant, not the legacy system's inconsistent
  mix of a soft message and a hard redirect (`2-functional-specification.md` FR-002 Preconditions).
- **Last-admin protection**: the organization's last remaining Admin-role User cannot be demoted or
  deleted (closes USR-RISK-020).

---

# 6. File Validation

Barcode label output is generated, not uploaded — no file-upload validation applies to this module's
own confirmed MVP fields (Word Template upload, if carried forward, follows the project-wide file
type/size standards, `4-ui/5-form-standards.md` §8 File Upload — not independently specified per
module here).

---

# 7. Import Validation

CSV Import (closes USR-RULE-064/065/066):

- Row excluded if: submitted barcode belongs to a different existing username, is shorter than 12
  characters, or collides with another row in the same batch.
- Row excluded if: submitted Role name doesn't match any live Role.
- Row excluded if: username is null/empty.
- Row excluded if: `is_admin`-equivalent field is present but not a recognized boolean value.
- **Password validation applies uniformly** — no import-specific carve-out (closes USR-RULE-066's
  confirmed absence of any password check on this path).

---

# 8. API Validation

**Headers**: standard JWT bearer auth (`3-api/2-authentication.md`) — no module-specific header.
**Parameters**: standard pagination/filter parameters per `3-api/1-api-design.md`. **Request body**:
validated via `class-validator` DTOs mirroring the `zod` client schema (ADR-174) — every endpoint in
`8-api.md` §3 lists its DTO. **Authentication**: required on every endpoint except `POST
/auth/login` (`@Public()`, per the project-wide default-authenticated convention).

---

# 9. Validation Order

1. Required
2. Format
3. Length
4. Business Validation (referenced-record-exists, ownership, last-admin protection)
5. Database Validation (unique constraints — email, Role/Profile/Group name)

---

# 10. Error Messages

Centralized message-template set per validation type (`4-ui/5-form-standards.md` §11) — every
message is specific to the field and explains the problem, never a generic "Invalid input." See §3
above for this module's field-specific messages; format/length/required messages otherwise follow
the shared template set, not restated per field.

---

# 11. Related Documents

Functional Specification (`2-functional-specification.md`) · Schema (`4-schema.md`) · Business Rules
(`3-business-rules.md`) · API (`8-api.md`) · UI (`9-ui.md`).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass: replaced "pending SME sign-off" password policy with ADR-155's locked concrete rule; added ADR-075's conditional-required Email rule and Labor Status enum validation (ADR-077); removed Sharing Rule references. |

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

# AI Generation Notes

Every validation rule here either closes a confirmed legacy gap (cited inline to its `USR-RULE-###`/
`USR-RISK-###`) or is a standard project-wide pattern (ADR-174's shared-schema stack) — none
invented without a source.
