import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthProvider';
import type {
  FocusGoal,
  FocusNote,
  FocusProject,
  FocusState,
  FocusTag,
  FocusTask,
  DailyCompletion,
  NoteDraft,
  NoteTag,
  RewardEvent,
  RewardKind,
  TaskDraft,
  TaskTag,
} from '../../types/models';

const focusKey = (userId: string) => ['focusos', userId] as const;

async function checked<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

const taskPageSize = 1000;

async function loadAllTasks(userId: string) {
  const allTasks: FocusTask[] = [];
  for (let from = 0; ; from += taskPageSize) {
    const page = await checked(
      supabase
        .from('focusos_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order')
        .order('created_at')
        .order('id')
        .range(from, from + taskPageSize - 1),
    ) as FocusTask[] | null;
    allTasks.push(...(page ?? []));
    if (!page || page.length < taskPageSize) break;
  }
  return allTasks;
}

async function ensureDailyAnchorsProject(userId: string) {
  const existing = await checked(
    supabase.from('focusos_projects').select('id').eq('user_id', userId).eq('name', 'Daily Anchors').eq('status', 'active').limit(1).maybeSingle(),
  );
  if (existing?.id) return existing.id as string;
  const created = await checked(
    supabase.from('focusos_projects').insert({ user_id: userId, name: 'Daily Anchors', colour: '#7c5cff', status: 'active' }).select('id').single(),
  );
  if (!created?.id) throw new Error('Daily Anchors project could not be created.');
  return created.id as string;
}

export function useFocusData() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: focusKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const [stateResult, tasks, projects, goals, tags, taskTags, notes, noteTags, dailyCompletions, rewardEvents] = await Promise.all([
        checked(supabase.from('focusos_state').select('*').eq('user_id', userId).maybeSingle()),
        loadAllTasks(userId),
        checked(
          supabase
            .from('focusos_projects')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at'),
        ),
        checked(
          supabase
            .from('focusos_goals')
            .select('*')
            .eq('user_id', userId)
            .neq('status', 'archived')
            .order('sort_order')
            .order('created_at'),
        ),
        checked(supabase.from('focusos_tags').select('*').eq('user_id', userId).order('name')),
        checked(supabase.from('focusos_task_tags').select('task_id,tag_id').eq('user_id', userId)),
        checked(
          supabase
            .from('focusos_notes')
            .select('id,title,content,project_id,goal_id,status,created_at,updated_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('updated_at', { ascending: false }),
        ),
        checked(supabase.from('focusos_note_tags').select('note_id,tag_id').eq('user_id', userId)),
        checked(
          supabase
            .from('focusos_daily_completions')
            .select('task_id,completion_date,completed_at')
            .eq('user_id', userId)
            .order('completion_date', { ascending: false }),
        ),
        checked(
          supabase
            .from('focusos_reward_events')
            .select('id,event_key,kind,source,points,metadata,occurred_at')
            .eq('user_id', userId)
            .order('occurred_at', { ascending: false }),
        ),
      ]);

      let state = stateResult as FocusState | null;
      if (!state) {
        state = {
          user_id: userId,
          xp: 0,
          habits: { date: new Date().toISOString().slice(0, 10), values: {} },
          docs: [],
          workspace: { anchors: [], timeline: [], completed: [], inboxZeroDates: [] },
          connections: {},
        };
        await checked(supabase.from('focusos_state').insert(state).select('*').single());
      }

      return {
        state,
        tasks: (tasks ?? []) as FocusTask[],
        projects: (projects ?? []) as FocusProject[],
        goals: (goals ?? []) as FocusGoal[],
        tags: (tags ?? []) as FocusTag[],
        taskTags: (taskTags ?? []) as TaskTag[],
        notes: (notes ?? []) as FocusNote[],
        noteTags: (noteTags ?? []) as NoteTag[],
        dailyCompletions: (dailyCompletions ?? []) as DailyCompletion[],
        rewardEvents: (rewardEvents ?? []) as RewardEvent[],
      };
    },
  });
}

