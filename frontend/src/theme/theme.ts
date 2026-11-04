import { alpha, createTheme } from '@mui/material/styles'
import { brand, radii } from './tokens'

const fontFamily =
  '"Manrope Variable", Manrope, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.teal, dark: brand.tealDark, light: brand.tealLight, contrastText: '#FFFFFF' },
    secondary: { main: brand.navy, dark: brand.midnight, contrastText: '#FFFFFF' },
    success: { main: brand.teal, light: brand.mint, dark: brand.tealDark, contrastText: '#FFFFFF' },
    error: { main: brand.decline, light: brand.declineSoft, contrastText: '#FFFFFF' },
    warning: { main: brand.caution, light: brand.cautionSoft, contrastText: '#FFFFFF' },
    info: { main: brand.navy, light: '#E8EEF3', contrastText: '#FFFFFF' },
    background: { default: brand.offWhite, paper: '#FFFFFF' },
    text: { primary: brand.ink, secondary: brand.slate },
    divider: brand.border,
  },
  shape: { borderRadius: radii.sm },
  typography: {
    fontFamily,
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 },
    h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2 },
    h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 },
    h4: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontSize: '1.0625rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontSize: '0.9375rem', fontWeight: 700 },
    subtitle1: { fontSize: '1rem', fontWeight: 600 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 650, letterSpacing: '0.005em' },
  },
  transitions: {
    duration: { shortest: 120, shorter: 160, short: 200, standard: 220, complex: 280 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: brand.offWhite, WebkitFontSmoothing: 'antialiased' },
        // Money and dates line up in columns.
        '.tabular': { fontVariantNumeric: 'tabular-nums' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { rounded: { borderRadius: radii.lg } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          borderColor: brand.border,
          boxShadow: '0 1px 2px rgba(15, 28, 42, 0.04)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, paddingInline: 18, minHeight: 42 },
        sizeLarge: { minHeight: 50, paddingInline: 22, fontSize: '0.975rem' },
        sizeSmall: { minHeight: 34, paddingInline: 12, borderRadius: 10 },
        outlined: { borderColor: brand.borderStrong },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: `3px solid ${alpha(brand.teal, 0.45)}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.borderStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand.slate },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 650, borderRadius: 999 },
        sizeSmall: { height: 24, fontSize: '0.75rem' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: radii.xl, boxShadow: '0 24px 64px rgba(11, 30, 48, 0.24)' },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.25rem', fontWeight: 700, paddingTop: 24 } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: brand.midnight, fontSize: '0.75rem', padding: '8px 12px', borderRadius: 8, maxWidth: 280 },
        arrow: { color: brand.midnight },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderColor: brand.border,
          color: brand.slate,
          paddingInline: 14,
          '&.Mui-selected': { backgroundColor: brand.mint, color: brand.tealDark },
          '&.Mui-selected:hover': { backgroundColor: '#CDEFE1' },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { backgroundColor: '#FFFFFF', borderRadius: 12 }, grouped: { borderRadius: 12 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: brand.border, paddingTop: 14, paddingBottom: 14 },
        head: { color: brand.slate, fontWeight: 650, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase' },
      },
    },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 14, alignItems: 'center' } } },
  },
})
