import Link from 'next/link';

/**
 * Shared marketing building blocks — the homepage rebrand, distilled.
 * Every marketing page is built from these so the style checklist in
 * docs/MARKETING-STYLE-CHECKLIST.md is applied by construction, not by memory.
 * Warm palette only; media sized by height so it scales; one teal accent.
 */

export const REBRAND = '/marketing/rebrand';

/** Centred content rail with equal side margins. */
export function Rail({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-[1600px] px-6 sm:px-10 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{children}</p>
  );
}

export function PrimaryButton({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls =
    'inline-flex items-center rounded-xl bg-primary px-5 py-3 text-base font-bold text-white shadow-card transition hover:bg-primary-deep';
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-base font-bold text-primary">
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

/** Tick list with soft teal check chips. */
export function Checks({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 space-y-3">
      {items.map((c) => (
        <li key={c} className="flex items-start gap-3 text-base text-ink-soft-warm">
          <span className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-black text-primary">
            ✓
          </span>
          <span dangerouslySetInnerHTML={{ __html: c }} />
        </li>
      ))}
    </ul>
  );
}

/** A single phone screenshot — width-capped, scales with its column. */
export function PhoneImg({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-[min(320px,82%)] drop-shadow-2xl" loading="lazy" />
  );
}

/**
 * Two overlapping phone screenshots, sized by HEIGHT inside a responsive
 * container so the cluster shrinks proportionally and never overflows.
 */
export function PhoneDuo({
  back,
  front,
  backAlt,
  frontAlt,
  float = true,
}: {
  back: string;
  front: string;
  backAlt: string;
  frontAlt: string;
  float?: boolean;
}) {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[520px] sm:h-[480px] lg:h-[560px]">
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src={back}
        alt={backAlt}
        className="absolute left-[4%] top-[8%] h-[86%] w-auto -rotate-6 drop-shadow-2xl"
      />
      <img
        src={front}
        alt={frontAlt}
        className={`absolute right-[4%] top-0 h-[98%] w-auto drop-shadow-2xl ${float ? 'br-float' : ''}`}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}

/**
 * A real app screenshot inside one consistent black phone frame. Used for
 * EVERY phone on the marketing site so they all match. `fit="width"` sizes by
 * the wrapper's width (single phones in a column); `fit="height"` sizes by the
 * wrapper's height (overlapping phones in a fixed-height hero). Positioning,
 * size and rotation go in `className` on the frame.
 */
export function PhoneFrame({
  src,
  alt,
  className = '',
  float = false,
  fit = 'width',
}: {
  src: string;
  alt: string;
  className?: string;
  float?: boolean;
  fit?: 'width' | 'height';
}) {
  const imgClass =
    fit === 'height' ? 'block h-full w-auto rounded-[1.9rem]' : 'block w-full h-auto rounded-[1.9rem]';
  return (
    <div
      className={`overflow-hidden rounded-[2.4rem] bg-[#14151a] p-[7px] shadow-2xl ring-1 ring-black/10 ${float ? 'br-float' : ''} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className={imgClass} />
    </div>
  );
}

/** A web/desktop screenshot in a soft card frame, scales with its column. */
export function ShotCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline-warm bg-white shadow-raised">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full" loading="lazy" />
    </div>
  );
}

/** A desktop screenshot in a clean browser window, for the web app screens. */
export function BrowserFrame({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-hairline-warm bg-white shadow-raised ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-hairline-warm bg-paper-alt px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#D9D0C1]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D9D0C1]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D9D0C1]" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  );
}

/** Standard alternating feature row: copy one side, media the other. */
export function FeatureRow({
  eyebrow,
  title,
  lead,
  checks,
  media,
  reverse,
  cta,
  learnMoreHref,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  checks?: string[];
  media: React.ReactNode;
  reverse?: boolean;
  cta?: { href: string; label: string };
  learnMoreHref?: string;
}) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20">
        <div className={reverse ? 'lg:order-2' : ''}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            className="mt-4 text-4xl font-extrabold leading-[1.07] tracking-tight text-ink-warm sm:text-5xl"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p className="mt-5 max-w-[34em] text-lg text-ink-soft-warm">{lead}</p>
          {checks && <Checks items={checks} />}
          {cta ? (
            <div className="mt-8">
              <PrimaryButton href={cta.href}>{cta.label}</PrimaryButton>
            </div>
          ) : learnMoreHref ? (
            <div className="mt-8">
              <GhostLink href={learnMoreHref}>Learn more</GhostLink>
            </div>
          ) : null}
        </div>
        <div className={`flex justify-center ${reverse ? 'lg:order-1' : ''}`}>{media}</div>
      </div>
    </section>
  );
}

/** Teal full-width closing call-to-action. */
export function FinalCta({
  title,
  lead,
  primary,
  secondary,
}: {
  title: string;
  lead: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-24">
        <h2 className="max-w-[16em] text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-[30em] text-lg text-white/80">{lead}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={primary.href}
            className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-base font-bold text-primary transition hover:bg-paper"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex items-center rounded-xl border-[1.5px] border-white/40 px-5 py-3 text-base font-bold text-white transition hover:border-white"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Store badges (App Store + Google Play), real links. */
export function StoreBadges({ className = '' }: { className?: string }) {
  const badge =
    'inline-flex items-center gap-2.5 rounded-xl bg-ink-warm px-4 py-2.5 text-white transition hover:opacity-90';
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href="https://apps.apple.com/gb/app/builders-ready/id6771347066"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download Builders Ready on the App Store"
        className={badge}
      >
        <svg viewBox="0 0 384 512" className="h-6 w-6 fill-current" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-medium uppercase tracking-wide">Download on the</span>
          <span className="-mt-0.5 block text-base font-semibold">App Store</span>
        </span>
      </a>
      <a
        href="https://play.google.com/store/apps/details?id=uk.buildersready.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get Builders Ready on Google Play"
        className={badge}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
          <path d="M4 3.5v17a1 1 0 0 0 1.5.87l14.5-8.5a1 1 0 0 0 0-1.74L5.5 2.63A1 1 0 0 0 4 3.5z" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-medium uppercase tracking-wide">Get it on</span>
          <span className="-mt-0.5 block text-base font-semibold">Google Play</span>
        </span>
      </a>
    </div>
  );
}
