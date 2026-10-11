'use client';

import { useState, useTransition } from 'react';
import {
  reassignProjectClient,
  reassignProjectPm,
} from '@/lib/server-actions/projects';

interface Candidate {
  user_id: string;
  full_name: string;
}

interface AssignableProject {
  id: string;
  name: string;
  status: string;
}

/**
 * "Assign to a project" control for a client who isn't on a given project yet.
 * Lives on each client row in Team so an owner/PM can attach a freshly-joined
 * client to one of their projects without hunting through the warnings box.
 * Sets `projects.client_id` via the same reassignProjectClient action.
 */
export function AssignClientControl({
  clientUserId,
  projects,
}: {
  clientUserId: string;
  projects: AssignableProject[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(projects[0]?.id ?? '');

  if (projects.length === 0) {
    return (
      <span className="text-[11px] italic text-ink-muted">
        No other projects to assign — create one first.
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-canvas"
      >
        + Assign to a project
      </button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reassignProjectClient({
        project_id: selected,
        new_client_user_id: clientUserId,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      setOpen(false);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-hairline bg-white px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.status && p.status !== 'active'
              ? ` (${p.status.replace('_', ' ')})`
              : ''}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !selected}
        className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Assigning…' : 'Assign'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="rounded-lg border border-hairline px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-canvas"
      >
        Cancel
      </button>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </form>
  );
}

/**
 * Inline reassign control. Used inside both Team members (PM rows) and
 * Clients sections. Click "Reassign", pick a different user from the
 * dropdown, save. Optimistic UI: button → dropdown → button.
 */
export function ReassignControl({
  kind,
  projectId,
  currentUserId,
  candidates,
}: {
  kind: 'pm' | 'client';
  projectId: string;
  currentUserId: string;
  candidates: Candidate[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filter to "other people" — picking your current self in a reassign
  // dropdown is a no-op and adds clutter.
  const others = candidates.filter((c) => c.user_id !== currentUserId);

  // Default the selection to the first OTHER candidate so the visible
  // dropdown value and the underlying state agree. (If we default to
  // currentUserId, the select renders the first <option> but `selected`
  // stays equal to currentUserId, leaving Save permanently disabled.)
  const [selected, setSelected] = useState<string>(
    others[0]?.user_id ?? '',
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || selected === currentUserId) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const action =
        kind === 'pm' ? reassignProjectPm : reassignProjectClient;
      const payload =
        kind === 'pm'
          ? { project_id: projectId, new_pm_user_id: selected }
          : { project_id: projectId, new_client_user_id: selected };
      const res = await action(payload);
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      setOpen(false);
    });
  }

  if (others.length === 0) {
    return (
      <span className="text-[10px] italic text-ink-muted">
        No other {kind === 'pm' ? 'owners/PMs' : 'clients'} yet — invite one
        first
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-primary hover:underline"
      >
        Reassign {kind === 'pm' ? 'PM' : 'client'} →
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-hairline bg-white px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
      >
        {others.map((c) => (
          <option key={c.user_id} value={c.user_id}>
            {c.full_name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !selected || selected === currentUserId}
        className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="rounded-lg border border-hairline px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-canvas"
      >
        Cancel
      </button>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </form>
  );
}
