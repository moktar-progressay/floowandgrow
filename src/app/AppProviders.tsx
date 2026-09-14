import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, Snackbar, Alert, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme/createAppTheme';

interface ColourModeValue {
  mode: PaletteMode;
  toggleMode: () => void;
}

interface NoticeValue {
  notify: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ColourModeContext = createContext<ColourModeValue | null>(null);
const NoticeContext = createContext<NoticeValue | null>(null);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('focusos-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [notice, setNotice] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const toggleMode = useCallback(() => {
    setMode((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('focusos-theme', next);
      return next;
    });
  }, []);
  const notify = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') =>
      setNotice({ open: true, message, severity }),
    [],
  );
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const colourMode = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);
  const noticeValue = useMemo(() => ({ notify }), [notify]);

  return (
    <QueryClientProvider client={queryClient}>
      <ColourModeContext.Provider value={colourMode}>
        <NoticeContext.Provider value={noticeValue}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
            <Snackbar
              open={notice.open}
              autoHideDuration={3500}
              onClose={() => setNotice((value) => ({ ...value, open: false }))}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                severity={notice.severity}
                variant="filled"
                onClose={() => setNotice((value) => ({ ...value, open: false }))}
              >
                {notice.message}
              </Alert>
            </Snackbar>
          </ThemeProvider>
        </NoticeContext.Provider>
      </ColourModeContext.Provider>
    </QueryClientProvider>
  );
}

export function useColourMode() {
  const value = useContext(ColourModeContext);
  if (!value) throw new Error('useColourMode must be used within AppProviders');
  return value;
}

export function useNotice() {
  const value = useContext(NoticeContext);
  if (!value) throw new Error('useNotice must be used within AppProviders');
  return value;
}
