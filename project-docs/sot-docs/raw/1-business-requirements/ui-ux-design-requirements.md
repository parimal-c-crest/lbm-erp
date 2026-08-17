# UI/UX Design Requirements

Provided directly by developer, 2026-08-17. Not sourced from the legacy-system blueprint (the legacy
UI is being replaced, not carried forward) — a fresh requirement for the new system.

## Design direction

Modern, industry-standard design — clean, professional, minimal, and easy to understand.

## Responsiveness

Responsive by default — the same application must work properly on desktop, mobile, and tablet.
Desktop-first for ERP workflows, while maintaining full mobile/tablet usability.

- Use responsive layouts, grids, flexbox, and breakpoints rather than separate desktop/mobile
  applications.
- Forms adapt from multi-column layouts on desktop to single-column layouts on mobile.
- Tables are responsive with alternatives on smaller screens — horizontal scrolling, column
  prioritization, or card/list views.
- Navigation adapts by breakpoint: desktop → sidebar/top navigation; tablet → collapsible sidebar;
  mobile → compact navigation/drawer.
- Touch targets sufficiently large for mobile/tablet interaction.
- Avoid unnecessarily dense screens, while still supporting the information density expected in an
  ERP.

## Design system

Consistent design system for colors, typography, spacing, buttons, forms, tables, dialogs,
notifications, and states. Support loading, empty, error, success, validation, and confirmation
states consistently.

## Accessibility & UX patterns

UI prioritizes accessibility, readability, keyboard navigation, and clear visual hierarchy. Use
modern UX patterns: search, filtering, sorting, pagination, contextual actions, breadcrumbs,
confirmation dialogs, appropriate feedback.

## Explicitly avoid

Excessive gradients, unnecessary borders, tiny controls, overcrowded forms, fixed-width layouts.