export function useNoteMutations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? '';
  const refresh = () => queryClient.invalidateQueries({ queryKey: focusKey(userId) });

  const saveNote = useMutation({
    mutationFn: async ({ id, draft }: { id?: string; draft: NoteDraft }) => {
      const payload = {
        user_id: userId,
        title: draft.title.trim(),
        content: draft.content.trim(),
        project_id: draft.project_id || null,
        goal_id: draft.goal_id || null,
        updated_at: new Date().toISOString(),
      };
      const saved = id
        ? await checked(
            supabase.from('focusos_notes').update(payload).eq('id', id).eq('user_id', userId).select('id').single(),
          )
        : await checked(
            supabase.from('focusos_notes').insert({ ...payload, status: 'active' }).select('id').single(),
          );
      if (!saved?.id) throw new Error('Note was not saved.');
      const noteId = saved.id as string;
      await checked(supabase.from('focusos_note_tags').delete().eq('note_id', noteId).eq('user_id', userId));
      if (draft.tag_ids.length) {
        await checked(
          supabase.from('focusos_note_tags').insert(
            draft.tag_ids.map((tagId) => ({ user_id: userId, note_id: noteId, tag_id: tagId })),
          ),
        );
      }
      return noteId;
    },
    onSuccess: refresh,
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) =>
      checked(supabase.from('focusos_notes').delete().eq('id', id).eq('user_id', userId)),
    onSuccess: refresh,
  });

  return { saveNote, deleteNote };
}

export function useTaskMutations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? '';
  const refresh = () => queryClient.invalidateQueries({ queryKey: focusKey(userId) });

  const saveTask = useMutation({
    mutationFn: async ({ id, draft }: { id?: string; draft: TaskDraft }) => {
      const projectId = draft.is_daily_anchor ? await ensureDailyAnchorsProject(userId) : draft.project_id;
      const payload = {
        user_id: userId,
        title: draft.title.trim(),
        priority: draft.priority,
        project_id: projectId || null,
        goal_id: draft.goal_id || null,
        scheduled_date: draft.scheduled_date || null,
        scheduled_time: draft.scheduled_time || null,
        is_daily_anchor: draft.is_daily_anchor,
        recurrence: draft.is_daily_anchor ? 'daily' : 'none',
        updated_at: new Date().toISOString(),
      };
      const saved = id
        ? await checked(supabase.from('focusos_tasks').update(payload).eq('id', id).eq('user_id', userId).select('id').single())
        : await checked(
            supabase
              .from('focusos_tasks')
              .insert({ ...payload, status: 'open', source: 'manual' })
              .select('id')
              .single(),
          );
      if (!saved) throw new Error('Task was not saved.');
      const taskId = saved.id as string;
      await checked(supabase.from('focusos_task_tags').delete().eq('task_id', taskId).eq('user_id', userId));
      if (draft.tag_ids.length) {
        await checked(
          supabase.from('focusos_task_tags').insert(
            draft.tag_ids.map((tagId) => ({ user_id: userId, task_id: taskId, tag_id: tagId })),
          ),
        );
      }
      return taskId;
    },
    onSuccess: refresh,
  });

  const toggleTask = useMutation({
    mutationFn: async ({ task, completionDate, completed }: { task: FocusTask; completionDate?: string; completed?: boolean }) => {
      if (task.is_daily_anchor) {
        const date = completionDate ?? new Date().toISOString().slice(0, 10);
        return completed
          ? checked(
              supabase
                .from('focusos_daily_completions')
                .delete()
                .eq('user_id', userId)
                .eq('task_id', task.id)
                .eq('completion_date', date),
            )
          : checked(
              supabase
                .from('focusos_daily_completions')
                .upsert(
                  { user_id: userId, task_id: task.id, completion_date: date, completed_at: new Date().toISOString() },
                  { onConflict: 'user_id,task_id,completion_date', ignoreDuplicates: true },
                ),
            );
      }

      return checked(
          supabase
            .from('focusos_tasks')
            .update({
              status: task.status === 'completed' ? 'open' : 'completed',
              completed_at: task.status === 'completed' ? null : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', task.id)
            .eq('user_id', userId),
        );
    },
    onSuccess: refresh,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) =>
      checked(supabase.from('focusos_tasks').delete().eq('id', id).eq('user_id', userId)),
    onSuccess: refresh,
  });

  const setTaskHidden = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) =>
      checked(
        supabase
          .from('focusos_tasks')
          .update({ status: hidden ? 'archived' : 'open', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId),
      ),
    onSuccess: refresh,
  });

  return { saveTask, toggleTask, deleteTask, setTaskHidden };
}

