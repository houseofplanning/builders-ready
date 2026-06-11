/**
 * FAQPage structured data. Note: Google deprecated FAQ *rich results* in
 * 2023–2026, so this no longer produces an expanded SERP listing. It remains
 * valid Schema.org markup that search and AI engines parse to understand the
 * page, and is harmless to keep. Pass the same Q&A shown on the page.
 */
export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
