import Link from 'next/link';
import { requireCustomer } from '@/lib/customer-resolver';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireCustomer();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-white">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          {/* Top row: logo + Post a job (nav shows inline here on sm+). */}
          <div className="flex items-center gap-4 py-3">
            <Link href="/me" className="text-sm font-extrabold tracking-[0.2em] text-ink">
              BUILDERS <span className="text-primary">READY</span>
            </Link>
            <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex">
              <NavLink href="/me">My jobs</NavLink>
              <NavLink href="/me/browse">Browse</NavLink>
              <NavLink href="/me/messages">Messages</NavLink>
              <NavLink href="/me/account">Account</NavLink>
            </nav>
            <Link
              href="/me/post"
              className="ml-auto whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white"
            >
              + Post a job
            </Link>
          </div>
          {/* Mobile nav: its own scrollable row so it never wraps cramped. */}
          <nav className="-mx-1 flex items-center gap-1 overflow-x-auto pb-2 text-sm sm:hidden">
            <NavLink href="/me">My jobs</NavLink>
            <NavLink href="/me/browse">Browse</NavLink>
            <NavLink href="/me/messages">Messages</NavLink>
            <NavLink href="/me/account">Account</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-md px-3 py-1.5 font-semibold text-ink-muted transition hover:bg-canvas hover:text-ink"
    >
      {children}
    </Link>
  );
}
