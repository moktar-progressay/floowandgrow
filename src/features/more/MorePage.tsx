import { Grid, CardActionArea, Stack, Typography } from '@mui/material';
import { AccountCircle, Description, EmojiEvents, Inbox, Settings, TrackChanges } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { SurfaceCard } from '../../components/common/SurfaceCard';

const items = [
  { to: '/progress', label: 'Progress & awards', detail: 'XP, streaks, insights and achievements', icon: <EmojiEvents /> },
  { to: '/profile', label: 'Profile', detail: 'Name, email, password and plan', icon: <AccountCircle /> },
  { to: '/vault', label: 'Second Brain', detail: 'Brain dumps, notes and files', icon: <Description /> },
  { to: '/inbox', label: 'Inbox', detail: 'Messages that need action', icon: <Inbox /> },
  { to: '/assistant', label: 'Focus assistant', detail: 'Choose the next right thing', icon: <TrackChanges /> },
  { to: '/settings', label: 'Connections', detail: 'Connected services', icon: <Settings /> },
];

export function MorePage() {
  const navigate = useNavigate();
  return <>
    <PageHeader title="More" description="Everything else, kept out of your way until you need it." />
    <Grid container spacing={2}>{items.map((item) => <Grid key={item.to} size={{ xs: 12, sm: 6 }}><SurfaceCard sx={{ height: '100%' }}><CardActionArea onClick={() => navigate(item.to)}><Stack direction="row" alignItems="center" gap={2}>{item.icon}<div><Typography fontWeight={700}>{item.label}</Typography><Typography variant="body2" color="text.secondary">{item.detail}</Typography></div></Stack></CardActionArea></SurfaceCard></Grid>)}</Grid>
  </>;
}
