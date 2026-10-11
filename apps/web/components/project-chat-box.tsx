'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendProjectMessage } from '@/lib/server-actions/project-messages';

/**
 * Composer for the project client↔PM thread. Mirrors the marketplace
 * ChatBox but posts to the project `messages` table via sendProjectMessage.
 */
export function ProjectChatBox({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = value.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const res = await sendProjectMessage({ project_id: projectId, body });
      if (res.ok) {
        setValue('');
        router.refresh();
      } else {
        setError(res.error ?? 'Could not send.');
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Message your builder…"
        maxLength={4000}
        className="block w-full rounded-full border border-hairline bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        Send
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </form>
  );
}
