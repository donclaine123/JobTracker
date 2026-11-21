import type { Application, ApplicationDetails } from './applications';

type DemoRow = [
  company: string, role: string, location: string, setup: ApplicationDetails['work_setup'],
  employment: string, pay: string | null, experience: string, status: ApplicationDetails['status'],
  source: string, applied?: string, followUp?: string,
];

const rows: DemoRow[] = [
  ['Northstar People', 'Talent Acquisition Associate', 'Philippines', 'remote', 'Full-time', 'US$800–1,200', '0–2 years. New graduates welcome.', 'saved', 'Indeed'],
  ['Juniper Studio', 'Junior HR Associate', 'Philippines', 'remote', 'Full-time', '₱28,000 + allowance', '6+ months in an HR role', 'applied', 'Greenhouse', '2026-11-17', '2026-11-24'],
  ['Mosaic Retail', 'Recruitment Associate', 'Quezon City', 'onsite', 'Project-based', null, '6 months–1 year in sourcing', 'saved', 'LinkedIn'],
  ['Harborline Systems', 'HR Associate, Recruitment', 'Pasig City', null, 'Full-time', null, '1 year preferred', 'saved', 'JobStreet'],
  ['Evergreen Data', 'Talent Acquisition Specialist', 'Philippines', 'remote', 'Full-time', '₱32,000–42,000', 'Entry-level and experienced openings', 'interview', 'Indeed', '2026-11-14', '2026-11-22'],
  ['Kestrel Advisory', 'Talent Acquisition Consultant', 'Makati City', 'hybrid', 'Full-time', null, 'Full-cycle recruiting experience', 'saved', 'JobStreet'],
  ['Lumen Talent', 'Recruitment Consultant', 'Manila City', 'remote', 'Full-time', '₱60,000–80,000', 'Staffing or agency experience', 'saved', 'LinkedIn'],
  ['Cloverworks', 'Talent Sourcer', 'Taguig City', 'remote', 'Full-time', '₱30,000–45,000', '1–3 years in technical sourcing', 'saved', 'JobStreet'],
  ['Meridian Search', 'Talent Acquisition Executive', 'Manila City', 'remote', 'Full-time', 'USD base + bonus', '1–3 years in recruitment', 'applied', 'JobStreet', '2026-11-18', '2026-11-25'],
  ['Orbit Partners', 'Technical Recruiter', 'Pasig City', 'hybrid', 'Full-time', null, '1+ years in IT recruitment', 'saved', 'LinkedIn'],
  ['Aster Services', 'HR Recruiter', 'Philippines', 'remote', 'Full-time', null, 'Entry-level applicants welcome', 'saved', 'Indeed'],
  ['Willow Contact', 'Talent Acquisition Partner', 'Quezon City', 'onsite', 'Full-time', null, 'BPO experience preferred', 'saved', 'JobStreet'],
];

export const demoApplications: Application[] = rows.map((row, index) => {
  const [company, role, location, work_setup, employment_type, monthly_pay, experience, status, source, applied, followUp] = row;
  return {
    id: `sample-${index}`, created_at: '2026-11-19T00:00:00Z', company, role, location,
    work_setup, employment_type, monthly_pay, experience, status, source,
    applied_on: applied ?? null, follow_up_on: followUp ?? null, posting_url: null, notes: null,
  };
});
