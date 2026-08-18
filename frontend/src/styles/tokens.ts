/**
 * Design tokens (`4-ui/3-design-system.md` §4) as typed JS values, for consumers that can't
 * read CSS custom properties — chart libraries, canvas rendering, etc. Components should use
 * the Tailwind utility classes / CSS variables wired in `src/app/globals.css` instead; this
 * file is a secondary mirror, not the source of truth.
 */

export const colors = {
  background: '#f8fafc',
  foreground: '#1e293b',
  primary: '#2563eb',
  primaryForeground: '#ffffff',
  secondary: '#f97316',
  secondaryForeground: '#ffffff',
  tertiary: '#7c3aed',
  tertiaryForeground: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  destructive: '#dc2626',
  info: '#2563eb',
  border: '#e2e8f0',
  textSecondary: '#434655',
} as const;

export const radius = {
  sm: '0.5rem',
  md: '1rem',
  lg: '2rem',
  xl: '3rem',
  full: '9999px',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const zIndex = {
  dropdown: 100,
  stickyHeader: 400,
  sidebarMobile: 500,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
} as const;
