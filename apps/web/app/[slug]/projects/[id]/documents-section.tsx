'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  formatFileSize,
  relativeTime,
  type DocumentCategory,
} from '@br/shared';
import {
  uploadDocument,
  deleteDocument,
  signedUrlForDocument,
} from '@/lib/server-actions/documents';

export interface DocumentRow {
  id: string;
  name: string;
  category: DocumentCategory;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
}

export function DocumentsSection({
  projectId,
  documents,
  canManage,
}: {
  projectId: string;
  documents: DocumentRow[];
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  const grouped = DOCUMENT_CATEGORIES.map((cat) => ({
    cat,
    items: documents.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center px-5 py-3">
        <h2 className="text-sm font-bold">Documents</h2>
        <span className="ml-2 text-xs text-ink-muted">{documents.length} total</span>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? 'Cancel' : '+ Upload'}
          </button>
        )}
      </header>

      {showForm && (
        <div className="border-t border-hairline px-5 py-4">
          <UploadForm projectId={projectId} onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="border-t border-hairline">
        {documents.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-ink-muted">
            No documents yet.
            {canManage &&
              ' Upload contracts, plans, certificates and warranties for this project.'}
          </div>
        ) : (
          grouped.map((g) => (
            <div
              key={g.cat}
              className="border-b border-hairline px-5 py-3 last:border-b-0"
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {DOCUMENT_CATEGORY_LABEL[g.cat]}
              </div>
              <ul className="space-y-1">
                {g.items.map((d) => (
                  <DocRow key={d.id} doc={d} canManage={canManage} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DocRow({ doc, canManage }: { doc: DocumentRow; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const res = await signedUrlForDocument(doc.storage_path);
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not open the file.');
        return;
      }
      window.open(res.url, '_blank', 'noopener');
    });
  }

  function remove() {
    if (!confirm(`Delete “${doc.name}”? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDocument(doc.id);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-canvas">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={open}
          disabled={pending}
          className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline disabled:opacity-60"
          title={doc.name}
        >
          {doc.name}
        </button>
        <div className="text-[10px] text-ink-muted">
          {formatFileSize(doc.size_bytes)} · uploaded {relativeTime(doc.created_at)}
        </div>
        {error && (
          <div className="mt-1 text-[10px] text-error">{error}</div>
        )}
      </div>
      {canManage && (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-error hover:bg-error/5 disabled:opacity-60"
        >
          Delete
        </button>
      )}
    </li>
  );
}

function UploadForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append('project_id', projectId);
    if (!(fd.get('file') instanceof File) || (fd.get('file') as File).size === 0) {
      setError('Please choose a file.');
      return;
    }
    startTransition(async () => {
      const res = await uploadDocument(fd);
      if (!res.ok) {
        setError(res.error ?? 'Upload failed.');
        return;
      }
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Category
        </span>
        <select
          name="category"
          defaultValue="other"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {DOCUMENT_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          File (max 50 MB)
        </span>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt"
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
          {pending ? 'Uploading…' : 'Upload document'}
        </button>
      </div>
    </form>
  );
}
