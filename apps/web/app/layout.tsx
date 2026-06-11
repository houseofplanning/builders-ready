import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default:
      'Builders Ready — the client portal for UK builders',
    template: '%s',
  },
  description:
    'From sole traders to multi-PM firms, give every client a portal they will actually open. Timeline, photos, decisions, invoices — in one branded mobile app.',
  metadataBase: new URL('https://buildersready.uk'),
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    siteName: 'Builders Ready',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
