'use client';

import { useState } from 'react';
import { confirmForHireJob, type ForHireJob } from '@/lib/server-actions/for-hire';
import { ReviewControl } from '@/components/review-control';

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export function ForHireWork({ initial }: { initial: ForHireJob[] }) {
  const [jobs, setJobs] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function confirm(id: string) {
    setBusyId(id);
    const res = await confirmForHireJob(id);
    setBusyId(null);
    if (res.ok) setJobs((prev) => prev.map((j) => (j.assignment_id === id ? { ...j, status: 'confirmed' } : j)));
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-hairline bg-white/60 p-6 text-center text-sm text-ink-muted">
        No jobs from other builders yet. When one hires and books you, it shows here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((j) => {
        const addr = [j.address_line1, j.city, j.postcode].filter(Boolean).join(', ');
        return (
          <div key={j.assignment_id} className="rounded-card border border-hairline bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold">{j.project_name}</div>
                <div className="text-xs text-ink-muted">
                  {j.business_name ? `for ${j.business_name}` : ''}{j.stage_name ? ` · ${j.stage_name}` : ''}
                </div>
                {addr && <div className="mt-0.5 text-xs text-ink-muted">{addr}</div>}
                <div className="mt-1 text-sm font-semibold text-ink">{fmt(j.starts_at)}</div>
              </div>
              <div className="flex flex-none flex-col items-end gap-2">
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${j.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {j.status === 'confirmed' ? 'Confirmed' : 'To confirm'}
                </span>
                {j.status === 'planned' && (
                  <button
                    onClick={() => confirm(j.assignment_id)}
                    disabled={busyId === j.assignment_id}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busyId === j.assignment_id ? '…' : "I'll be there"}
                  </button>
                )}
                {j.business_phone && (
                  <a href={`tel:${j.business_phone}`} className="text-xs font-semibold text-primary hover:underline">Call</a>
                )}
                {j.business_tenant_id && (
                  <ReviewControl
                    projectId={j.project_id}
                    counterpartyTenantId={j.business_tenant_id}
                    direction="sub_to_builder"
                    label="Rate builder"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
