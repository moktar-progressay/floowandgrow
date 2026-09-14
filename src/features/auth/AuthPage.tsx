import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, DarkMode, LightMode } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase/client';
import { useAuth } from './AuthProvider';
import { useColourMode } from '../../app/AppProviders';
import { BrandMark } from '../../components/brand/BrandMark';
import { SurfaceCard } from '../../components/common/SurfaceCard';

type Mode = 'signin' | 'signup' | 'reset' | 'update-password';

export function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, isRecovery, recoveryError, clearRecovery } = useAuth();
  const { mode: colourMode, toggleMode } = useColourMode();
  const [mode, setMode] = useState<Mode>(() => (params.get('mode') === 'signup' ? 'signup' : 'signin'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isRecovery) setMode('update-password');
  }, [isRecovery]);
  useEffect(() => {
    if (!recoveryError) return;
    setMode('reset');
    setMessage({ type: 'error', text: recoveryError });
    window.history.replaceState({}, document.title, import.meta.env.BASE_URL + '?mode=reset');
  }, [recoveryError]);
  useEffect(() => {
    if (session && !isRecovery && mode !== 'update-password') navigate('/today', { replace: true });
  }, [session, isRecovery, mode, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'reset') {
        // Keep recovery on the deployed app root. App routing sends the
        // PASSWORD_RECOVERY session to the password update form.
        const recoveryUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
        recoveryUrl.searchParams.set('mode', 'update-password');
        const redirectTo = recoveryUrl.toString();
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
        setMessage({ type: 'success', text: 'If an account exists for that email, a reset link has been sent. Check your inbox and junk folder.' });
      } else if (mode === 'update-password') {
        if (password.length < 8) throw new Error('Use at least 8 characters.');
        if (password !== confirmation) throw new Error('The passwords do not match.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        clearRecovery();
        window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
        navigate('/today', { replace: true });
      } else {
        const result =
          mode === 'signin'
            ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
            : await supabase.auth.signUp({ email: email.trim(), password });
        if (result.error) throw result.error;
        if (mode === 'signup' && !result.data.session) {
          setMessage({ type: 'success', text: 'Account created. Please check your email to confirm your address.' });
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Authentication failed.';
      setMessage({
        type: 'error',
        text: /email rate limit exceeded/i.test(detail)
          ? 'Too many reset emails have been requested. Please wait before trying again, then press Send reset link only once.'
          : detail,
      });
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'reset' ? 'Reset your password' : mode === 'update-password' ? 'Choose a new password' : 'Welcome to FocusOS';
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', py: 8 }}>
      <IconButton onClick={() => navigate('/')} aria-label="Back" sx={{ position: 'fixed', top: 20, left: 20 }}><ArrowBack /></IconButton>
      <IconButton onClick={toggleMode} aria-label="Change theme" sx={{ position: 'fixed', top: 20, right: 20 }}>
        {colourMode === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>
      <Box width="100%">
        <Stack alignItems="center" mb={4} gap={2}><BrandMark /><Typography variant="h5" fontWeight={800}>{title}</Typography></Stack>
        <SurfaceCard>
          {mode !== 'reset' && mode !== 'update-password' && (
            <Tabs value={mode} onChange={(_, value: Mode) => { setMode(value); setMessage(null); }} variant="fullWidth" sx={{ mb: 3 }}>
              <Tab value="signin" label="Sign in" />
              <Tab value="signup" label="Create account" />
            </Tabs>
          )}
          <Stack component="form" gap={2.25} onSubmit={submit}>
            {mode !== 'update-password' && (
              <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
            )}
            {mode !== 'reset' && (
              <TextField label={mode === 'update-password' ? 'New password' : 'Password'} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth />
            )}
            {mode === 'update-password' && (
              <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required fullWidth />
            )}
            {message && <Alert severity={message.type}>{message.text}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : mode === 'update-password' ? 'Save new password' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            {mode === 'signin' && <Link component="button" type="button" onClick={() => setMode('reset')}>Forgot password?</Link>}
            {mode === 'reset' && <Link component="button" type="button" onClick={() => setMode('signin')}>Return to sign in</Link>}
          </Stack>
        </SurfaceCard>
      </Box>
    </Container>
  );
}
