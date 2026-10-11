export { CashChart, CompletionRing } from '@/components/finance-visuals';

// Each KPI gets its own soft tint so the row reads at a glance and the tiles
// don't look empty. Colour carries meaning (projects/teal, variations/coral,
// decisions/amber, money/green).
const TINTS = {
  teal: { bg: '#E7F0F2', icon: '#0F4C5C' },
  coral: { bg: '#FDEDE8', icon: '#C85A3E' },
  amber: { bg: '#FEF3E2', icon: '#B7791F' },
  green: { bg: '#E6F6EF', icon: '#0F6E56' },
} as const;

export type Tint = keyof typeof TINTS;

export function KpiTile({
  tint,
  icon,
  value,
  label,
  chip,
}: {
  tint: Tint;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  chip?: string | null;
}) {
  const t = TINTS[tint];
  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span
          className="flex flex-shrink-0 items-center justify-center"
          style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, color: t.icon }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[28px] font-extrabold leading-none tracking-tight text-ink">
          {value}
        </div>
        {chip && (
          <span className="mb-0.5 whitespace-nowrap rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            {chip}
          </span>
        )}
      </div>
    </div>
  );
}

const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconStack = (
  <svg {...svgProps} aria-hidden="true">
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const IconPen = (
  <svg {...svgProps} aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);

export const IconChat = (
  <svg {...svgProps} aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-12.9 7.5L3 21l1.9-4.5A8.4 8.4 0 1 1 21 11.5Z" />
  </svg>
);

export const IconCash = (
  <svg {...svgProps} aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);
