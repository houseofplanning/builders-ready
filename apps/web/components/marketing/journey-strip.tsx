import type { ReactNode } from 'react';

interface Step {
  label: string;
  caption: string;
  icon: ReactNode;
  accent?: boolean;
}

const IC = 'h-7 w-7';

const STEPS: Step[] = [
  {
    label: 'Quote',
    caption: 'Price the job on site — materials, labour, your margin.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={IC}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    label: 'Build',
    caption: 'Live timeline, photo updates, decisions and variations — all signed off.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={IC}>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    label: 'Hand over',
    caption: 'One-tap handover PDF — the whole job, documented and signed.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={IC}>
        <path d="M21 10V6a2 2 0 0 0-2-2h-8" />
        <path d="M3 6v10a2 2 0 0 0 2 2h10" />
        <path d="M8 12l3 3 6-6" />
      </svg>
    ),
  },
  {
    label: 'Get paid',
    caption: 'Clients pay by card or bank — straight to your account.',
    accent: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={IC}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h4" />
      </svg>
    ),
  },
];

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-hairline">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function JourneyStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-card border border-hairline bg-white p-6 shadow-card md:p-8 ${className}`}
    >
      {/* Desktop: horizontal left-to-right */}
      <div className="hidden items-start md:flex">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center px-2 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  s.accent ? 'bg-accent text-white' : 'bg-primary text-white'
                }`}
              >
                {s.icon}
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Step {i + 1}
              </div>
              <div className="mt-0.5 text-lg font-extrabold text-ink">{s.label}</div>
              <p className="mt-1 max-w-[190px] text-xs leading-relaxed text-ink-muted">
                {s.caption}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mt-5 flex-shrink-0 self-start pt-0.5">
                <Chevron />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical timeline */}
      <ol className="md:hidden">
        {STEPS.map((s, i) => (
          <li key={s.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                  s.accent ? 'bg-accent text-white' : 'bg-primary text-white'
                }`}
              >
                {s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div className="my-1 w-0.5 flex-1 bg-hairline" />
              )}
            </div>
            <div className={i < STEPS.length - 1 ? 'pb-5' : ''}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Step {i + 1}
              </div>
              <div className="text-base font-extrabold text-ink">{s.label}</div>
              <p className="mt-0.5 text-sm text-ink-muted">{s.caption}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
