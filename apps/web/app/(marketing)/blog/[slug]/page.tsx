import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { formatDate } from '@br/shared';
import { POSTS } from '../posts';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return { title: 'Not found — Builders Ready' };
  const url = `https://buildersready.uk/blog/${post.slug}`;
  return {
    title: `${post.title} — Builders Ready`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  // JSON-LD for the article itself (Google Article rich result eligibility).
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: 'https://buildersready.uk/opengraph-image',
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Builders Ready',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Builders Ready',
      logo: {
        '@type': 'ImageObject',
        url: 'https://buildersready.uk/icon.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://buildersready.uk/blog/${post.slug}`,
    },
  };

  // Breadcrumb trail: Home › Blog › this post.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://buildersready.uk',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://buildersready.uk/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://buildersready.uk/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]),
        }}
      />
      <main>
        <article className="mx-auto max-w-3xl px-6 py-16">
          <Link
            href="/blog"
            className="mb-6 inline-block text-xs font-semibold text-ink-muted hover:text-ink"
          >
            ← All articles
          </Link>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            <span>{post.category}</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>

          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mb-10 text-lg text-ink-muted">{post.description}</p>

          <div
            className="prose-builders"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <div className="mt-16 rounded-card border border-hairline bg-canvas p-7 text-center">
            <h2 className="mb-3 text-xl font-extrabold">
              Stop running client projects from WhatsApp.
            </h2>
            <p className="mx-auto mb-5 max-w-md text-sm text-ink-muted">
              Builders Ready is the client portal for UK builders of every
              size. 14-day free trial.
            </p>
            <Link
              href="/signup"
              className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              Start free trial →
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
