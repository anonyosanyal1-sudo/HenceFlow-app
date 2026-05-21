import { createClient } from '@supabase/supabase-js';
import type { AppUser } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!(supabaseUrl && supabaseAnonKey) && typeof window !== 'undefined') {
  console.warn('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export function toAppUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}): AppUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split('@')[0] ??
      null,
    photoURL: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  };
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
