'use client';

import { useState, useTransition, useRef } from 'react';
import { relativeTime } from '@br/shared';
import {
  createStructuredReportOnWeb,
  uploadPdfReport,
  signedUrlForReport,
} from '@/lib/server-actions/reports';

export interface ReportRow {
  id: string;
  title: string;
  kind: 'structured' | 'pdf';
  summary: string | null;
  next_week: string | null;
  risks: string | null;
  decisions_needed: string | null;
  pdf_storage_path: string | null;
  posted_at: string;
  acknowledged_at: string | null;
  posted_by_name: string;
  acknowledged_by_name: string | null;
}

export function ReportsSection({
  projectId,
  reports,
  canWrite,
}: {
  projectId: string;
  reports: ReportRow[];
  canWrite: boolean;
}) {
  const [showForm, setShowForm] = useState<null | 'structured' | 'pdf'>(null);

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center px-5 py-3">
        <h2 className="text-sm font-bold">Reports</h2>
        <span className="ml-2 text-xs text-ink-muted">
          {reports.length} total
        </span>
        {canWrite && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() =>
                setShowForm((s) => (s === 'structured' ? null : 'structured'))
              }
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
            >
              {showForm === 'structured' ? 'Cancel' : '+ Weekly note'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm((s) => (s === 'pdf' ? null : 'pdf'))}
              className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
            >
              {showForm === 'pdf' ? 'Cancel' : '+ Upload PDF'}
            </button>
          </div>
        )}
      </header>

      {showForm === 'structured' && (
        <div className="border-t border-hairline px-5 py-4">
          <StructuredForm
            projectId={projectId}
            onDone={() => setShowForm(null)}
          />
        </div>
      )}
      {showForm === 'pdf' && (
        <div className="border-t border-hairline px-5 py-4">
          <PdfUploadForm
            projectId={projectId}
            onDone={() => setShowForm(null)}
          />
        </div>
      )}

      <ul className="border-t border-hairline">
        {reports.length === 0 ? (
          <li className="px-5 py-8 text-center text-xs text-ink-muted">
            No reports posted yet.
            {canWrite &&
              ' Use weekly notes for short updates or upload an existing PDF.'}
          </li>
        ) : (
          reports.map((r) => <ReportRowComponent key={r.id} report={r} />)
        )}
      </ul>
    </section>
  );
}

function ReportRowComponent({ report }: { report: ReportRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openPdf() {
    if (!report.pdf_storage_path) return;
    setError(null);
    startTransition(async () => {
      const res = await signedUrlForReport(report.pdf_storage_path!);
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not open.');
        return;
      }
      window.open(res.url, '_blank', 'noopener');
    });
  }

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{report.title}</span>
            <span className="rounded-full bg-canvas px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
              {report.kind === 'pdf' ? 'PDF' : 'Note'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Posted by {report.posted_by_name} {relativeTime(report.posted_at)}
            {report.acknowledged_at && (
              <>
                {' · '}
                acknowledged by {report.acknowledged_by_name ?? 'client'}{' '}
                {relativeTime(report.acknowledged_at)}
              </>
            )}
          </p>
          {report.kind === 'structured' && report.summary && (
            <div className="mt-3 space-y-2 text-sm">
              <Block label="Summary" value={report.summary} />
              {report.next_week && (
                <Block label="Next week" value={report.next_week} />
              )}
              {report.risks && <Block label="Risks" value={report.risks} />}
              {report.decisions_needed && (
                <Block
                  label="Decisions needed"
                  value={report.decisions_needed}
                />
              )}
            </div>
          )}
        </div>
        {report.kind === 'pdf' && report.pdf_storage_path && (
          <button
            type="button"
            onClick={openPdf}
            disabled={pending}
            className="rounded-lg border border-primary px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60"
          >
            {pending ? 'Opening…' : 'Open PDF'}
          </button>
        )}
      </div>
      {error && (
        <div className="mt-2 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </li>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-ink">{value}</p>
    </div>
  );
}

function StructuredForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') ?? '').trim();
    const summary = String(fd.get('summary') ?? '').trim();
    const next_week = String(fd.get('next_week') ?? '').trim() || null;
    const risks = String(fd.get('risks') ?? '').trim() || null;
    const decisions_needed =
      String(fd.get('decisions_needed') ?? '').trim() || null;

    startTransition(async () => {
      const res = await createStructuredReportOnWeb({
        project_id: projectId,
        title,
        summary,
        next_week,
        risks,
        decisions_needed,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field
        label="Title"
        name="title"
        placeholder="e.g. Week 12 — kitchen install"
        required
      />
      <Field
        label="This week's summary"
        name="summary"
        placeholder="What got done"
        textarea
        required
      />
      <Field
        label="Plan for next week (optional)"
        name="next_week"
        textarea
      />
      <Field label="Risks (optional)" name="risks" textarea />
      <Field
        label="Decisions needed from the client (optional)"
        name="decisions_needed"
        textarea
      />

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Posting…' : 'Post report'}
        </button>
      </div>
    </form>
  );
}

function PdfUploadForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append('project_id', projectId);
    startTransition(async () => {
      const res = await uploadPdfReport(fd);
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field
        label="Title"
        name="title"
        placeholder="e.g. Structural engineer's report"
        required
      />
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          PDF file (max 20 MB)
        </span>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="block w-full text-sm"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Uploading…' : 'Upload PDF'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  textarea,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          required={required}
          rows={3}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </label>
  );
}
