import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* JSON-LD structured data for the Organization + the SaaS product.
          Helps Google understand who we are and what we offer for the
          knowledge panel and SoftwareApplication rich result. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Builders Ready',
              url: 'https://buildersready.uk',
              logo: 'https://buildersready.uk/icon.svg',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'info@buildersready.uk',
                contactType: 'customer support',
                areaServed: 'GB',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Builders Ready',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'iOS, Web',
              description:
                'Client portal for UK builders — sole traders to multi-PM firms. Project timeline, decisions, variations with signature, finance summary and project handover PDF — in one branded mobile app.',
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'GBP',
                lowPrice: '29',
                highPrice: '149',
              },
            },
          ]),
        }}
      />
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
