import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { env, whatsappConnectFunction } from '../../config/env';
import { useAuth } from '../auth/AuthProvider';

interface WhatsAppStatus {
  configured?: boolean;
  connected: boolean;
  phoneNumber?: string | null;
  verifiedName?: string | null;
  updatedAt?: string | null;
  metaStatus?: string | null;
  platformType?: string | null;
  isOnBusinessApp?: boolean | null;
  codeVerificationStatus?: string | null;
}

interface FacebookLoginResponse {
  authResponse?: { code?: string };
  status?: string;
}

interface FacebookSdk {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
}

declare global {
  interface Window { FB?: FacebookSdk; fbAsyncInit?: () => void }
}

let metaSdkPromise: Promise<FacebookSdk> | null = null;

function loadMetaSdk() {
  if (window.FB) return Promise.resolve(window.FB);
  if (metaSdkPromise) return metaSdkPromise;
  metaSdkPromise = new Promise<FacebookSdk>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Meta login took too long to load. Please refresh and try again.')), 20_000);
    window.fbAsyncInit = () => {
      if (!window.FB) return;
      window.FB.init({ appId: env.metaAppId, cookie: true, xfbml: false, version: 'v26.0' });
      window.clearTimeout(timeout);
      resolve(window.FB);
    };
    const existing = document.getElementById('facebook-jssdk');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_GB/sdk.js';
      script.onerror = () => reject(new Error('Meta login could not load. Check your connection and try again.'));
      document.head.appendChild(script);
    }
  });
  return metaSdkPromise;
}

async function launchEmbeddedSignup() {
  const sdk = await loadMetaSdk();
  const session = new Promise<{ wabaId: string; phoneNumberId: string }>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error('WhatsApp setup timed out. Please start it again.'));
    }, 10 * 60_000);
    const finish = (result: { wabaId: string; phoneNumberId: string } | Error) => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', listener);
      if (result instanceof Error) reject(result); else resolve(result);
    };
    const listener = (event: MessageEvent) => {
      if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return;
      let payload = event.data;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (payload.event === 'CANCEL' || payload.event === 'ERROR') {
        finish(new Error(payload?.data?.error_message || 'WhatsApp setup was not completed.'));
        return;
      }
      if (!['FINISH', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(payload.event)) return;
      const wabaId = String(payload?.data?.waba_id ?? '');
      const phoneNumberId = String(payload?.data?.phone_number_id ?? '');
      if (!wabaId || !phoneNumberId) finish(new Error('Meta did not return the WhatsApp account details.'));
      else finish({ wabaId, phoneNumberId });
    };
    window.addEventListener('message', listener);
  });
  const code = new Promise<string>((resolve, reject) => {
    sdk.login((response) => {
      const value = response.authResponse?.code;
      if (value) resolve(value);
      else reject(new Error('Meta login was cancelled or did not return an authorisation code.'));
    }, {
      config_id: env.whatsappEmbeddedSignupConfigId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3',
      },
    });
  });
  const [authorisationCode, account] = await Promise.all([code, session]);
  return { code: authorisationCode, ...account };
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
  useEffect(() => { void loadMetaSdk().catch(() => undefined); }, []);
  const status = useQuery({
    queryKey: ['whatsapp-status', session?.user.id],
    enabled: Boolean(token),
    queryFn: () => requestWhatsApp<WhatsAppStatus>(token, '/status'),
    retry: false,
  });
  const connect = useMutation({
    mutationFn: async () => {
      const signup = await launchEmbeddedSignup();
      return requestWhatsApp<WhatsAppStatus & { historyRequested?: boolean }>(token, '/embedded-signup', 'POST', {
        ...signup,
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
