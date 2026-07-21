import { gbp } from '@br/shared';

const TINTS = {
  teal: { bg: '#E1F5EE', icon: '#0F6E56', num: '#04342C', label: '#0F6E56', chipBg: '#9FE1CB', chipText: '#085041' },
  coral: { bg: '#FAECE7', icon: '#993C1D', num: '#4A1B0C', label: '#993C1D', chipBg: '#F5C4B3', chipText: '#712B13' },
  amber: { bg: '#FAEEDA', icon: '#854F0B', num: '#412402', label: '#854F0B', chipBg: '#FAC775', chipText: '#633806' },
  green: { bg: '#EAF3DE', icon: '#3B6D11', num: '#173404', label: '#3B6D11', chipBg: '#C0DD97', chipText: '#27500A' },
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
    <div style={{ background: t.bg, borderRadius: 12, padding: 14 }}>
      <div className="flex items-center justify-between">
        <span
          className="flex items-center justify-center text-white"
          style={{ width: 30, height: 30, borderRadius: 8, background: t.icon }}
        >
          {icon}
        </span>
        {chip && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: t.chipBg, color: t.chipText }}
          >
            {chip}
          </span>
        )}
      </div>
      <div className="mt-2.5 text-2xl font-extrabold tracking-tight" style={{ color: t.num }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: t.label }}>
        {label}
      </div>
    </div>
  );
}

export function CashChart({
  contracted,
  invoiced,
  paid,
  outstanding,
}: {
  contracted: number;
  invoiced: number;
  paid: number;
  outstanding: number;
}) {
  const max = Math.max(contracted, invoiced, paid, outstanding, 1);
  const rows = [
    { label: 'Contracted', value: contracted, color: '#0F6E56' },
    { label: 'Invoiced', value: invoiced, color: '#5DCAA5' },
    { label: 'Paid', value: paid, color: '#639922' },
    { label: 'Outstanding', value: outstanding, color: '#EF9F27' },
  ];
  return (
    <div className="h-full rounded-card border border-hairline bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-bold">Cash position</h2>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-muted">{r.label}</span>
              <span className="font-semibold text-ink">{gbp(r.value, { whole: true })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompletionRing({ paid, contracted }: { paid: number; contracted: number }) {
  const pct = contracted > 0 ? Math.round((paid / contracted) * 100) : 0;
  const circ = 2 * Math.PI * 50;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <div className="flex h-full flex-col items-center rounded-card border border-hairline bg-white p-5 shadow-card">
      <h2 className="mb-2 w-full text-sm font-bold">Collected</h2>
      <div className="flex flex-1 items-center">
        <svg viewBox="0 0 120 120" width="118" height="118" role="img" aria-label={`${pct}% collected`}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#E1F5EE" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="58" textAnchor="middle" fontSize="26" fontWeight="800" fill="#04342C">
            {pct}%
          </text>
          <text x="60" y="76" textAnchor="middle" fontSize="11" fill="#0F6E56">
            of contracted
          </text>
        </svg>
      </div>
      <div className="mt-1 text-center text-xs text-ink-muted">
        {gbp(paid, { whole: true })} of {gbp(contracted, { whole: true })}
      </div>
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
