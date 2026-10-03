import Link from 'next/link';
import { requireCustomer } from '@/lib/customer-resolver';
import { signOutAction } from '@/lib/server-actions/auth';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireCustomer();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/me" className="text-sm font-extrabold tracking-[0.2em] text-ink">
            BUILDERS <span className="text-primary">READY</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/me/messages" className="text-sm font-semibold text-ink-muted hover:text-ink">
              Messages
            </Link>
            <Link href="/me/post" className="text-sm font-bold text-primary hover:underline">
              + Post a job
            </Link>
            <form action={signOutAction}>
              <button className="text-sm font-semibold text-ink-muted hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
