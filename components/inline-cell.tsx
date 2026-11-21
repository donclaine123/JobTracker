'use client';

import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { limits, setupLabels, statusLabels, statuses, workSetups, type CellEdit, type SortKey } from '@/lib/applications';

type FailedEdit = { message: string; value: string };

export function InlineCell({ label, field, value, edit, onSave, onDiscard, children }: {
  label: string; field: SortKey; value: string | null; edit?: CellEdit;
  onSave: (value: string) => void; onDiscard: () => void; children: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [dateError, setDateError] = useState<FailedEdit | null>(null);
  const failure = dateError ?? (edit?.error ? edit : null);
  const saving = Boolean(edit?.fields);
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
    if (saving) return;
    setDateError(null);
    if (next.trim() === (value ?? '')) onDiscard();
    else onSave(next);
  }

  function close(input: HTMLInputElement | null, restoreFocus = false) {
    if (closed.current) return;
    closed.current = true;

    if (!input) {
      setDateError(null);
      onDiscard();
    } else if (input.validity.badInput || input.validity.rangeOverflow) {
      setDateError({ message: 'Enter a valid date.', value: input.value });
    } else {
      save(input.value);
    }

    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
    setDraft(null);
  }

  const message = dateError?.message ?? edit?.error;
  const error = message && <span className="cell-error" role="alert">{message}</span>;
  if (field === 'status' || field === 'work_setup') {
    return <div className="inline-cell" aria-busy={saving}>
      <div className="cell-choice">
        <span aria-hidden="true">{children}</span><ChevronDown size={12} aria-hidden="true" />
        <select aria-label={label} value={value ?? ''} aria-disabled={saving || undefined}
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

  return <div className="inline-cell" aria-busy={saving}>
    <button ref={trigger} type="button" className="cell-trigger" aria-label={label} aria-expanded={isEditing}
      aria-description={value || 'Blank'}
      tabIndex={isEditing ? -1 : undefined} aria-disabled={saving || undefined}
      onClick={event => {
        if (saving || isEditing) return;
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
