import { darkTheme } from 'naive-ui';

export { darkTheme };

export const themeOverrides = {
  common: {
    primaryColor: '#3b82f6',
    primaryColorHover: '#60a0fa',
    primaryColorPressed: '#2f6fe0',
    primaryColorSuppl: '#3b82f6',
    borderRadius: '8px',
    fontFamily: "'Roboto', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
};

// The hand-drawn pieces (SVG wheel, race track, home sprite) live outside
// naive-ui components and read plain CSS variables. Derive those from the same
// theme so there is exactly one palette.
export function applyCssVars(el = document.documentElement) {
  const c = { ...darkTheme.common, ...themeOverrides.common };
  const vars = {
    '--bg': c.bodyColor,
    '--panel': c.cardColor,
    '--surface-inset': c.bodyColor,
    '--border': c.borderColor,
    '--text': c.textColor1,
    '--muted': c.textColor3,
    '--accent': c.primaryColor,
    '--ok': c.successColor,
  };
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}
