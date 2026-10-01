import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FocusTask } from '../../types/models';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../services/supabase/client';
import { useNotice } from '../../app/AppProviders';

export function TaskReminderMonitor({ tasks }: { tasks: FocusTask[] }) {
  const { session } = useAuth();
  const { notify } = useNotice();
  const queryClient = useQueryClient();
  const handled = useRef(new Set<string>());
  const userId = session?.user.id;

  useEffect(() => {
    handled.current.clear();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const checkReminders = async () => {
      const now = Date.now();
      const due = tasks.filter((task) =>
        task.status === 'open'
        && !task.is_daily_anchor
        && task.reminder_at
        && !task.reminder_delivered_at
        && !handled.current.has(task.id)
        && new Date(task.reminder_at).getTime() <= now,
      );
      if (!due.length) return;

      const inAppTitles: string[] = [];
      for (const task of due) {
        handled.current.add(task.id);
        const reminderTime = new Date(task.reminder_at!).getTime();
        const isRecent = now - reminderTime <= 2 * 60 * 60_000;
        if (isRecent) {
          const channel = task.reminder_channel ?? 'in_app';
          if (channel !== 'browser') inAppTitles.push(task.title);
          if (channel !== 'in_app' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('FocusOS reminder', {
                body: task.title,
                tag: `focusos-task-${task.id}`,
              });
            } catch {
              if (channel === 'browser') inAppTitles.push(task.title);
            }
          } else if (channel === 'browser') {
            inAppTitles.push(task.title);
          }
        }

        const { error } = await supabase
          .from('focusos_tasks')
          .update({ reminder_delivered_at: new Date().toISOString() })
          .eq('id', task.id)
          .eq('user_id', userId);
        if (error) {
          handled.current.delete(task.id);
          continue;
        }
      }
      if (inAppTitles.length === 1) notify(`Reminder: ${inAppTitles[0]}`, 'warning');
      else if (inAppTitles.length > 1) notify(`${inAppTitles.length} reminders: ${inAppTitles.join(', ')}`, 'warning');
      await queryClient.invalidateQueries({ queryKey: ['focusos', userId] });
    };

    void checkReminders();
    const timer = window.setInterval(() => void checkReminders(), 30_000);
    return () => window.clearInterval(timer);
  }, [notify, queryClient, tasks, userId]);

  return null;
}
