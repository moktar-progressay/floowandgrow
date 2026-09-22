const fallbackUrl = 'https://mtsqdhvvrxywbtyabbwo.supabase.co';
const fallbackPublishableKey = 'sb_publishable_OWslxdSKfxkZJdqC3BvfbA_RTx0ktxx';

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || fallbackUrl,
  supabasePublishableKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey,
  metaAppId: import.meta.env.VITE_META_APP_ID || '2295080044640450',
  whatsappEmbeddedSignupConfigId:
    import.meta.env.VITE_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || '1308944731214492',
};

export const googleWorkspaceFunction = `${env.supabaseUrl}/functions/v1/google-workspace`;
export const focusAgentFunction = `${env.supabaseUrl}/functions/v1/focus-agent`;
export const whatsappConnectFunction = `${env.supabaseUrl}/functions/v1/whatsapp-connect`;
