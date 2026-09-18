'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { convertEstimateToProject } from '@/lib/server-actions/estimates';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ConvertToProjectPanel({
  id,
  slug,
  defaultAddress1,
  defaultCity,
  defaultPostcode,
}: {
  id: string;
  slug: string;
  defaultAddress1: string;
  defaultCity: string;
  defaultPostcode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(plusDaysISO(90));
  const [addr1, setAddr1] = useState(defaultAddress1);
  const [city, setCity] = useState(defaultCity);
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConvert() {
    setError(null);
    setBusy(true);
    const res = await convertEstimateToProject(id, {
      start_date: start,
      estimated_end_date: end,
      address_line1: addr1.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not convert.');
      return;
    }
    router.push(`/${slug}/projects/${res.projectId}`);
    router.refresh();
  }

  const inputCls =
    'w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary';
  const lbl =
    'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted';

  return (
    <div className="rounded-card border border-primary bg-[#E1F5EE] p-5">
      <h2 className="text-sm font-extrabold text-ink">Convert to project</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Start the job in Builders Ready. The quote total carries across, and 8
        default stages are created. The client defaults to you as a placeholder —
        invite the real client and reassign them once they&apos;re on the app.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          Convert to project
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Start date</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={lbl}>Estimated end date</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Site address</label>
            <input
              value={addr1}
              onChange={(e) => setAddr1(e.target.value)}
              placeholder="Address line 1"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Town / city</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={lbl}>Postcode</label>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="text-xs text-[#B23B1D]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConvert}
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Creating project…' : 'Create project'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
