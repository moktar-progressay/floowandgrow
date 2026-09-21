import { useState, type FormEvent } from 'react';
import { Alert, Avatar, Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { Email, Lock, Person, WorkspacePremium } from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';
import { useNotice } from '../../app/AppProviders';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../services/supabase/client';

export function ProfilePage() {
  const { session } = useAuth();
  const { notify } = useNotice();
  const user = session?.user;
  const metadata = user?.user_metadata ?? {};
  const initialName = String(metadata.full_name || [metadata.first_name, metadata.last_name].filter(Boolean).join(' ') || '');
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const plan = String(user?.app_metadata?.plan || 'Free');

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSavingName(true);
    const parts = trimmed.split(/\s+/);
    const { error } = await supabase.auth.updateUser({ data: { ...metadata, full_name: trimmed, first_name: parts[0], last_name: parts.slice(1).join(' ') } });
    setSavingName(false);
    if (error) notify(error.message, 'error');
    else notify('Name updated.');
  };

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim().toLocaleLowerCase();
    if (!trimmed || trimmed === user?.email?.toLocaleLowerCase()) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSavingEmail(false);
    if (error) notify(error.message, 'error');
    else notify('Confirmation links have been sent. Your email changes after confirmation.');
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { notify('Use at least 8 characters for your password.', 'error'); return; }
    if (password !== confirmPassword) { notify('The passwords do not match.', 'error'); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) notify(error.message, 'error');
    else { setPassword(''); setConfirmPassword(''); notify('Password updated.'); }
  };

  return <>
    <PageHeader eyebrow="Account" title="Profile" description="Manage your identity, security and FocusOS plan." />
    <SurfaceCard sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
        <Avatar sx={{ width: 68, height: 68, bgcolor: 'primary.dark', fontSize: '1.7rem' }}>{(name || email || 'U').charAt(0).toUpperCase()}</Avatar>
        <Stack flex={1} minWidth={0}><Typography variant="h6" fontWeight={850}>{name || 'FocusOS user'}</Typography><Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user?.email}</Typography></Stack>
        <Chip icon={<WorkspacePremium />} label={`${plan} plan`} color="primary" variant="outlined" />
      </Stack>
    </SurfaceCard>

    <Stack gap={2}>
      <SurfaceCard><Stack component="form" onSubmit={saveName} gap={2}>
        <Stack direction="row" alignItems="center" gap={1}><Person color="primary" /><Typography variant="h6" fontWeight={800}>Name</Typography></Stack>
        <TextField label="Full name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Button type="submit" variant="contained" disabled={savingName || !name.trim()} sx={{ alignSelf: 'flex-start' }}>{savingName ? 'Saving…' : 'Save name'}</Button>
      </Stack></SurfaceCard>

      <SurfaceCard><Stack component="form" onSubmit={saveEmail} gap={2}>
        <Stack direction="row" alignItems="center" gap={1}><Email color="primary" /><Typography variant="h6" fontWeight={800}>Email address</Typography></Stack>
        <Alert severity="info">For security, Supabase may require confirmation from both your old and new email addresses. Reconnect Google Workspace after the change so it matches your new sign-in email.</Alert>
        <TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Button type="submit" variant="contained" disabled={savingEmail || !email.trim() || email.trim().toLocaleLowerCase() === user?.email?.toLocaleLowerCase()} sx={{ alignSelf: 'flex-start' }}>{savingEmail ? 'Sending…' : 'Change email'}</Button>
      </Stack></SurfaceCard>

      <SurfaceCard><Stack component="form" onSubmit={savePassword} gap={2}>
        <Stack direction="row" alignItems="center" gap={1}><Lock color="primary" /><Typography variant="h6" fontWeight={800}>Password</Typography></Stack>
        <TextField label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} slotProps={{ htmlInput: { minLength: 8 } }} required />
        <TextField label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        <Button type="submit" variant="contained" disabled={savingPassword || password.length < 8 || !confirmPassword} sx={{ alignSelf: 'flex-start' }}>{savingPassword ? 'Updating…' : 'Change password'}</Button>
      </Stack></SurfaceCard>

      <SurfaceCard><Stack gap={2}>
        <Stack direction="row" alignItems="center" gap={1}><WorkspacePremium color="primary" /><Typography variant="h6" fontWeight={800}>Plan</Typography></Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
          <Stack flex={1}><Typography fontWeight={750}>{plan} plan</Typography><Typography variant="body2" color="text.secondary">Upgrade options and billing will appear here when FocusOS plans are finalised.</Typography></Stack>
          <Button variant="outlined" href="mailto:admin@progressay.com?subject=FocusOS%20plan%20upgrade">Request upgrade</Button>
        </Stack>
        <Divider />
        <Typography variant="caption" color="text.secondary">Your plan is read from secure account metadata. It cannot be changed from the browser.</Typography>
      </Stack></SurfaceCard>
    </Stack>
  </>;
}
