import Link from 'next/link';
import type { Metadata } from 'next';
import { formatDate } from '@br/shared';
import { POSTS } from './posts';

export const metadata: Metadata = {
  title: 'Blog — Builders Ready',
  description:
    'Writing for UK builders of every size on client portals, construction variations, project handover documents, and running a builder business that protects its margin.',
  alternates: { canonical: 'https://buildersready.uk/blog' },
  openGraph: {
    title: 'Blog — Builders Ready',
    description:
      'Articles on UK construction operations, client portals, and protecting your margin.',
    url: 'https://buildersready.uk/blog',
    type: 'website',
  },
};

export default function BlogIndex() {
  const sorted = [...POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <main>
      <section className="pt-10 sm:pt-14">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Blog</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
            Writing for builders.
          </h1>
          <p className="mt-5 text-lg text-ink-soft-warm">
            Operational, legal and commercial topics for UK builders. Updated regularly.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <ul className="space-y-5">
          {sorted.map((p) => (
            <li
              key={p.slug}
              className="rounded-2xl border border-hairline-warm bg-white p-6 transition hover:border-primary/40"
            >
              <Link href={`/blog/${p.slug}`} className="block">
                <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-ink-muted-warm">
                  <span>{p.category}</span>
                  <span>·</span>
                  <span>{formatDate(p.publishedAt)}</span>
                  <span>·</span>
                  <span>{p.readingTime}</span>
                </div>
                <h2 className="mb-2 text-xl font-extrabold leading-tight tracking-tight text-ink-warm">
                  {p.title}
                </h2>
                <p className="text-sm text-ink-soft-warm">{p.description}</p>
                <p className="mt-3 text-sm font-semibold text-primary">Read article →</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
