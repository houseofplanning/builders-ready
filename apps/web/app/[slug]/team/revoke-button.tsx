'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revokeInvitation } from '@/lib/server-actions/invitations';

export function RevokeButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Revoke the invitation to ${email}?`)) return;
    startTransition(async () => {
      const res = await revokeInvitation(invitationId);
      if (!res.ok) {
        alert(res.error ?? 'Could not revoke.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-60"
    >
      {pending ? 'Revoking…' : 'Revoke'}
    </button>
  );
}
