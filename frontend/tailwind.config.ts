import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 sources content automatically and reads design tokens from
 * `src/app/globals.css` (`@theme inline` block) — see `4-ui/3-design-system.md` §4 and
 * `frontend/src/styles/tokens.ts` for the same values available to non-CSS consumers
 * (e.g. chart libraries). This file exists for explicit dark-mode strategy and any future
 * plugin registration.
 */
export default {
  darkMode: 'media',
} satisfies Config;
