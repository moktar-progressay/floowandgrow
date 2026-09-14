const fallbackUrl = 'https://mtsqdhvvrxywbtyabbwo.supabase.co';
const fallbackPublishableKey = 'sb_publishable_OWslxdSKfxkZJdqC3BvfbA_RTx0ktxx';

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || fallbackUrl,
  supabasePublishableKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey,
};

export const googleWorkspaceFunction = `${env.supabaseUrl}/functions/v1/google-workspace`;
