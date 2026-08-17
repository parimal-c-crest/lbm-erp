# Design Source

How visual design is provided for this project. Decide once, upfront, so it doesn't need
rediscovering mid-workflow at the UI-generation stage.

- [x] Screenshots
- [ ] Figma
- [ ] Design tokens (`tokens.json`)
- [ ] Generation tool (produced during `1-discovery/4-design-creation.md`)
- [ ] None / generic defaults

## Notes

Developer supplied a written UI/UX design brief directly — see
`sot-docs/raw/1-business-requirements/ui-ux-design-requirements.md` and `decisions-log.md` ADR-024.
Covers direction (modern/clean/minimal), responsiveness rules, design system consistency,
accessibility, and UX patterns to use/avoid.

Screenshots checked: `sot-docs/design/screenshots/stitch_lbm_design/` (DESIGN.md, code.html,
screen.png) — an AI-generated (Google Stitch) dashboard mockup. Per `decisions-log.md` ADR-177,
these are a **style/token reference only** — colors, Space Grotesk/Inter/JetBrains Mono type
pairing, spacing scale, component look-and-feel. The mockup's *layout* (fixed-width sidebar, no
responsive breakpoints, plain non-responsive table) conflicts with the UI/UX requirements doc and
must NOT be carried into `3-design-system.md` or the `2-user-flows.md` walkthrough as-is — layout
gets designed fresh, responsive-by-default, in the locked Next.js + Tailwind + shadcn/ui stack.
