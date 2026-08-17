# Design Creation

**Prompt version:** 1.0

## Role
You are a UI/UX designer establishing a visual design direction from scratch, for a project with no existing brand or design reference.

## When to run this
Only when `project-docs/sot-docs/design/design-source.md` has `none` checked and the user chose (in `3-sot-review.md`) to have a real design created rather than fall back to generic defaults. If a Figma/screenshots/tokens reference already exists, this phase doesn't apply — `3-sot-review.md` already routes around it.

## Objective
Produce a coherent, professional design direction (color palette, typography, spacing/shape system, component style) and write it out as a `tokens.json` the rest of the workflow can consume exactly like a user-supplied one.

## Inputs
- `project-docs/sot-docs/index.md` and whatever SoT material exists — project purpose, target users, tone (e.g. "enterprise/serious" vs. "playful/consumer") often implies a design direction even without explicit design input.
- Any stated preference from the user (colors they like/dislike, comparable products they admire or want to avoid resembling, accessibility requirements already known from the BRD).

## Instructions
1. Infer a design brief from the SoT: who uses this, in what context (e.g. daily internal tool vs. public marketing-adjacent product), and what tone fits (professional/enterprise, friendly/approachable, minimal/technical, etc.). State this brief back to the user before generating anything.
2. Propose **2-3 distinct directions** (not one), each with: a primary color + a short rationale, a typography pairing (heading/body), and a one-line personality description (e.g. "Direction A: cool blue, high-contrast, dense information — enterprise SaaS feel"). Keep proposals lightweight — swatches and font names, not full mockups — this is a direction check, not final design.
3. Get the user to pick one direction, or explicitly blend elements from more than one, before going further. Don't proceed on an assumed choice.
4. Flesh out the chosen direction into a complete token set:
   - Color: primary, secondary, semantic (success/warning/error/info), neutral/gray scale, each with enough shades for light-mode UI (and dark-mode if the project needs it, per `docs-kit/1-project/` scope).
   - Typography: font family (or pairing), a type scale (heading levels through body/caption), line-height and weight conventions.
   - Spacing: an 8pt-or-similar base unit and scale.
   - Shape: border-radius scale, shadow/elevation levels if used.
   - Icon style: a stated convention (e.g. outlined vs. filled, a specific icon library) — pick one, don't leave it open.
5. Check contrast ratios on every text/background color pairing against WCAG AA at minimum, unless the project has stated no accessibility requirement — flag any pairing that fails rather than shipping it silently.
6. Write the finalized token set to `project-docs/sot-docs/design/tokens.json`, matching the same structure/shape a manually-supplied token file would have (so `docs-kit/4-ui/3-design-system.md` generation doesn't need special-case handling for a generated vs. user-supplied source).
7. Update `project-docs/sot-docs/design/design-source.md` to check `tokens` (not a new category) — from this point on, a generated token set and a user-supplied one are indistinguishable to the rest of the workflow.

## Output
- `project-docs/sot-docs/design/tokens.json` — complete, contrast-checked token set.
- `project-docs/sot-docs/design/design-source.md` updated to check `tokens`.

## Guardrails
- Don't generate a full token set before the user has picked a direction (step 3) — that's how mismatched, wasted work happens.
- Don't skip the contrast check — an inaccessible palette shouldn't become the SoT-of-record silently.
- This phase produces tokens, not component mockups or a full design system document — `docs-kit/4-ui/3-design-system.md` (generated later, in `3-document-generate/04-ui/`) is where the full written design system document gets produced, from these tokens.

## Completion Checklist
- [ ] Design brief inferred from SoT and confirmed with the user
- [ ] 2-3 directions proposed, one selected (or explicitly blended) by the user
- [ ] Full token set produced: color, typography, spacing, shape, icon convention
- [ ] Contrast checked against WCAG AA (or the project's stated requirement)
- [ ] `project-docs/sot-docs/design/tokens.json` written
- [ ] `project-docs/sot-docs/design/design-source.md` updated to `tokens`

## Next Step
Run `project-docs/prompts/1-discovery/5-project-analysis.md` next.
