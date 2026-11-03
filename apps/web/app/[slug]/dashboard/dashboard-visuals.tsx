export { CashChart, CompletionRing } from '@/components/finance-visuals';

// KPI tiles are deliberately calm: the number leads, the label sits quietly
// above it, and a single muted icon marks the tile. No coloured tile tints or
// badges — colour is reserved for the one brand accent, used sparingly.
export type Tint = 'teal' | 'coral' | 'amber' | 'green';

export function KpiTile({
  icon,
  value,
  label,
  chip,
}: {
  tint?: Tint;
  icon?: React.ReactNode;
  value: string | number;
  label: string;
  chip?: string | null;
}) {
  return (
    <div className="rounded-card border border-hairline bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        {icon && <span style={{ color: '#9AA7A2' }}>{icon}</span>}
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="text-[30px] font-extrabold leading-none tracking-tight text-ink">
          {value}
        </div>
        {chip && (
          <span className="mb-0.5 whitespace-nowrap text-[12px] font-semibold text-ink-muted">
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
