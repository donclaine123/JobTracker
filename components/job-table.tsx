'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown, Ellipsis, ExternalLink, Pencil } from 'lucide-react';
import { memo } from 'react';
import { postingLink, setupLabels, statusLabels, type Application, type CellEdit, type Sort, type SortKey } from '@/lib/applications';
import { InlineCell } from './inline-cell';

const columns: { key: SortKey; label: string; width: number }[] = [
  { key: 'company', label: 'Company', width: 128 },
  { key: 'role', label: 'Role', width: 138 },
  { key: 'location', label: 'Location', width: 102 },
  { key: 'work_setup', label: 'Setup', width: 124 },
  { key: 'employment_type', label: 'Employment', width: 104 },
  { key: 'monthly_pay', label: 'Monthly pay', width: 124 },
  { key: 'experience', label: 'Experience', width: 200 },
  { key: 'status', label: 'My status', width: 102 },
  { key: 'posting_url', label: 'Posting', width: 88 },
  { key: 'source', label: 'Source', width: 80 },
  { key: 'applied_on', label: 'Applied on', width: 86 },
  { key: 'follow_up_on', label: 'Follow-up', width: 88 },
];
const actionsWidth = 52;
const columnsWidth = columns.reduce((width, column) => width + column.width, 0);

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

type EditProps = {
  edits: ReadonlyMap<string, CellEdit>;
  onSaveCell: (id: string, field: SortKey, value: string) => void;
  onDiscardCell: (id: string, field: SortKey) => void;
};

function TableCell({ job, column, editable, edits, onSaveCell, onDiscardCell }: EditProps & {
  job: Application; column: (typeof columns)[number]; editable: boolean;
}) {
  const { key: field, label } = column;
  const value = job[field];
  const url = field === 'posting_url' ? postingLink(value) : null;
  const editLabel = `Edit ${field === 'posting_url' ? 'posting URL' : label.toLowerCase()} for ${job.company}`;
  const posting = url && <a className="posting-link" href={url} target="_blank" rel="noopener noreferrer"
    aria-label={`Open posting for ${job.role} at ${job.company} in a new tab`}>
    {editable ? 'Open' : 'Open posting'} <ExternalLink size={12} aria-hidden="true" />
  </a>;
  const display = field === 'posting_url' ? posting || <span className="dash">—</span> : <JobValue job={job} field={field} />;
  const content = editable ? <InlineCell field={field} label={editLabel} value={value} edit={edits.get(`${job.id}:${field}`)}
    onSave={next => onSaveCell(job.id, field, next)} onDiscard={() => onDiscardCell(job.id, field)}>
    {url ? <Pencil size={14} aria-hidden="true" /> : display}
  </InlineCell> : display;

  if (field === 'company') return <th scope="row" role="rowheader">{content}</th>;

  const cellClass = field === 'monthly_pay' && value ? 'pay-cell' : cellClasses[field];
  return <td className={cellClass} role="cell">
    {editable && posting ? <div className="posting-actions">{posting}{content}</div> : content}
  </td>;
}

export const JobTable = memo(function JobTable({ jobs, sort, onSort, onDetails, ...editing }: EditProps & {
  jobs: Application[]; sort: Sort; onSort: (key: SortKey) => void; onDetails?: (job: Application) => void;
}) {
  return (
    <>
    <p id="table-scroll-hint" className="table-scroll-hint">Swipe or scroll sideways to see all columns.</p>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Job applications table" aria-describedby="table-scroll-hint">
      <table className="job-table" role="table" style={{ minWidth: columnsWidth + (onDetails ? actionsWidth : 0) }}>
        <colgroup>{columns.map(column => <col key={column.key} style={{ width: column.width }} />)}
          {onDetails && <col style={{ width: actionsWidth }} />}
        </colgroup>
        <thead role="rowgroup">
          <tr role="row">{columns.map(column => {
            const direction = sort?.key === column.key ? sort.direction : null;
            const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown;
            return <th key={column.key} scope="col" aria-sort={direction ? direction === 'asc' ? 'ascending' : 'descending' : undefined}>
              <button type="button" className="column-sort" onClick={() => onSort(column.key)}>
                <span>{column.label}</span><SortIcon size={12} aria-hidden="true" />
              </button>
            </th>;
          })}
            {onDetails && <th scope="col" aria-label="Job details" />}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {jobs.map(job => <tr key={job.id} role="row">
            {columns.map(column => <TableCell key={column.key} job={job} column={column} editable={Boolean(onDetails)} {...editing} />)}
            {onDetails && <td className="job-actions-cell" role="cell">
              <button type="button" className="icon-button" title="Job details" aria-label={`Job details for ${job.role} at ${job.company}`}
                onClick={() => onDetails(job)}><Ellipsis size={17} aria-hidden="true" /></button>
            </td>}
          </tr>)}
        </tbody>
      </table>
    </div>
    </>
  );
});
