'use client';

import { usePathname } from 'next/navigation';

const STEPS = [
  { slug: 'account', label: 'Account' },
  { slug: 'billing', label: 'Billing' },
  { slug: 'branding', label: 'Branding' },
  { slug: 'bank', label: 'Bank details' },
  { slug: 'invite', label: 'Invite team' },
];

export function OnboardingProgress() {
  const pathname = usePathname();
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => pathname?.includes(`/onboarding/${s.slug}`)),
  );

  return (
    <ol className="flex items-center gap-3">
      {STEPS.map((s, i) => {
        const done = i < activeIdx || (i === 0 && activeIdx > 0);
        const current = i === activeIdx;
        return (
          <li key={s.slug} className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <span
              className={[
                'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold',
                done
                  ? 'border-primary bg-primary text-white'
                  : current
                    ? 'border-primary bg-white text-primary'
                    : 'border-hairline bg-white text-ink-muted',
              ].join(' ')}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={current ? 'font-semibold text-ink' : ''}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
