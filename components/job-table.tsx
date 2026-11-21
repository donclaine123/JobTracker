'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown, Ellipsis, ExternalLink, Pencil } from 'lucide-react';
import { postingLink, setupLabels, statusLabels, type Application, type Sort, type SortKey } from '@/lib/applications';
import { InlineCell } from './inline-cell';

const columns: { key: SortKey; label: string; width: string }[] = [
  { key: 'company', label: 'Company', width: '10.75%' },
  { key: 'role', label: 'Role', width: '11.25%' },
  { key: 'location', label: 'Location', width: '7.75%' },
  { key: 'work_setup', label: 'Setup', width: '7%' },
  { key: 'employment_type', label: 'Employment', width: '8.5%' },
  { key: 'monthly_pay', label: 'Monthly pay', width: '8%' },
  { key: 'experience', label: 'Experience', width: '11.5%' },
  { key: 'status', label: 'My status', width: '7.5%' },
  { key: 'posting_url', label: 'Posting', width: '7%' },
  { key: 'source', label: 'Source', width: '8.25%' },
  { key: 'applied_on', label: 'Applied on', width: '6.25%' },
  { key: 'follow_up_on', label: 'Follow-up', width: '6.25%' },
];

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const cellClasses: Partial<Record<SortKey, string>> = {
  role: 'role-cell', experience: 'experience-cell', applied_on: 'date-cell', follow_up_on: 'date-cell',
};

function JobValue({ job, field }: { job: Application; field: SortKey }) {
  if (field === 'status') return <span className="chip" data-status={job.status}>{statusLabels[job.status]}</span>;
  if (field === 'work_setup') return <span className="chip" data-setup={job.work_setup ?? 'unspecified'}>
    {job.work_setup ? setupLabels[job.work_setup] : 'Not specified'}
  </span>;

  const value = job[field];
  if (!value) return field === 'monthly_pay' ? 'Not listed' : <span className="dash">—</span>;
  if (field === 'applied_on' || field === 'follow_up_on') {
    const date = new Date(value);
    return <time dateTime={value} title={value}>{Number.isNaN(date.getTime()) ? value : shortDate.format(date)}</time>;
  }
  return value;
}

function TableCell({ job, column, editable }: { job: Application; column: (typeof columns)[number]; editable: boolean }) {
  const { key: field, label } = column;
  const value = job[field];
  const url = field === 'posting_url' ? postingLink(value) : null;
  const editLabel = `Edit ${field === 'posting_url' ? 'posting URL' : label.toLowerCase()} for ${job.company}`;
  const posting = url && <a className="posting-link" href={url} target="_blank" rel="noopener noreferrer"
    aria-label={`Open posting for ${job.role} at ${job.company} in a new tab`}>
    {editable ? 'Open' : 'Open posting'} <ExternalLink size={12} aria-hidden="true" />
  </a>;
  const display = field === 'posting_url' ? posting || <span className="dash">—</span> : <JobValue job={job} field={field} />;
  const content = editable ? <InlineCell jobId={job.id} field={field} label={editLabel} value={value}>
    {url ? <Pencil size={14} aria-hidden="true" /> : display}
  </InlineCell> : display;

  if (field === 'company') return <th scope="row">{content}</th>;

  const cellClass = field === 'monthly_pay' && value ? 'pay-cell' : cellClasses[field];
  return <td className={cellClass}>
    {editable && posting ? <div className="posting-actions">{posting}{content}</div> : content}
  </td>;
}

export function JobTable({ jobs, sort, onSort, onDetails }: {
  jobs: Application[]; sort: Sort; onSort: (key: SortKey) => void; onDetails?: (job: Application) => void;
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Job applications table">
      <table className="job-table">
        <colgroup>{columns.map(column => <col key={column.key} style={{ width: column.width }} />)}
          {onDetails && <col style={{ width: '40px' }} />}
        </colgroup>
        <thead>
          <tr>{columns.map(column => {
            const direction = sort?.key === column.key ? sort.direction : null;
            const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown;
            return <th key={column.key} scope="col" aria-sort={direction ? direction === 'asc' ? 'ascending' : 'descending' : undefined}>
              <button type="button" className="column-sort" onClick={() => onSort(column.key)}>
                <span>{column.label}</span><SortIcon size={12} aria-hidden="true" />
              </button>
            </th>;
          })}
            {onDetails && <th scope="col"><span className="sr-only">Job details</span></th>}
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => <tr key={job.id}>
            {columns.map(column => <TableCell key={column.key} job={job} column={column} editable={Boolean(onDetails)} />)}
            {onDetails && <td className="job-actions-cell">
              <button type="button" className="icon-button" title="Job details" aria-label={`Job details for ${job.role} at ${job.company}`}
                onClick={() => onDetails(job)}><Ellipsis size={17} aria-hidden="true" /></button>
            </td>}
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}
