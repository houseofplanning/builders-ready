'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { duplicateEstimateOnWeb } from '@/lib/server-actions/estimates';

export function DuplicateEstimateButton({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDuplicate() {
    setBusy(true);
    const res = await duplicateEstimateOnWeb(id);
    if (!res.ok || !res.id) {
      setBusy(false);
      window.alert(res.error ?? 'Could not duplicate.');
      return;
    }
    router.push(`/${slug}/estimates/${res.id}/edit`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onDuplicate}
      disabled={busy}
      className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
    >
      {busy ? 'Duplicating…' : 'Duplicate'}
    </button>
  );
}
