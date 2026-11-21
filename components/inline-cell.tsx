'use client';

import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { updateApplicationCell } from '@/app/actions';
import { limits, setupLabels, statusLabels, statuses, workSetups, type SortKey } from '@/lib/applications';

type FailedEdit = { message: string; value: string };

export function InlineCell({ jobId, label, field, value, children }: {
  jobId: string; label: string; field: SortKey; value: string | null; children: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [failure, setFailure] = useState<FailedEdit | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLInputElement>(null);
  const closed = useRef(false);
  const openPicker = useRef(false);
  const isDate = field === 'applied_on' || field === 'follow_up_on';
  const isUrl = field === 'posting_url';
  const isEditing = draft !== null;

  useLayoutEffect(() => {
    const input = editor.current;
    if (!isEditing || !input) return;

    input.focus({ preventScroll: true });
    if (!isDate) input.select();
    if (isDate && openPicker.current) {
      try {
        input.showPicker?.();
      } catch {
        // The input still exposes the browser’s calendar button.
      }
    }
  }, [isDate, isEditing]);

  function save(next: string) {
    if (saving !== null) return;
    setFailure(null);
    if (next.trim() === (value ?? '')) return;

    setSaving(next);
    startTransition(async () => {
      try {
        const result = await updateApplicationCell(jobId, field, next);
        if (result.error) setFailure({ message: result.error, value: next });
      } catch {
        setFailure({ message: 'Could not save. Try again.', value: next });
      } finally {
        setSaving(null);
      }
    });
  }

  function close(input: HTMLInputElement | null, restoreFocus = false) {
    if (closed.current) return;
    closed.current = true;

    if (!input) {
      setFailure(null);
    } else if (input.validity.badInput || input.validity.rangeOverflow) {
      setFailure({ message: 'Enter a valid date.', value: input.value });
    } else {
      save(input.value);
    }

    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
    setDraft(null);
  }

  const error = failure && <span className="cell-error" role="alert">{failure.message}</span>;
  if (field === 'status' || field === 'work_setup') {
    return <div className="inline-cell" aria-busy={saving !== null && !failure}>
      <div className="cell-choice">
        <span aria-hidden="true">{children}</span><ChevronDown size={12} aria-hidden="true" />
        <select aria-label={label} value={saving ?? value ?? ''} aria-disabled={saving !== null || undefined}
          onChange={event => save(event.target.value)}>
          {field === 'status' ? statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>) : <>
            <option value="">Not specified</option>
            {workSetups.map(setup => <option key={setup} value={setup}>{setupLabels[setup]}</option>)}
          </>}
        </select>
      </div>
      {error}
    </div>;
  }

  return <div className="inline-cell" aria-busy={saving !== null && !failure}>
    <button ref={trigger} type="button" className="cell-trigger" aria-label={label} aria-expanded={isEditing}
      aria-description={value || 'Blank'}
      tabIndex={isEditing ? -1 : undefined} aria-disabled={saving !== null || undefined}
      onClick={event => {
        if (saving !== null || isEditing) return;
        closed.current = false;
        openPicker.current = event.detail > 0;
        setDraft(failure?.value ?? value ?? '');
      }}>
      {children}
    </button>
    {isEditing && <input ref={editor} className="cell-editor" data-wide={isDate || isUrl ? (isDate ? 'date' : 'url') : undefined}
      type={isDate ? 'date' : isUrl ? 'url' : 'text'} aria-label={label} defaultValue={draft}
      max={isDate ? '9999-12-31' : undefined} maxLength={Object.hasOwn(limits, field) ? limits[field as keyof typeof limits] : undefined}
      onBlur={event => close(event.currentTarget)}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          close(event.key === 'Enter' ? event.currentTarget : null, true);
        }
      }} />}
    {error}
  </div>;
}
