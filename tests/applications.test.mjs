import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseApplication, parseApplicationPatch, selectApplications } from '../lib/applications.ts';

const form = (fields) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

test('application fields preserve mixed pay, optional blanks and calendar dates', () => {
  const result = parseApplication(form({
    company: ' Example Co ', role: 'Recruiter', monthly_pay: '₱45,000 + allowance',
    status: 'interview', applied_on: '2028-02-29', posting_url: 'https://example.com/jobs/42',
  }));
  assert.equal(result.data.company, 'Example Co');
  assert.equal(result.data.monthly_pay, '₱45,000 + allowance');
  assert.equal(result.data.follow_up_on, null);
  assert.equal(result.data.applied_on, '2028-02-29');
});

test('application fields reject invalid statuses, real-date errors and unsafe links', () => {
  for (const [key, value] of Object.entries({
    status: 'hired', work_setup: 'flex', applied_on: '2026-02-29',
    posting_url: 'javascript:alert(1)', company: ' ',
  })) {
    const input = { company: 'Example Co', role: 'Recruiter', status: 'saved', [key]: value };
    assert.equal(typeof parseApplication(form(input)).error, 'string', key);
  }
});

test('inline edits save only the selected column and can clear optional fields', () => {
  assert.deepEqual(parseApplicationPatch('company', ' Example Co '), { data: { company: 'Example Co' } });
  assert.deepEqual(parseApplicationPatch('status', 'offer'), { data: { status: 'offer' } });
  assert.deepEqual(parseApplicationPatch('work_setup', ''), { data: { work_setup: null } });
  assert.deepEqual(parseApplicationPatch('applied_on', '2028-02-29'), { data: { applied_on: '2028-02-29' } });
  assert.deepEqual(parseApplicationPatch('follow_up_on', ''), { data: { follow_up_on: null } });
  assert.deepEqual(parseApplicationPatch('posting_url', 'https://example.com'), { data: { posting_url: 'https://example.com/' } });
});

test('inline edits enforce the same field rules and reject edits to ownership', () => {
  for (const [key, value] of Object.entries({
    user_id: 'someone-else', created_at: '2026-12-01',
    company: ' ', status: 'hired', work_setup: 'flex', follow_up_on: '2026-02-29',
    posting_url: 'javascript:alert(1)', role: 'x'.repeat(161),
  })) {
    assert.equal(typeof parseApplicationPatch(key, value).error, 'string', key);
  }
  assert.equal(typeof parseApplicationPatch('__proto__', 'x').error, 'string');
});

test('search and filters combine, with dates sorted and missing values always last', () => {
  const jobs = [
    { id: '1', company: 'Evergreen', role: 'Recruiter', work_setup: 'remote', status: 'saved', applied_on: null },
    { id: '2', company: 'Oriel', role: 'Recruiter', work_setup: 'remote', status: 'saved', applied_on: '2026-10-01' },
    { id: '3', company: 'Juniper', role: 'Senior Recruiter', work_setup: 'remote', status: 'saved', applied_on: '2026-09-01' },
    { id: '4', company: 'Northstar', role: 'Recruiter', work_setup: 'hybrid', status: 'saved', applied_on: '2026-08-01' },
    { id: '5', company: 'Aster', role: 'Engineer', work_setup: 'remote', status: 'saved', applied_on: '2026-07-01' },
    { id: '6', company: 'Meridian', role: 'Recruiter', work_setup: 'remote', status: 'offer', applied_on: '2026-06-01' },
  ];
  const filters = { query: ' RECRUITER ', status: 'saved', setup: 'remote' };
  const sort = { key: 'applied_on', direction: 'desc' };
  assert.deepEqual(selectApplications(jobs, filters, sort).map(job => job.id), ['2', '3', '1']);
  assert.deepEqual(selectApplications(jobs, filters, { ...sort, direction: 'asc' }).map(job => job.id), ['3', '2', '1']);
});
