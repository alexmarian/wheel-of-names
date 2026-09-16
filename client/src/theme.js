import { darkTheme } from 'naive-ui';

export { darkTheme };

// Cool gray + blue — a plain, professional SaaS-dashboard palette.
export const palette = {
  bg: '#0e1116',
  panel: '#161a21',
  panelInset: '#0a0c10',
  border: '#262b34',
  text: '#e6e8eb',
  muted: '#8d94a1',
  accent: '#3b82f6',
  accent2: '#22d3ee',
  ok: '#4ade80',
  danger: '#f87171',
};

const p = palette;

export const themeOverrides = {
  common: {
    primaryColor: p.accent,
    primaryColorHover: '#60a0fa',
    primaryColorPressed: '#2f6fe0',
    primaryColorSuppl: p.accent,
    infoColor: p.accent2,
    infoColorHover: '#4ee0f0',
    infoColorPressed: '#1cb8cc',
    successColor: p.ok,
    successColorHover: '#6bea97',
    successColorPressed: '#3bc98a',
    warningColor: '#fbbf24',
    warningColorHover: '#fccb52',
    warningColorPressed: '#dba317',
    errorColor: p.danger,
    errorColorHover: '#fa9494',
    errorColorPressed: '#e35a5a',

    textColorBase: p.text,
    textColor1: p.text,
    textColor2: '#c7cbd3',
    textColor3: p.muted,
    placeholderColor: p.muted,
    iconColor: p.muted,

    bodyColor: p.bg,
    cardColor: p.panel,
    modalColor: p.panel,
    popoverColor: p.panel,
    tableColor: p.panel,
    tableHeaderColor: p.panel,
    inputColor: p.panelInset,
    actionColor: p.panel,
    invertedColor: p.panelInset,

    borderColor: p.border,
    dividerColor: p.border,
    hoverColor: 'rgba(255, 255, 255, 0.04)',
    railColor: p.panelInset,
    progressRailColor: p.panelInset,

    borderRadius: '10px',
    borderRadiusSmall: '6px',

    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  },
  Card: {
    color: p.panel,
    borderColor: p.border,
    borderRadius: '16px',
  },
  DataTable: {
    thColor: p.panel,
    tdColor: p.panel,
    borderColor: p.border,
  },
  Modal: {
    color: p.panel,
  },
};
