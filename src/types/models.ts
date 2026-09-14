export type TaskStatus = 'open' | 'completed' | 'archived';
export type TaskPriority = 'red' | 'yellow' | 'green' | null;

export interface FocusTask {
  id: string;
  legacy_key: string | null;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  project_id: string | null;
  goal_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  is_daily_anchor: boolean;
  recurrence: 'none' | 'daily';
  sort_order: number;
  source: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FocusProject {
  id: string;
  name: string;
  colour: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface FocusGoal {
  id: string;
  project_id: string;
  title: string;
  why_this_matters: string | null;
  status: 'active' | 'completed' | 'archived';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FocusTag {
  id: string;
  name: string;
  colour: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

export interface DailyCompletion {
  task_id: string;
  completion_date: string;
  completed_at: string;
}

export interface FocusState {
  user_id: string;
  xp: number;
  habits: Record<string, unknown>;
  docs: VaultDocument[];
  connections: Record<string, unknown>;
  workspace: {
    anchors: unknown[];
    timeline: unknown[];
    completed: unknown[];
    inboxZeroDates: string[];
    taskTownRewards?: string[];
  };
}

export interface TaskDraft {
  title: string;
  priority: TaskPriority;
  project_id: string | null;
  goal_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  is_daily_anchor: boolean;
  tag_ids: string[];
}

export interface GoogleMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  replyTo?: string;
  snippet?: string;
  preview?: string;
  date?: string;
  time?: string;
  unread?: boolean;
  link?: string;
}

export interface GoogleMessageDetail extends GoogleMessage {
  to?: string;
  cc?: string;
  text: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

export interface GoogleEvent {
  id: string;
  title?: string;
  summary?: string;
  start: string;
  end?: string;
  link?: string;
  location?: string;
}

export interface GoogleTask {
  externalTaskId: string;
  externalTaskListId: string;
  title: string;
  status?: string;
  due?: string | null;
}

export interface VaultDocument {
  id: string;
  name: string;
  tag?: string;
  date?: string;
  size?: string;
  link?: string;
  starred?: boolean;
  drive?: boolean;
  project_id?: string | null;
}

export interface GoogleWorkspaceData {
  connected: boolean;
  email?: string;
  services?: Record<string, { ok: boolean; error: string | null }>;
  gmail?: { unread?: number; messages?: GoogleMessage[] };
  calendar?: { events?: GoogleEvent[] };
  tasks?: { items?: GoogleTask[] };
  drive?: {
    files?: Array<{
      id: string;
      name: string;
      mimeType?: string;
      modifiedTime?: string;
      size?: number | null;
      link?: string;
      starred?: boolean;
    }>;
  };
}
