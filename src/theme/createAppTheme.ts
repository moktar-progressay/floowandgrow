import { alpha, createTheme, type PaletteMode } from '@mui/material/styles';

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#25b9f4' },
      secondary: { main: '#7764f6' },
      success: { main: '#2dd4a1' },
      error: { main: '#fb7185' },
      background:
        mode === 'dark'
          ? { default: '#020817', paper: '#091426' }
          : { default: '#f6f8fc', paper: '#ffffff' },
      text:
        mode === 'dark'
          ? { primary: '#f5f8ff', secondary: '#9aa9bf' }
          : { primary: '#10213f', secondary: '#60708a' },
      divider: mode === 'dark' ? '#20314d' : '#dbe5f1',
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 800 },
      h2: { fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 750 },
      h3: { fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 700 },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@import': [
            'url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap")',
          ],
          body: { minHeight: '100dvh' },
          '*': { boxSizing: 'border-box' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { minHeight: 44, borderRadius: 12 } },
      },
      MuiIconButton: {
        styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            boxShadow:
              mode === 'dark'
                ? '0 18px 55px rgba(0,0,0,.25)'
                : '0 16px 44px rgba(55,84,130,.10)',
          }),
        },
      },
      MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: alpha(theme.palette.primary.main, 0.3),
          }),
        },
      },
    },
  });
