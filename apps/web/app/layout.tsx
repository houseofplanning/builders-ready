import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Builders Ready — the client portal for UK premium-residential builders',
  description:
    'Give your clients a portal they will actually open. Timeline, photos, decisions, invoices — in one branded mobile app.',
  metadataBase: new URL('https://buildersready.uk'),
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
