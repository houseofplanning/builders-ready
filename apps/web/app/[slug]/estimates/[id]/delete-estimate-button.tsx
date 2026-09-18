'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEstimateOnWeb } from '@/lib/server-actions/estimates';

export function DeleteEstimateButton({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm('Delete this quote? This cannot be undone.')) return;
    setBusy(true);
    const res = await deleteEstimateOnWeb(id);
    if (!res.ok) {
      setBusy(false);
      window.alert(res.error ?? 'Could not delete.');
      return;
    }
    router.push(`/${slug}/estimates`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="rounded-lg border border-[#E7B7A6] px-4 py-2 text-sm font-semibold text-[#B23B1D] hover:bg-[#FAECE7] disabled:opacity-50"
    >
      {busy ? 'Deleting…' : 'Delete draft'}
    </button>
  );
}
