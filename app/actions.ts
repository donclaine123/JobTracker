'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { normalizeUsername, readLoginIdentifier, usernameHint } from '@/lib/accounts';
import { parseApplication, parseApplicationPatch } from '@/lib/applications';
import { createSupabase, getTrackerSession, supabaseUrl, type Database } from '@/lib/supabase';

const applicationId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function addApplication(form: FormData) {
  const session = await getTrackerSession();
  if (!session) return { error: 'Sign in again to add this job.' };

  const parsed = parseApplication(form);
  if (!parsed.data) return { error: parsed.error };

  const { data, error } = await session.supabase.from('applications').insert(parsed.data).select('id').maybeSingle();
  if (error || !data) return { error: 'The job could not be saved. Try again.' };

  revalidatePath('/');
  return { message: 'Job added.' };
}

export async function updateApplicationCell(id: string, field: string, value: string) {
  const session = await getTrackerSession();
  if (!session) return { error: 'Sign in again to save this change.' };
  if (typeof id !== 'string' || !applicationId.test(id)) return { error: 'This job could not be found.' };

  const parsed = parseApplicationPatch(field, value);
  if (!parsed.data) return { error: parsed.error };

  const { data, error } = await session.supabase.from('applications')
    .update(parsed.data).eq('id', id).eq('user_id', session.userId).select('id').maybeSingle();
  if (error) return { error: 'This change could not be saved. Try again.' };
  if (!data) return { error: 'This job could not be found. Refresh the tracker and try again.' };

  revalidatePath('/');
  return { message: 'Change saved.' };
}

export async function deleteApplication(id: string) {
  const session = await getTrackerSession();
  if (!session) return { error: 'Sign in again to delete this job.' };
  if (!applicationId.test(id)) return { error: 'This job could not be found.' };

  const { data, error } = await session.supabase.from('applications')
    .delete().eq('id', id).eq('user_id', session.userId).select('id').maybeSingle();
  if (error || !data) return { error: 'The job could not be deleted. Refresh the tracker and try again.' };

  revalidatePath('/');
  return { message: 'Job deleted.' };
}

async function lookupUsername(username: string) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !key) return { data: null, error: true };

  const admin = createClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin.rpc('resolve_tracker_username', { candidate: username });
}

const invalidSignIn = 'Could not sign in. Check your email or username and password.';
const rateLimit = 'Too many attempts. Try again in a few minutes.';

export async function authenticate(mode: 'sign-in' | 'sign-up', form: FormData) {
  const supabase = await createSupabase();
  if (!supabase) return { error: 'The tracker is missing its Supabase configuration.' };

  const password = form.get('password');
  if (typeof password !== 'string' || !password) return { error: 'Enter your password.' };

  if (mode === 'sign-up') {
    const email = readLoginIdentifier(form.get('email'));
    const username = normalizeUsername(form.get('username'));
    if (email?.kind !== 'email') return { error: 'Enter your email address.' };
    if (!username) return { error: usernameHint };
    if (password.length < 8) return { error: 'Use at least 8 characters for your password.' };

    const lookup = await lookupUsername(username);
    if (lookup.error) return { error: 'Username signup is temporarily unavailable. Try again later.' };
    if (lookup.data) return { error: 'That username is already taken.' };

    const origin = (await headers()).get('origin');
    const { data, error } = await supabase.auth.signUp({
      email: email.value, password,
      options: {
        data: { username },
        emailRedirectTo: origin ? new URL('/auth/callback', origin).href : undefined,
      },
    });

    if (error) return { error: error.status === 429 ? rateLimit : 'Could not create an account. Check your details or try signing in.' };
    if (!data.session) return { message: 'Check your email to confirm your account.' };
  } else {
    const identifier = readLoginIdentifier(form.get('identifier'));
    if (!identifier) return { error: invalidSignIn };

    let email = identifier.value;
    if (identifier.kind === 'username') {
      const lookup = await lookupUsername(identifier.value);
      if (lookup.error) return { error: 'Username sign-in is temporarily unavailable. Sign in with your email.' };
      if (!lookup.data) return { error: invalidSignIn };
      email = lookup.data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.status === 429 ? rateLimit : invalidSignIn };
  }

  redirect('/');
}

export async function claimUsername(form: FormData) {
  const session = await getTrackerSession();
  if (!session) return { error: 'Sign in again to set your username.' };

  const username = normalizeUsername(form.get('username'));
  if (!username) return { error: usernameHint };

  const { error } = await session.supabase.from('account_usernames').insert({ username });
  if (error?.code === '23505') return { error: 'That username is unavailable. Choose another.' };
  if (error) return { error: 'Could not set your username. Try again.' };

  revalidatePath('/');
  return { message: 'Username saved.' };
}

export async function signOut() {
  const supabase = await createSupabase();
  const result = await supabase?.auth.signOut({ scope: 'local' });
  if (result?.error) return { error: 'Could not sign out. Try again.' };
  redirect('/');
}
