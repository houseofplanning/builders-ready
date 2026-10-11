import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        The page you were looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white"
      >
        Back to home
      </Link>
    </div>
  );
}
