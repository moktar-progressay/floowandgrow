import { useState, type ReactNode } from 'react';
import {
  AppBar, Avatar, BottomNavigation, BottomNavigationAction, Box, Button, Divider, Drawer,
  IconButton, LinearProgress, List, ListItemButton, ListItemIcon, ListItemText, Stack,
  Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  AddTask, CalendarMonth, DarkMode, Description, Home, Inbox, LightMode, Menu,
  MoreHoriz, Settings, TaskAlt, TrackChanges, Workspaces, Logout,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useColourMode } from '../../app/AppProviders';
import { useAuth } from '../../features/auth/AuthProvider';
import { supabase } from '../../services/supabase/client';
import { BrandMark } from '../brand/BrandMark';

const drawerWidth = 280;
const nav = [
  { to: '/today', label: 'Today', icon: <Home /> },
  { to: '/tasks', label: 'Tasks', icon: <TaskAlt /> },
  { to: '/projects', label: 'Projects', icon: <Workspaces /> },
  { to: '/calendar', label: 'Calendar', icon: <CalendarMonth /> },
  { to: '/vault', label: 'Second Brain Vault', icon: <Description /> },
  { to: '/inbox', label: 'Inbox', icon: <Inbox /> },
  { to: '/assistant', label: 'Focus assistant', icon: <TrackChanges /> },
  { to: '/more', label: 'More', icon: <MoreHoriz /> },
];

export function AppShell({ children, xp = 0, onAddTask }: { children: ReactNode; xp?: number; onAddTask: () => void }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { mode, toggleMode } = useColourMode();
  const level = Math.floor(xp / 300) + 1;
  const progress = ((xp % 300) / 300) * 100;

  const drawer = (
    <Stack height="100%">
      <Stack p={3} gap={1}>
        <BrandMark />
        <Typography variant="caption" color="text.secondary" noWrap>{session?.user.email}</Typography>
      </Stack>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {nav.map((item) => (
          <ListItemButton
            key={item.to}
            selected={location.pathname === item.to}
            onClick={() => { navigate(item.to); setMobileOpen(false); }}
            sx={{ borderRadius: 2.5, mb: 0.5, minHeight: 48 }}
          >
            <ListItemIcon sx={{ minWidth: 42 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box mt="auto" p={2}>
        <Stack direction="row" gap={1}>
          <Tooltip title="Connections"><IconButton onClick={() => navigate('/settings')}><Settings /></IconButton></Tooltip>
          <Tooltip title="Change theme"><IconButton onClick={toggleMode}>{mode === 'dark' ? <LightMode /> : <DarkMode />}</IconButton></Tooltip>
          <Tooltip title="Sign out"><IconButton color="error" onClick={() => void supabase.auth.signOut()}><Logout /></IconButton></Tooltip>
        </Stack>
      </Box>
    </Stack>
  );

  const bottomValue = nav.find((item) => item.to === location.pathname)?.to ?? false;
  return (
    <Box minHeight="100dvh" display="flex">
      {desktop ? (
        <Drawer variant="permanent" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, borderRightColor: 'divider' } }}>{drawer}</Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}>{drawer}</Drawer>
      )}
      <Box component="main" flex={1} minWidth={0} pb={{ xs: 10, md: 0 }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{ bgcolor: 'background.default', backgroundImage: 'none', borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {!desktop && <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></IconButton>}
            <Box flex={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>Level {level} Autonomous Agent</Typography>
                <Typography variant="caption" color="text.secondary">{xp % 300} / 300 XP</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.75, height: 5, borderRadius: 5 }} />
            </Box>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.dark' }}>{session?.user.email?.[0]?.toUpperCase()}</Avatar>
          </Toolbar>
        </AppBar>
        <Box maxWidth={1180} mx="auto" p={{ xs: 2, sm: 3, lg: 4 }}>{children}</Box>
      </Box>
      {!desktop && (
        <BottomNavigation
          showLabels
          value={bottomValue}
          onChange={(_, value: string) => navigate(value)}
          sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: theme.zIndex.appBar, borderTop: 1, borderColor: 'divider', height: 72 }}
        >
          <BottomNavigationAction label="Home" value="/today" icon={<Home />} />
          <BottomNavigationAction label="Tasks" value="/tasks" icon={<TaskAlt />} />
          <BottomNavigationAction label="Projects" value="/projects" icon={<Workspaces />} />
          <BottomNavigationAction label="More" value="/more" icon={<MoreHoriz />} />
        </BottomNavigation>
      )}
      <Button
        variant="contained"
        onClick={onAddTask}
        aria-label="Add task"
        sx={{ position: 'fixed', right: { xs: 18, md: 30 }, bottom: { xs: 88, md: 28 }, minWidth: 58, width: 58, height: 58, borderRadius: '50%', zIndex: theme.zIndex.speedDial }}
      >
        <AddTask />
      </Button>
    </Box>
  );
}
