# 4-ui

> **Purpose**
>
> Defines the global UI/UX architecture and standards every screen in the project must follow — navigation, user flows, visual design system, components, forms, responsiveness, and accessibility. Module-specific screens are documented separately in `5-modules/<module>/9-ui.md`.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `1-navigation.md` | Navigation architecture, menu structure, routing conventions. |
| 2 | `2-user-flows.md` | Standard user journeys, task flows, and interaction sequences. |
| 3 | `3-design-system.md` | Visual language, design tokens, and reusable UI foundations — single source of truth for design. |
| 4 | `4-component-standards.md` | Standards, behavior, and implementation guidelines for reusable UI components. |
| 5 | `5-form-standards.md` | Form conventions, validation rules, layout, and UX principles. |
| 6 | `6-responsive-design.md` | Breakpoints, layout behavior, and device-specific considerations. |
| 7 | `7-accessibility.md` | Accessibility and inclusive design requirements. |
| 8 | `8-frontend-development-standards.md` | Coding standards and architecture for the frontend application. |

All 8 approved 2026-08-17 (v1.0, first generation). Design tokens sourced live from the reviewed
Stitch AI mockup (`sot-docs/design/screenshots/stitch_lbm_design/`) per ADR-177 — style/token
reference only, not its layout implementation (rebuilt responsive per ADR-024). Two new cross-cutting
decisions locked during this batch: icon library (ADR-178, lucide-react) and Info status color
(ADR-179, reuses Primary). B2B Customer confirmed to have no UI in this application — separate
external system (ADR-180). See `project-docs/claude-docs/gap-analysis/review-log.md` for verdicts and
`project-docs/claude-docs/gap-analysis/decisions-log.md` for every cited decision.

Four tooling choices (E2E test framework, visual-regression tooling, error-monitoring service,
CI/CD pipeline) are intentionally left as forward references to `6-development/`'s own generation,
not decided here.

## Note

This folder sets the design system and rules; individual screens for a given feature belong in
`5-modules/<module-name>/9-ui.md`, generated just-in-time per module.
