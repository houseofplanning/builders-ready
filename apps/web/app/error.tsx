'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        Sorry — an unexpected error occurred. Please try again, and if it keeps
        happening, let us know.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white"
      >
        Try again
      </button>
    </div>
  );
}
