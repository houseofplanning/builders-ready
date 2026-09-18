'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendEstimateOnWeb,
  getEstimatePdfUrl,
} from '@/lib/server-actions/estimates';
import type { EstimateStatus } from '@br/shared';

export function EstimateSendPanel({
  id,
  status,
  viewUrl,
  hasPdf,
}: {
  id: string;
  status: EstimateStatus;
  viewUrl: string | null;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(viewUrl);
  const [copied, setCopied] = useState(false);

  const sent = status === 'sent' || status === 'accepted' || !!link;

  async function onSend() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await sendEstimateOnWeb(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send.');
      return;
    }
    setLink(res.view_url ?? null);
    setMsg(
      res.emailed
        ? 'Sent — the client has been emailed the quote and PDF.'
        : 'Quote marked as sent. No client email on file, so share the link below.',
    );
    router.refresh();
  }

  async function onDownload() {
    const res = await getEstimatePdfUrl(id);
    if (res.ok && res.url) {
      window.open(res.url, '_blank');
    } else {
      setError(res.error ?? 'No PDF available yet.');
    }
  }

  async function onCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  return (
    <div className="rounded-card border border-hairline bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold">Send to client</h2>
        {sent && (
          <span className="rounded-full bg-[#E6F0FA] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2563A8]">
            Sent
          </span>
        )}
      </div>

      {status !== 'accepted' && (
        <button
          type="button"
          onClick={onSend}
          disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy
            ? 'Sending…'
            : sent
              ? 'Resend quote (regenerate PDF)'
              : 'Send quote'}
        </button>
      )}

      {msg && <p className="mt-3 text-xs text-[#0F6E56]">{msg}</p>}
      {error && <p className="mt-3 text-xs text-[#B23B1D]">{error}</p>}

      {link && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Shareable link
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-xs text-ink"
            />
            <button
              type="button"
              onClick={onCopy}
              className="whitespace-nowrap rounded-lg border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">
            Send this to your client on WhatsApp, text or email — they can open
            it with no account.
          </p>
        </div>
      )}

      {(hasPdf || sent) && (
        <button
          type="button"
          onClick={onDownload}
          className="mt-3 w-full rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Download PDF
        </button>
      )}
    </div>
  );
}
