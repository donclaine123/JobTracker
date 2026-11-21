'use client';

import { BriefcaseBusiness, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode, type RefObject } from 'react';
import { addApplication, authenticate, claimUsername, deleteApplication, updateApplicationCell } from '@/app/actions';
import { usernameHint, usernamePattern } from '@/lib/accounts';
import { limits, setupLabels, statusLabels, statuses, workSetups, type Application } from '@/lib/applications';

function Modal({ title, description, busy, dialogRef, onClose, children }: {
  title: string; description?: string; busy: boolean; dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void; children: ReactNode;
}) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
  }, [dialogRef, title]);

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      onCancel={event => { if (busy) event.preventDefault(); }} onClose={onClose}>
      <div className="modal-header">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {description && <p id="dialog-description">{description}</p>}
        </div>
        <button type="button" className="icon-button" aria-label="Close dialog" disabled={busy}
          onClick={() => dialogRef.current?.close()}><X size={19} /></button>
      </div>
      {children}
    </dialog>
  );
}

function UsernameField() {
  return <div className="username-field">
    <label>Username
      <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
        aria-describedby="username-hint" pattern={usernamePattern} minLength={3} maxLength={24}
        required data-initial-focus placeholder="e.g. alex_lee" />
    </label>
    <span className="field-hint" id="username-hint">{usernameHint}</span>
  </div>;
}

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();
  const signingUp = mode === 'sign-up';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setResult({});
    startTransition(async () => {
      try {
        setResult(await authenticate(mode, data) ?? {});
      } catch {
        setResult({ error: 'Could not reach the tracker. Try again.' });
      }
    });
  }

  return (
    <Modal title={signingUp ? 'Create your account' : 'Sign in to your tracker'} busy={pending}
      description={signingUp ? 'Choose a username for your private job tracker.' : undefined}
      dialogRef={dialog} onClose={onClose}>
      <form className="modal-form auth-form" onSubmit={submit}>
        {signingUp ? <>
          <UsernameField />
          <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
        </> : <label>Email or username<input name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false}
          maxLength={254} required data-initial-focus placeholder="you@example.com or alex_lee" /></label>}
        <label>Password<input key={mode} name="password" type="password" required maxLength={256}
          minLength={signingUp ? 8 : undefined} autoComplete={signingUp ? 'new-password' : 'current-password'}
          placeholder={signingUp ? 'At least 8 characters' : undefined} /></label>
        {result.error && <p className="form-error" role="alert">{result.error}</p>}
        {result.message && <p className="form-success" role="status">{result.message}</p>}
        <button type="submit" className="button primary" disabled={pending}>
          {pending ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
        </button>
        <p className="auth-switch">{signingUp ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="text-button" disabled={pending}
            onClick={() => { setMode(signingUp ? 'sign-in' : 'sign-up'); setResult({}); }}>
            {signingUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </Modal>
  );
}

export function UsernameDialog({ onClose, onSave }: { onClose: () => void; onSave: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    startTransition(async () => {
      try {
        const result = await claimUsername(form);
        if (result.error) setError(result.error);
        if (result.message) {
          onSave(result.message);
          dialog.current?.close();
        }
      } catch {
        setError('Could not reach the tracker. Try again.');
      }
    });
  }

  return <Modal title="Set your username" description="Use this username or your email to sign in."
    dialogRef={dialog} onClose={onClose} busy={pending}>
    <form className="modal-form auth-form" onSubmit={submit}>
      <UsernameField />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button primary" disabled={pending}>{pending ? 'Saving…' : 'Save username'}</button>
    </form>
  </Modal>;
}

export function JobDialog({ job, onClose, onSave }: {
  job: Application | null; onClose: () => void; onSave: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(operation: () => Promise<{ message?: string; error?: string }>) {
    setError('');
    startTransition(async () => {
      try {
        const result = await operation();
        if (result.error) setError(result.error);
        if (result.message) {
          onSave(result.message);
          dialog.current?.close();
        }
      } catch {
        setError('Could not reach the tracker. Try again.');
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmDelete || pending) return;
    const data = new FormData(event.currentTarget);
    if (job) run(() => updateApplicationCell(job.id, 'notes', String(data.get('notes') ?? '')));
    else run(() => addApplication(data));
  }

  return (
    <Modal title={job ? 'Job details' : 'Add job'} description={job ? `${job.role} at ${job.company}` : 'Save an opening or add an application you’ve already started.'}
      dialogRef={dialog} onClose={onClose} busy={pending}>
      <form className="modal-form" onSubmit={submit}>
        {!job && <div className="form-grid">
          <label>Company<input name="company" placeholder="e.g. Northstar People" maxLength={limits.company} required data-initial-focus /></label>
          <label>Role<input name="role" placeholder="e.g. Talent Acquisition Associate" maxLength={limits.role} required /></label>
          <label>Location<input name="location" placeholder="e.g. Manila City" maxLength={limits.location} /></label>
          <label>Setup<select name="work_setup" defaultValue="">
            <option value="">Not specified</option>
            {workSetups.map(setup => <option key={setup} value={setup}>{setupLabels[setup]}</option>)}
          </select></label>
          <label>Employment<input name="employment_type" placeholder="e.g. Full-time" maxLength={limits.employment_type} /></label>
          <label>Monthly pay<input name="monthly_pay" placeholder="e.g. ₱35,000–45,000" maxLength={limits.monthly_pay} /></label>
          <label className="wide-field">Experience<input name="experience" placeholder="e.g. 1–2 years in recruitment" maxLength={limits.experience} /></label>
          <label>My status<select name="status" defaultValue="saved">
            {statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select></label>
          <label>Source<input name="source" placeholder="e.g. LinkedIn" maxLength={limits.source} /></label>
          <label className="wide-field">Posting URL<input name="posting_url" type="url" placeholder="https://" maxLength={limits.posting_url} /></label>
          <label>Applied on<input name="applied_on" type="date" max="9999-12-31" /></label>
          <label>Follow-up<input name="follow_up_on" type="date" max="9999-12-31" /></label>
        </div>}
        <label>Notes<textarea name="notes" rows={3} defaultValue={job?.notes ?? ''} placeholder="Recruiter details, interview notes, or next steps"
          data-initial-focus={job ? true : undefined} maxLength={limits.notes} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {confirmDelete && job ? (
          <div className="form-actions delete-confirm">
            <p>Permanently delete this job?</p>
            <button type="button" className="button secondary" disabled={pending} autoFocus onClick={() => setConfirmDelete(false)}>Keep job</button>
            <button type="button" className="button danger" disabled={pending} onClick={() => run(() => deleteApplication(job.id))}>
              {pending ? 'Deleting…' : 'Delete job'}
            </button>
          </div>
        ) : (
          <div className="form-actions">
            {job && <button type="button" className="button destructive-text" disabled={pending}
              onClick={() => { setError(''); setConfirmDelete(true); }}><Trash2 size={16} /> Delete</button>}
            <button type="button" className="button secondary push-right" disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button>
            <button type="submit" className="button primary" disabled={pending}>
              <BriefcaseBusiness size={16} /> {pending ? 'Saving…' : job ? 'Save notes' : 'Add job'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
