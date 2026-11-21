'use client';

import { AtSign, BriefcaseBusiness, Check, CircleAlert, ListFilter, LogIn, LogOut, Plus, Search, X } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { signOut, updateApplicationCell } from '@/app/actions';
import { applyJobChange, parseApplicationPatch, selectApplications, setupLabels, statusLabels, statuses, workSetups, type Application, type CellEdit, type Filters, type JobChange, type Sort, type SortKey } from '@/lib/applications';
import { AuthDialog, JobDialog, UsernameDialog } from './dialogs';
import { JobTable } from './job-table';

const emptyFilters: Filters = { query: '', status: '', setup: '', source: '' };
const addedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function Tracker({ jobs: initialJobs, demo = false, loadFailed = false, confirmationFailed = false, canSetUsername = false }: {
  jobs: Application[]; demo?: boolean; loadFailed?: boolean; confirmationFailed?: boolean; canSetUsername?: boolean;
}) {
  const [savedJobs, setSavedJobs] = useState(initialJobs);
  const [edits, setEdits] = useState<ReadonlyMap<string, CellEdit>>(() => new Map());
  const savingCells = useRef(new Set<string>());
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<Sort>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dialog, setDialog] = useState<'auth' | 'new' | 'username' | Application | null>(null);
  const [notice, setNotice] = useState('');
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, startSignOut] = useTransition();
  const searchButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showSearch) searchInput.current?.focus(); }, [showSearch]);

  const { status, setup, source } = filters;
  const query = useDeferredValue(filters.query);
  const jobs = useMemo(() => {
    let visible = savedJobs;
    for (const edit of edits.values()) {
      if (edit.fields) visible = applyJobChange(visible, { kind: 'update', id: edit.id, fields: edit.fields });
    }
    return visible;
  }, [savedJobs, edits]);
  const activeFilters = [status, setup, source].filter(Boolean).length;
  const filtered = useMemo(() => selectApplications(jobs, { query, status, setup, source }, sort), [jobs, query, status, setup, source, sort]);
  const sources = useMemo(() => [...new Set([source, ...jobs.map(job => job.source)])]
    .filter((value): value is string => Boolean(value)).sort(), [jobs, source]);
  const counts = useMemo(() => {
    const counts = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    for (const job of jobs) counts[job.status]++;
    return counts;
  }, [jobs]);
  const hiddenError = [...edits.values()].find(edit => edit.error && !filtered.some(job => job.id === edit.id));

  const clearEdit = useCallback((id: string, field: SortKey) => {
    const key = `${id}:${field}`;
    setEdits(previous => {
      if (!previous.has(key)) return previous;
      const next = new Map(previous);
      next.delete(key);
      return next;
    });
  }, []);

  const saveCell = useCallback(async (id: string, field: SortKey, value: string) => {
    const key = `${id}:${field}`;
    if (savingCells.current.has(key)) return;

    const parsed = parseApplicationPatch(field, value);
    if (!parsed.data) {
      setEdits(previous => new Map(previous).set(key, { id, value, error: parsed.error }));
      return;
    }

    const fields = parsed.data;
    savingCells.current.add(key);
    setEdits(previous => new Map(previous).set(key, { id, fields }));
    function fail(error: string) {
      setEdits(previous => previous.has(key) ? new Map(previous).set(key, { id, value, error }) : previous);
    }

    try {
      const result = await updateApplicationCell(id, field, value);
      if (result.change) {
        const change = result.change;
        setSavedJobs(previous => applyJobChange(previous, change));
        clearEdit(id, field);
      } else {
        fail(result.error);
      }
    } catch {
      fail('Could not save. Try again.');
    } finally {
      savingCells.current.delete(key);
    }
  }, [clearEdit]);

  function saveJob(change: JobChange, message: string) {
    setSavedJobs(previous => applyJobChange(previous, change));
    if (change.kind === 'delete') {
      setEdits(previous => new Map([...previous].filter(([, edit]) => edit.id !== change.id)));
    }
    setNotice(message);
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(previous => ({ ...previous, [key]: value }));
  }

  const changeSort = useCallback((key: SortKey) => {
    setSort(previous => {
      if (previous?.key !== key) return { key, direction: 'asc' };
      return previous.direction === 'asc' ? { key, direction: 'desc' } : null;
    });
  }, []);

  function closeSearch() {
    setFilter('query', '');
    setShowSearch(false);
    searchButton.current?.focus();
  }

  function addJob() { setDialog(demo ? 'auth' : 'new'); }

  function leaveTracker() {
    setSignOutError('');
    startSignOut(async () => {
      try {
        const result = await signOut();
        if (result?.error) setSignOutError(result.error);
      } catch {
        setSignOutError('Could not sign out. Try again.');
      }
    });
  }

  return (
    <main className="page-shell">
      <header className="tracker-header">
        <div className="header-row">
          <div className="tracker-identity">
            <div className="app-mark"><BriefcaseBusiness size={23} strokeWidth={1.75} aria-hidden="true" /></div>
            <div>
              <h1>JobTracker</h1>
              <p className="tracker-meta">{loadFailed ? 'Your job applications' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} tracked`}
                {demo && <span className="sample-label">Sample data</span>}
              </p>
            </div>
          </div>
          <div className="tracker-controls">
            <button type="button" className="button quiet" aria-expanded={showFilters} aria-controls={showFilters ? 'job-filters' : undefined}
              onClick={() => setShowFilters(!showFilters)}><ListFilter size={16} /> Filter
              {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
            </button>
            <button type="button" ref={searchButton} className="button quiet" aria-expanded={showSearch} aria-controls={showSearch ? 'job-search' : undefined}
              onClick={() => showSearch ? closeSearch() : setShowSearch(true)}><Search size={16} /> Search</button>
            <button type="button" className="button primary" onClick={addJob}><Plus size={17} /> Add Job</button>
            <div className="account-control">
              {canSetUsername && <button type="button" className="button account-button" onClick={() => setDialog('username')}>
                <AtSign size={16} /> Set username
              </button>}
              {demo ? <button type="button" className="button account-button" onClick={() => setDialog('auth')}><LogIn size={16} /> Sign in</button>
                : <button type="button" className="button account-button" disabled={signingOut} onClick={leaveTracker}><LogOut size={16} /> Sign out</button>}
            </div>
          </div>
        </div>

        {!loadFailed && <div className="status-row" role="group" aria-label="Filter by application status">
          {statuses.map(status => <button type="button" className="status-filter" key={status}
            aria-pressed={filters.status === status} onClick={() => setFilter('status', filters.status === status ? '' : status)}>
            <span className="status-dot" data-status={status} aria-hidden="true" />
            {statusLabels[status]} <span className="status-count">{counts[status]}</span>
          </button>)}
        </div>}
      </header>

      {confirmationFailed && <p className="notice error-notice" role="alert"><CircleAlert size={16} /> This confirmation link could not be verified. Open the latest link in the browser where you signed up.</p>}
      {signOutError && <p className="notice error-notice" role="alert"><CircleAlert size={16} /> {signOutError}</p>}
      {hiddenError && <p className="notice error-notice" role="alert"><CircleAlert size={16} /> {hiddenError.error}</p>}
      {notice && <div className="notice success-notice">
        <p role="status"><Check size={16} /> {notice}</p>
        <button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button>
      </div>}

      {(showSearch || showFilters) && <div className="refine-panel">
        {showSearch && <div className="search-box" id="job-search">
          <Search size={18} aria-hidden="true" />
          <input ref={searchInput} type="search" aria-label="Search jobs" placeholder="Search jobs by company, role, or keyword…"
            value={filters.query} onChange={event => setFilter('query', event.target.value)}
            onKeyDown={event => { if (event.key === 'Escape') closeSearch(); }} />
          <button type="button" className="icon-button" aria-label="Close search" onClick={closeSearch}><X size={16} /></button>
        </div>}
        {showFilters && <div className="filter-panel" id="job-filters">
          <label>Status<select value={filters.status} onChange={event => setFilter('status', event.target.value as Filters['status'])}>
            <option value="">All statuses</option>
            {statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select></label>
          <label>Setup<select value={filters.setup} onChange={event => setFilter('setup', event.target.value as Filters['setup'])}>
            <option value="">All setups</option><option value="unspecified">Not specified</option>
            {workSetups.map(setup => <option key={setup} value={setup}>{setupLabels[setup]}</option>)}
          </select></label>
          <label>Source<select value={filters.source} onChange={event => setFilter('source', event.target.value)}>
            <option value="">All sources</option>
            {sources.map(source => <option key={source} value={source}>{source}</option>)}
          </select></label>
          <button type="button" className="button secondary" disabled={!activeFilters} onClick={() => setFilters({ ...emptyFilters, query: filters.query })}>Reset filters</button>
        </div>}
      </div>}

      <section className="table-card" aria-label="Application list" aria-busy={query !== filters.query}>
        {loadFailed ? <div className="empty-state">
          <div className="empty-icon"><CircleAlert size={24} aria-hidden="true" /></div>
          <h2>Couldn’t load your jobs</h2><p>Refresh the tracker to try again.</p>
          <a className="button secondary" href="/">Reload tracker</a>
        </div> : filtered.length ? <>
          {!demo && <p className="edit-hint">Click a cell to edit. Enter or Tab saves. Esc cancels.</p>}
          <JobTable jobs={filtered} edits={edits} onSaveCell={saveCell} onDiscardCell={clearEdit} sort={sort}
            onSort={changeSort} onDetails={demo ? undefined : setDialog} />
        </>
          : <div className="empty-state">
            <div className="empty-icon">{jobs.length ? <Search size={23} aria-hidden="true" /> : <BriefcaseBusiness size={24} aria-hidden="true" />}</div>
            <h2>{jobs.length ? 'No matching jobs' : 'No jobs yet'}</h2>
            <p>{jobs.length ? 'Try another search or clear the filters.' : 'Add a job to track its status and follow-up date.'}</p>
            {jobs.length ? <button type="button" className="button secondary" onClick={() => setFilters(emptyFilters)}>Clear search and filters</button>
              : <button type="button" className="button primary" onClick={addJob}><Plus size={17} /> Add Job</button>}
          </div>}
      </section>

      {!loadFailed && <footer className="tracker-footer">
        <span aria-live="polite">Showing {filtered.length} of {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span>
        {jobs.length > 0 && <span>Last added <time dateTime={jobs[0].created_at}>{addedDate.format(new Date(jobs[0].created_at))}</time></span>}
      </footer>}

      {demo && dialog === 'auth' && <AuthDialog onClose={() => setDialog(null)} />}
      {!demo && dialog === 'username' && <UsernameDialog onClose={() => setDialog(null)} onSave={setNotice} />}
      {!demo && dialog && dialog !== 'auth' && dialog !== 'username' && <JobDialog job={dialog === 'new' ? null : dialog}
        onClose={() => setDialog(null)} onSave={saveJob} />}
    </main>
  );
}
