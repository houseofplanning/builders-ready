'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openThreadForJob, openThreadFromBid } from '@/lib/server-actions/marketplace';

export function MessageButton({
  kind,
  id,
  label = 'Message',
  variant = 'outline',
}: {
  kind: 'job' | 'bid';
  id: string;
  label?: string;
  variant?: 'outline' | 'solid';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      const res = kind === 'job' ? await openThreadForJob(id) : await openThreadFromBid(id);
      if (res.ok && res.redirectTo) router.push(res.redirectTo);
    });
  }

  const cls =
    variant === 'solid'
      ? 'bg-primary text-white'
      : 'border border-primary text-primary';

  return (
    <button
      onClick={go}
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-60 ${cls}`}
    >
      {pending ? '…' : label}
    </button>
  );
}
