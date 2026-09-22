import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { env, whatsappConnectFunction } from '../../config/env';
import { useAuth } from '../auth/AuthProvider';

interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string | null;
  verifiedName?: string | null;
  updatedAt?: string | null;
}

interface EmbeddedSignupData {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
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
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let facebookSdkPromise: Promise<FacebookSdk> | null = null;

function loadFacebookSdk() {
  if (window.FB) return Promise.resolve(window.FB);
  if (facebookSdkPromise) return facebookSdkPromise;
  facebookSdkPromise = new Promise<FacebookSdk>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Meta login took too long to load. Please try again.')), 20_000);
    const finish = () => {
      if (!window.FB) return;
      window.clearTimeout(timeout);
      window.FB.init({ appId: env.metaAppId, autoLogAppEvents: true, xfbml: false, version: 'v26.0' });
      resolve(window.FB);
    };
    window.fbAsyncInit = finish;
    const existing = document.getElementById('facebook-jssdk');
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Meta login could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_GB/sdk.js';
    script.onerror = () => reject(new Error('Meta login could not be loaded.'));
    document.head.appendChild(script);
  });
  return facebookSdkPromise;
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

async function runEmbeddedSignup() {
  const facebook = await loadFacebookSdk();
  return new Promise<{ code: string; session: EmbeddedSignupData }>((resolve, reject) => {
    let code = '';
    let session: EmbeddedSignupData | null = null;
    let settled = false;
    const timeout = window.setTimeout(() => finish(new Error('WhatsApp setup timed out. Please try again.')), 5 * 60_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', sessionInfoListener);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      if (error) {
        settled = true;
        cleanup();
        reject(error);
      } else if (code && session?.waba_id && session.phone_number_id) {
        settled = true;
        cleanup();
        resolve({ code, session });
      }
    };
    const sessionInfoListener = (event: MessageEvent) => {
      if (!['https://www.facebook.com', 'https://web.facebook.com'].includes(event.origin)) return;
      let payload: { type?: string; event?: string; data?: EmbeddedSignupData };
      try { payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; }
      catch { return; }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (payload.event === 'FINISH') {
        session = payload.data ?? null;
        finish();
      } else if (payload.event === 'CANCEL' || payload.event === 'ERROR') {
        finish(new Error('WhatsApp setup was cancelled before it finished.'));
      }
    };
    window.addEventListener('message', sessionInfoListener);
    facebook.login((response) => {
      code = String(response.authResponse?.code ?? '');
      if (!code) finish(new Error('Meta did not return an authorisation code. Please complete every setup step.'));
      else finish();
    }, {
      config_id: env.whatsappEmbeddedSignupConfigId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3',
      },
    });
  });
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
      const { code, session: signup } = await runEmbeddedSignup();
      return requestWhatsApp<WhatsAppStatus>(token, '/exchange', 'POST', {
        code,
        wabaId: signup.waba_id,
        phoneNumberId: signup.phone_number_id,
        businessId: signup.business_id,
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
  return { status, connect, disconnect };
}
