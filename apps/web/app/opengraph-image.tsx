import { ImageResponse } from 'next/og';

/**
 * Default OpenGraph image used across the site when a page doesn't define
 * its own. Generated on-demand by Next.js, cached aggressively at the edge.
 * 1200x630 is the standard for Twitter / LinkedIn / Facebook.
 */
export const runtime = 'edge';
export const alt =
  'Builders Ready — the client portal for UK builders';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          background:
            'linear-gradient(135deg, #0F4C5C 0%, #0A3641 70%, #E07A5F 130%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            fontWeight: 800,
            opacity: 0.95,
          }}
        >
          BUILDERS READY
        </div>

        <div
          style={{
            marginTop: 'auto',
            fontSize: 70,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          The client portal UK builders use to look more professional than
          the competition.
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            opacity: 0.9,
            maxWidth: 900,
          }}
        >
          Timeline · Decisions · Variations · Finance · Handover PDF
        </div>

        <div
          style={{
            marginTop: 'auto',
            fontSize: 22,
            opacity: 0.85,
          }}
        >
          buildersready.uk
        </div>
      </div>
    ),
    size,
  );
}
