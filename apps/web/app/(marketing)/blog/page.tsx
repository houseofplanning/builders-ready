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
      <section className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            Blog
          </p>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight">
            Writing for builders.
          </h1>
          <p className="text-base text-ink-muted">
            Operational, legal and commercial topics for UK
            builders. Updated regularly.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <ul className="space-y-6">
          {sorted.map((p) => (
            <li
              key={p.slug}
              className="rounded-card border border-hairline bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Link href={`/blog/${p.slug}`} className="block">
                <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                  <span>{p.category}</span>
                  <span>·</span>
                  <span>{formatDate(p.publishedAt)}</span>
                  <span>·</span>
                  <span>{p.readingTime}</span>
                </div>
                <h2 className="mb-2 text-xl font-extrabold leading-tight tracking-tight text-ink">
                  {p.title}
                </h2>
                <p className="text-sm text-ink-muted">{p.description}</p>
                <p className="mt-3 text-sm font-semibold text-primary">
                  Read article →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
