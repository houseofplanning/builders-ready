import { gbp } from '@br/shared';

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