export function useRewardMutation() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? '';
  return useMutation({
    mutationFn: async ({
      rewardKey,
      kind,
      source = 'focusos',
      metadata = {},
      occurredAt,
    }: {
      rewardKey: string;
      kind: Exclude<RewardKind, 'legacy_reward'>;
      source?: string;
      metadata?: Record<string, unknown>;
      occurredAt?: string;
    }) => {
      const result = await checked(
        supabase.rpc('record_focusos_reward', {
          p_event_key: rewardKey,
          p_kind: kind,
          p_source: source,
          p_metadata: metadata,
          ...(occurredAt ? { p_occurred_at: occurredAt } : {}),
        }),
      ) as { awarded?: boolean; points?: number; total_xp?: number } | null;
      return { awarded: Boolean(result?.awarded), points: Number(result?.points || 0), totalXp: Number(result?.total_xp || 0) };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: focusKey(userId) }),
  });
}

export function useOrganisationMutations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? '';
  const refresh = () => queryClient.invalidateQueries({ queryKey: focusKey(userId) });

  const saveProject = useMutation({
    mutationFn: async ({ id, name, colour }: { id?: string; name: string; colour: string }) => {
      const saved = id
        ? await checked(
            supabase
              .from('focusos_projects')
              .update({ name: name.trim(), colour, updated_at: new Date().toISOString() })
              .eq('id', id)
              .eq('user_id', userId)
              .select('id,name,colour,status,created_at,updated_at')
              .single(),
          )
        : await checked(
            supabase
              .from('focusos_projects')
              .insert({ user_id: userId, name: name.trim(), colour, status: 'active' })
              .select('id,name,colour,status,created_at,updated_at')
              .single(),
          );
      return saved as FocusProject;
    },
    onSuccess: refresh,
  });

  const archiveProject = useMutation({
    mutationFn: async (id: string) =>
      checked(
        supabase
          .from('focusos_projects')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId),
      ),
    onSuccess: refresh,
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) =>
      checked(
        supabase
          .from('focusos_projects')
          .delete()
          .eq('id', id)
          .eq('user_id', userId),
      ),
    onSuccess: refresh,
  });

  const saveGoal = useMutation({
    mutationFn: async ({
      id,
      projectId,
      title,
      why,
    }: {
      id?: string;
      projectId: string;
      title: string;
      why: string;
    }) => {
      const saved = id
        ? await checked(
            supabase
              .from('focusos_goals')
              .update({ title: title.trim(), why_this_matters: why.trim() || null, updated_at: new Date().toISOString() })
              .eq('id', id)
              .eq('user_id', userId)
              .select('id,project_id,title,why_this_matters,status,sort_order,created_at,updated_at')
              .single(),
          )
        : await checked(
            supabase.from('focusos_goals').insert({
              user_id: userId,
              project_id: projectId,
              title: title.trim(),
              why_this_matters: why.trim() || null,
              status: 'active',
            })
              .select('id,project_id,title,why_this_matters,status,sort_order,created_at,updated_at')
              .single(),
          );
      return saved as FocusGoal;
    },
    onSuccess: refresh,
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) =>
      checked(
        supabase
          .from('focusos_goals')
          .delete()
          .eq('id', id)
          .eq('user_id', userId),
      ),
    onSuccess: refresh,
  });

  const saveTag = useMutation({
    mutationFn: async ({ name, colour }: { name: string; colour: string }) =>
      checked(
        supabase
          .from('focusos_tags')
          .insert({ user_id: userId, name: name.trim(), colour })
          .select('id,name,colour,created_at,updated_at')
          .single(),
      ) as Promise<FocusTag>,
    onSuccess: refresh,
  });

  return { saveProject, archiveProject, deleteProject, saveGoal, deleteGoal, saveTag };
}
