import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { env, whatsappConnectFunction } from '../../config/env';
import { useAuth } from '../auth/AuthProvider';

interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string | null;
  verifiedName?: string | null;
  updatedAt?: string | null;
}

interface WhatsAppSyncResult {
  accepted: boolean;
  syncType: 'history' | 'smb_app_state_sync';
  requestId?: string | null;
}

export interface WhatsAppMessage {
  id: string;
  meta_message_id: string;
  from_phone: string | null;
  to_phone: string | null;
  contact_name: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  message_text: string | null;
  message_timestamp: string | null;
  status: string | null;
  created_at: string;
}

export async function requestWhatsApp<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(whatsappConnectFunction + path, {
    method,
    signal: AbortSignal.timeout(30_000),
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'WhatsApp connection request failed.');
  return data;
}

export function useWhatsAppConnection() {
  const { session } = useAuth();
  const token = session?.access_token ?? '';
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['whatsapp-status', session?.user.id],
    enabled: Boolean(token),
    queryFn: () => requestWhatsApp<WhatsAppStatus>(token, '/status'),
    retry: false,
  });
  const connect = useMutation({
    mutationFn: async () => {
      return requestWhatsApp<WhatsAppStatus>(token, '/connect', 'POST', {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] }),
        queryClient.invalidateQueries({ queryKey: ['focusos', session?.user.id] }),
      ]);
    },
  });
  const disconnect = useMutation({
    mutationFn: () => requestWhatsApp<WhatsAppStatus>(token, '/disconnect', 'POST'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] }),
  });
  const syncHistory = useMutation({
    mutationFn: () => requestWhatsApp<WhatsAppSyncResult>(token, '/sync-history', 'POST', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-chats'] }),
  });
  const chats = useQuery({
    queryKey: ['whatsapp-chats', session?.user.id],
    enabled: Boolean(token) && status.data?.connected === true,
    queryFn: () => requestWhatsApp<{ messages: WhatsAppMessage[]; hasMore: boolean }>(token, '/chats?limit=500'),
    retry: 2,
    refetchInterval: 60_000,
  });
  const createTask = useMutation({
    mutationFn: (messageId: string) => requestWhatsApp<{ taskId: string; created: boolean }>(token, '/chat-task', 'POST', { messageId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['focusos', session?.user.id] });
    },
  });
  return { status, connect, disconnect, syncHistory, chats, createTask };
}
