import { supabase } from './supabase';

let authenticatedUserId: string | null = null;
const sensitiveKeys = new Set([
  'lyriq_gemini_key', 'lyriq_openai_key', 'lyriq_anthropic_key', 'lyriq_providers', 'lyriq_users',
]);
const shouldSync = (key: string) => key.startsWith('lyriq_') && !sensitiveKeys.has(key);

export const persistentStorage = {
  getItem(key: string) {
    return window.localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    window.localStorage.setItem(key, value);
    if (authenticatedUserId && shouldSync(key)) {
      void supabase.from('user_app_state').upsert({
        user_id: authenticatedUserId,
        state_key: key,
        state_value: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,state_key' });
    }
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key);
    if (authenticatedUserId && shouldSync(key)) {
      void supabase.from('user_app_state').delete()
        .eq('user_id', authenticatedUserId).eq('state_key', key);
    }
  },
  clear() {
    const keys = Object.keys(window.localStorage).filter(key => key.startsWith('lyriq_'));
    keys.forEach(key => window.localStorage.removeItem(key));
    if (authenticatedUserId) {
      void supabase.from('user_app_state').delete().eq('user_id', authenticatedUserId);
    }
  },
};

export function setPersistentUser(userId: string | null) {
  authenticatedUserId = userId;
}

export async function initializePersistence() {
  window.localStorage.removeItem('lyriq_users');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    authenticatedUserId = null;
    return;
  }
  authenticatedUserId = session.user.id;

  const { data, error } = await supabase.from('user_app_state')
    .select('state_key,state_value').eq('user_id', authenticatedUserId);
  if (error) throw error;
  for (const row of data ?? []) window.localStorage.setItem(row.state_key, row.state_value);

  const metadata = session.user.user_metadata;
  window.localStorage.setItem('lyriq_session', JSON.stringify({
    email: session.user.email,
    name: metadata.name || session.user.email,
    role: metadata.role || 'user',
    plan: metadata.plan || 'free',
  }));
}
