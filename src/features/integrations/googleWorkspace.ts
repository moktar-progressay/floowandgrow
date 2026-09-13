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
  const query = useQuery({
    queryKey: ['google-workspace', session?.user.id],
    enabled: Boolean(token),
    queryFn: () => request<GoogleWorkspaceData>(token, '/data'),
    retry: false,
  });
  const connect = useMutation({
    mutationFn: () => request<{ url: string }>(token, '/start', 'POST'),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const disconnect = useMutation({
    mutationFn: () => request(token, '/disconnect', 'POST'),
    onSuccess: () => client.invalidateQueries({ queryKey: ['google-workspace'] }),
  });
  const action = <T,>(path: string, body: unknown) => request<T>(token, path, 'POST', body);
  return { ...query, connect, disconnect, action };
}
