import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';

// Founder dashboard — platform-admin only. Aggregate, de-identified metrics.
// Lives at /admin. Data comes from the founder_dashboard() RPC, which is
// itself gated to platform_admins in the database.

export const dynamic = 'force-dynamic';

const TEAL = '#0F4C5C';
const ACCENT = '#E07A5F';

type Metrics = Record<string, any>;

function gbp(pence: number): string {
  return '£' + Math.round((pence || 0) / 100).toLocaleString('en-GB');
}
function num(n: number): string {
  return (n || 0).toLocaleString('en-GB');
}

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const { data, error } = await supabase.rpc('founder_dashboard');

  if (error || !data) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-extrabold" style={{ color: TEAL }}>
          Not authorised
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          This page is for the Builders Ready founder only. If that&apos;s you and
          you&apos;re seeing this, your account isn&apos;t yet marked as a platform
          admin.
        </p>
      </main>
    );
  }

  const m = data as Metrics;
  const weeks: { week: string; count: number }[] = m.signups_by_week ?? [];
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));
  const tiers = m.tier_split ?? {};
  const stages = m.actions_by_stage ?? {};

  return (
    <main className="mx-auto max-w-6xl px-5 py-10" style={{ color: '#0B1418' }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div
            className="inline-block rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white"
            style={{ background: ACCENT }}
          >
            Founder dashboard
          </div>
          <h1 className="mt-3 text-3xl font-extrabold">Builders Ready, at a glance</h1>
        </div>
        <div className="text-xs text-slate-400">
          Aggregate figures only, no personal data.
          <br />
          Updated {new Date(m.generated_at).toLocaleString('en-GB')}
        </div>
      </div>

      {/* GROWTH */}
      <Section title="Growth">
        <Tiles>
          <Tile label="Builders" value={num(m.builders_total)} sub={`+${num(m.builders_new_30d)} in 30d`} />
          <Tile label="Homeowners" value={num(m.homeowners_total)} sub={`+${num(m.homeowners_new_30d)} in 30d`} />
          <Tile label="New builders (7d)" value={num(m.builders_new_7d)} />
          <Tile label="Active subscriptions" value={num(m.subs_active)} />
        </Tiles>
        <Card title="Builder signups, last 8 weeks">
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {weeks.length === 0 && <Empty />}
            {weeks.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="text-[11px] font-bold text-slate-500">{w.count}</div>
                <div
                  className="w-full rounded-t"
                  style={{ height: `${(w.count / maxWeek) * 90}px`, background: TEAL, minHeight: 2 }}
                />
                <div className="text-[9px] text-slate-400">
                  {new Date(w.week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* REVENUE */}
      <Section title="Revenue & subscriptions">
        <Tiles>
          <Tile label="Indicative MRR" value={gbp(m.mrr_pence)} sub="active subs at list price" accent />
          <Tile label="On trial" value={num(m.subs_trialing)} />
          <Tile label="Past due / unpaid" value={num(m.subs_past_due)} />
          <Tile label="Cancelled / suspended" value={num(m.subs_cancelled)} />
        </Tiles>
        <Card title="Paying + trialing by tier">
          <BarRow label="Starter (£29)" value={tiers.starter ?? 0} max={tierMax(tiers)} />
          <BarRow label="Pro (£69)" value={tiers.pro ?? 0} max={tierMax(tiers)} />
          <BarRow label="Unlimited (£149)" value={tiers.unlimited ?? 0} max={tierMax(tiers)} />
        </Card>
      </Section>

      {/* QUOTING */}
      <Section title="Quoting">
        <Tiles>
          <Tile label="Estimates" value={num(m.estimates_total)} sub={`+${num(m.estimates_30d)} in 30d`} />
          <Tile
            label="Win rate"
            value={m.win_rate_bp != null ? `${Math.round(m.win_rate_bp / 100)}%` : '—'}
            sub="of decided quotes"
          />
          <Tile label="Avg quote value" value={gbp(m.avg_estimate_pence)} />
          <Tile label="Quotes sent" value={num(m.estimates_sent)} />
        </Tiles>
      </Section>

      {/* MONEY */}
      <Section title="Money flowing through">
        <Tiles>
          <Tile label="GMV paid" value={gbp(m.gmv_paid_pence)} sub="invoices marked paid" accent />
          <Tile label="Invoices paid" value={num(m.invoices_paid)} sub={`of ${num(m.invoices_total)}`} />
        </Tiles>
      </Section>

      {/* MARKETPLACE */}
      <Section title="Marketplace health">
        <Tiles>
          <Tile label="Jobs posted" value={num(m.jobs_total)} sub={`+${num(m.jobs_30d)} in 30d`} />
          <Tile label="Open jobs" value={num(m.jobs_open)} />
          <Tile label="Bids placed" value={num(m.bids_total)} />
          <Tile label="Avg review" value={m.avg_rating != null ? `${m.avg_rating}★` : '—'} sub={`${num(m.reviews_count)} reviews`} />
        </Tiles>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Jobs by region (liquidity)">
            <TopList items={m.jobs_by_region ?? []} />
          </Card>
          <Card title="Jobs by trade">
            <TopList items={m.jobs_by_category ?? []} />
          </Card>
        </div>
      </Section>

      {/* PLANNING RADAR */}
      <Section title="Planning Radar">
        <Tiles>
          <Tile label="Listings held" value={num(m.listings_total)} />
          <Tile label="Builder actions" value={num(m.actions_total)} />
          <Tile label="Approached" value={num(stages.approached ?? 0)} />
          <Tile label="Won from Radar" value={num(stages.won ?? 0)} accent />
        </Tiles>
        <Card title="Pipeline stages">
          <BarRow label="Saved" value={stages.saved ?? 0} max={stageMax(stages)} />
          <BarRow label="Approached" value={stages.approached ?? 0} max={stageMax(stages)} />
          <BarRow label="Replied" value={stages.replied ?? 0} max={stageMax(stages)} />
          <BarRow label="Won" value={stages.won ?? 0} max={stageMax(stages)} />
        </Card>
      </Section>

      <p className="mt-10 text-center text-xs text-slate-400">
        Private to the founder. Figures are aggregate and carry no personal data.
      </p>
    </main>
  );
}

function tierMax(t: Record<string, number>): number {
  return Math.max(1, t.starter ?? 0, t.pro ?? 0, t.unlimited ?? 0);
}
function stageMax(s: Record<string, number>): number {
  return Math.max(1, s.saved ?? 0, s.approached ?? 0, s.replied ?? 0, s.won ?? 0);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-slate-400">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{children}</div>;
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent ? ACCENT : TEAL }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 text-sm font-bold" style={{ color: '#0B1418' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="w-32 shrink-0 text-xs text-slate-500">{label}</div>
      <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
        <div className="h-full rounded" style={{ width: `${(value / max) * 100}%`, background: TEAL, minWidth: value > 0 ? 6 : 0 }} />
      </div>
      <div className="w-10 shrink-0 text-right text-xs font-bold text-slate-600">{value}</div>
    </div>
  );
}

function TopList({ items }: { items: { key: string; count: number }[] }) {
  if (!items || items.length === 0) return <Empty />;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      {items.map((i) => (
        <BarRow key={i.key} label={i.key} value={i.count} max={max} />
      ))}
    </div>
  );
}

function Empty() {
  return <div className="py-6 text-center text-xs text-slate-400">No data yet.</div>;
}
