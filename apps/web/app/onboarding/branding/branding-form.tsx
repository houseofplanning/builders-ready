'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBranding } from '@/lib/server-actions/onboarding';
import { normaliseSlug } from '@br/shared';

const PRIMARY_SWATCHES = ['#0F4C5C', '#1A2C34', '#2C5F2D', '#5B2A86', '#8B2635', '#111111'];
const ACCENT_SWATCHES = ['#E07A5F', '#F4BC14', '#C9A24B', '#E76F51', '#81B29A', '#F25C54'];

interface Props {
  initial: {
    slug: string;
    logo_url: string | null;
    brand_primary: string;
    brand_accent: string;
    name: string;
  };
}

export function BrandingForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(initial.slug);
  const [primary, setPrimary] = useState(initial.brand_primary);
  const [accent, setAccent] = useState(initial.brand_accent);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo_url);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveBranding({
        slug,
        logo_url: logoUrl,
        brand_primary: primary,
        brand_accent: accent,
      });
      if (!res.ok || !res.redirectTo) {
        setError(res.error ?? 'Failed to save.');
        return;
      }
      router.push(res.redirectTo);
    });
  }

  const initials = initial.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      {/* SLUG */}
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          URL slug
        </span>
        <input
          value={slug}
          onChange={(e) => setSlug(normaliseSlug(e.target.value))}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Your clients will see: app.buildersready.uk/<strong>{slug || '…'}</strong>
        </p>
      </label>

      {/* LOGO */}
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Logo URL (PNG or SVG, transparent background)
        </span>
        <input
          value={logoUrl ?? ''}
          onChange={(e) => setLogoUrl(e.target.value || null)}
          placeholder="https://… (logo upload widget lands next session)"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      {/* PRIMARY COLOUR */}
      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Primary brand colour
        </span>
        <SwatchRow value={primary} options={PRIMARY_SWATCHES} onChange={setPrimary} />
        <input
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          className="mt-2 block w-32 rounded-lg border border-hairline bg-white px-3 py-1.5 font-mono text-xs"
        />
      </div>

      {/* ACCENT COLOUR */}
      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Accent colour
        </span>
        <SwatchRow value={accent} options={ACCENT_SWATCHES} onChange={setAccent} />
        <input
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="mt-2 block w-32 rounded-lg border border-hairline bg-white px-3 py-1.5 font-mono text-xs"
        />
      </div>

      {/* LIVE PREVIEW */}
      <div className="rounded-lg border border-hairline bg-gradient-to-br from-canvas to-white p-4">
        <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
          Live preview — how clients will see your app
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md text-xs font-extrabold tracking-widest text-white"
            style={{ background: primary }}
          >
            {initials || 'BR'}
          </div>
          <div>
            <div className="text-xs font-extrabold tracking-widest">{initial.name}</div>
            <div className="text-[9px] uppercase tracking-widest text-ink-muted">
              Construction Services
            </div>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"
              style={{ background: accent }}
            >
              Update available
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Continue → bank details'}
        </button>
      </div>
    </form>
  );
}

function SwatchRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          className={[
            'h-8 w-8 rounded-md border-2',
            value.toLowerCase() === c.toLowerCase()
              ? 'border-ink ring-2 ring-ink/20'
              : 'border-hairline',
          ].join(' ')}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
