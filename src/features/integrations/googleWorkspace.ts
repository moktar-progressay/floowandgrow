import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { googleWorkspaceFunction } from '../../config/env';
import { useAuth } from '../auth/AuthProvider';
import type { GoogleWorkspaceData, VaultDocument } from '../../types/models';

async function request<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(googleWorkspaceFunction + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Google Workspace request failed.');
  return data;
}

export function mapDriveFiles(data?: GoogleWorkspaceData): VaultDocument[] {
  return (data?.drive?.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    tag: file.mimeType?.includes('folder') ? 'Folder' : file.mimeType?.includes('spreadsheet') ? 'Google Sheet' : file.mimeType?.includes('presentation') ? 'Google Slides' : file.mimeType?.includes('document') ? 'Google Doc' : 'Drive file',
    date: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('en-GB') : '',
    size: file.size == null ? undefined : file.size < 1_048_576 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1_048_576).toFixed(1)} MB`,
    link: file.link,
    starred: file.starred,
    drive: true,
  }));
}

export function useGoogleWorkspace() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ['google-workspace-status', session?.user.id],
    enabled: Boolean(token),
    queryFn: () => request<Pick<GoogleWorkspaceData, 'connected' | 'email'>>(token, '/status'),
    retry: false,
  });
  const query = useQuery({
    queryKey: ['google-workspace', session?.user.id],
    enabled: Boolean(token),
    queryFn: async () => {
      const data = await request<GoogleWorkspaceData>(token, '/data');
      if (data.connected && session?.user.id) {
        await client.invalidateQueries({ queryKey: ['focusos', session.user.id] });
      }
      return data;
    },
    retry: false,
  });
  const connect = useMutation({
    mutationFn: () => request<{ url: string }>(token, '/start', 'POST', {
      returnTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
    }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const disconnect = useMutation({
    mutationFn: () => request(token, '/disconnect', 'POST'),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['google-workspace'] }),
        client.invalidateQueries({ queryKey: ['google-workspace-status'] }),
      ]);
    },
  });
  const action = <T,>(path: string, body: unknown) => request<T>(token, path, 'POST', body);
  return {
    ...query,
    connected: status.data?.connected ?? query.data?.connected ?? false,
    email: status.data?.email ?? query.data?.email,
    checkingConnection: status.isPending,
    connectionError: status.error,
    connect,
    disconnect,
    action,
  };
}
