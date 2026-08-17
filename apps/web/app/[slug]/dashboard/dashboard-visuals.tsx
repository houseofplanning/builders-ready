export { CashChart, CompletionRing } from '@/components/finance-visuals';

// Restrained, uniform palette — one calm teal icon tone across every tile.
// Colour is reserved for meaning (attention dots, outstanding balance), not
// decoration, which reads as premium B2B rather than a consumer app.
const ICON_BG = '#EEF2F1';
const ICON_FG = '#0F4C5C';
const TINTS = {
  teal: { bg: ICON_BG, icon: ICON_FG },
  coral: { bg: ICON_BG, icon: ICON_FG },
  amber: { bg: ICON_BG, icon: ICON_FG },
  green: { bg: ICON_BG, icon: ICON_FG },
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
      <div className="flex items-center justify-between">
        <span
          className="flex items-center justify-center"
          style={{ width: 30, height: 30, borderRadius: 8, background: t.bg, color: t.icon }}
        >
          {icon}
        </span>
        {chip && (
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            {chip}
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}

const svgProps = {
  width: 16,
  height: 16,
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
