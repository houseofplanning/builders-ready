'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessage } from '@/lib/server-actions/marketplace';

export function ChatBox({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = value.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await sendMessage({ thread_id: threadId, body });
      if (res.ok) {
        setValue('');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Message…"
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
    </form>
  );
}
