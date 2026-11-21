import { Tracker } from '@/components/tracker';
import type { Application } from '@/lib/applications';
import { demoApplications } from '@/lib/demo';
import { getTrackerSession } from '@/lib/supabase';

const columns = 'id, company, role, location, work_setup, employment_type, monthly_pay, experience, status, posting_url, source, applied_on, follow_up_on, notes, created_at';

export default async function Home({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const { confirmation } = await searchParams;
  const session = await getTrackerSession();

  if (!session) {
    return <Tracker key="demo" jobs={demoApplications} demo confirmationFailed={confirmation === 'failed'} />;
  }

  const jobs: Application[] = [];
  const batchSize = 500;

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await session.supabase.from('applications').select(columns)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) return <Tracker key="private" jobs={[]} loadFailed />;
    jobs.push(...data);
    if (data.length < batchSize) break;
  }

  const username = process.env.SUPABASE_SECRET_KEY
    ? await session.supabase.from('account_usernames').select('username').eq('user_id', session.userId).maybeSingle()
    : null;

  return <Tracker key="private" jobs={jobs} canSetUsername={Boolean(username && !username.data && !username.error)} />;
}
