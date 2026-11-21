export const statuses = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const;
export const workSetups = ['remote', 'onsite', 'hybrid'] as const;

export type Status = (typeof statuses)[number];
export type WorkSetup = (typeof workSetups)[number];

export const statusLabels: Record<Status, string> = {
  saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected',
};
export const setupLabels: Record<WorkSetup, string> = {
  remote: 'Remote', onsite: 'Onsite', hybrid: 'Hybrid',
};

export type ApplicationDetails = {
  company: string;
  role: string;
  location: string | null;
  work_setup: WorkSetup | null;
  employment_type: string | null;
  monthly_pay: string | null;
  experience: string | null;
  status: Status;
  posting_url: string | null;
  source: string | null;
  applied_on: string | null;
  follow_up_on: string | null;
  notes: string | null;
};

export type Application = ApplicationDetails & { id: string; created_at: string };
export type Filters = { query: string; status: Status | ''; setup: WorkSetup | 'unspecified' | ''; source: string };
export type SortKey = Exclude<keyof ApplicationDetails, 'notes'>;
export type Sort = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const limits = {
  company: 160, role: 160, location: 120, employment_type: 120, monthly_pay: 120,
  experience: 320, posting_url: 2048, source: 120, notes: 4000,
};

export function postingLink(value: string | null) {
  if (!value || !/^https?:\/\/[^\s/?#]+[^\s]*$/i.test(value)) return null;
  try {
    const url = new URL(value);
    return !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type ParseResult<T> = { data: T; error?: never } | { error: string; data?: never };

export function parseApplicationPatch(field: unknown, input: unknown): ParseResult<Partial<ApplicationDetails>> {
  if (typeof field !== 'string' || typeof input !== 'string') return { error: 'Invalid job field.' };
  const value = input.trim();

  if (field === 'status') {
    const status = statuses.find(option => option === value);
    return status ? { data: { status } } : { error: 'Select a valid status.' };
  }
  if (field === 'work_setup') {
    const setup = workSetups.find(option => option === value);
    return !value || setup ? { data: { work_setup: setup ?? null } } : { error: 'Select a valid work setup.' };
  }
  if (field === 'applied_on' || field === 'follow_up_on') {
    return !value || isCalendarDate(value) ? { data: { [field]: value || null } } : { error: 'Enter a valid date.' };
  }
  if (!Object.hasOwn(limits, field)) return { error: 'Invalid job field.' };
  if (value.length > limits[field as keyof typeof limits]) return { error: 'This field exceeds its character limit.' };
  if ((field === 'company' || field === 'role') && !value) return { error: 'Enter a company and role.' };
  if (field === 'posting_url' && value) {
    const url = postingLink(value);
    return url ? { data: { posting_url: url } } : { error: 'Enter a valid posting URL beginning with https:// or http://.' };
  }

  return { data: { [field]: value || null } };
}

const applicationFields = [...Object.keys(limits), 'work_setup', 'status', 'applied_on', 'follow_up_on'];

export function parseApplication(form: FormData): ParseResult<ApplicationDetails> {
  const application: Partial<ApplicationDetails> = {};
  for (const field of applicationFields) {
    const input = form.get(field);
    const parsed = parseApplicationPatch(field, typeof input === 'string' ? input : '');
    if (!parsed.data) return { error: parsed.error };
    Object.assign(application, parsed.data);
  }
  return { data: application as ApplicationDetails };
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function selectApplications<T extends ApplicationDetails>(jobs: readonly T[], filters: Filters, sort: Sort) {
  const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = jobs.filter(job => {
    if (filters.status && job.status !== filters.status) return false;
    if (filters.setup && (job.work_setup ?? 'unspecified') !== filters.setup) return false;
    if (filters.source && job.source !== filters.source) return false;

    const searchable = [job.company, job.role, job.location, job.work_setup, job.employment_type,
      job.monthly_pay, job.experience, job.status, job.source, job.notes].join(' ').toLowerCase();
    return words.every(word => searchable.includes(word));
  });

  if (!sort) return filtered;

  return filtered.sort((left, right) => {
    const a = left[sort.key];
    const b = right[sort.key];
    if (!a || !b) return Number(!a) - Number(!b);

    const order = sort.key === 'status'
      ? statuses.indexOf(left.status) - statuses.indexOf(right.status)
      : collator.compare(a, b);
    return sort.direction === 'asc' ? order : -order;
  });
}
