# 4-ui

> **Purpose**
>
> Defines the global UI/UX architecture and standards every screen in the project must follow — navigation, user flows, visual design system, components, forms, responsiveness, and accessibility. Module-specific screens are documented separately in `5-modules/<module>/9-ui.md`.

Templates live in `templates/`. Requires `1-project/` and `3-api/` to be filled in first (UI consumes the API).

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `templates/1-navigation.md` | Navigation architecture, menu structure, routing conventions. |
| 2 | `templates/2-user-flows.md` | Standard user journeys, task flows, and interaction sequences. |
| 3 | `templates/3-design-system.md` | Visual language, design tokens, and reusable UI foundations — single source of truth for design. |
| 4 | `templates/4-component-standards.md` | Standards, behavior, and implementation guidelines for reusable UI components. |
| 5 | `templates/5-form-standards.md` | Form conventions, validation rules, layout, and UX principles. |
| 6 | `templates/6-responsive-design.md` | Breakpoints, layout behavior, and device-specific considerations. |
| 7 | `templates/7-accessibility.md` | Accessibility and inclusive design requirements. |
| 8 | `templates/8-frontend-development-standards.md` | Coding standards and architecture for the frontend application. |

## Note

This folder sets the design system and rules; individual screens for a given feature belong in `5-modules/<module-name>/9-ui.md`.
