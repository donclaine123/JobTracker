import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Application, ApplicationDetails } from './applications';

type Row = Application & { user_id: string };
export type Database = {
  public: {
    Tables: {
      applications: {
        Row: Row;
        Insert: ApplicationDetails;
        Update: Partial<ApplicationDetails>;
        Relationships: [];
      };
      account_usernames: {
        Row: { user_id: string; username: string };
        Insert: { username: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      resolve_tracker_username: { Args: { candidate: string }; Returns: string | null };
    };
  };
};

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function createSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;

  const store = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) store.set(name, value, options);
        } catch {
          // Proxy writes refreshed cookies when this client runs in a Server Component.
        }
      },
    },
  });
}

export async function getTrackerSession() {
  const supabase = await createSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  return userId ? { supabase, userId } : null;
}
