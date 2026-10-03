const TRADES = [
  'Painters & decorators',
  'Tilers',
  'Plasterers',
  'Flooring',
  'Carpenters & joiners',
  'Kitchen fitters',
  'Bathroom fitters',
  'Electricians',
  'Plumbers',
  'Heating engineers',
  'Roofers',
  'Driveways & paving',
  'Landscapers',
  'Groundworkers',
  'Extensions',
  'Loft conversions',
  'Full renovations',
];

/**
 * "One app, every trade" band. Makes it explicit that Builders Ready isn't
 * only for big builders — it scales from a two-room paint job to a full build,
 * and runs the whole thing (quote → build → handover → paid).
 */
export function TradesBand() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center md:py-20">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
          One app, every trade
        </p>
        <h2 className="mx-auto mb-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          From two rooms to a full build.
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-base text-ink-muted">
          Whether you&rsquo;re a decorator doing a two-room job or a firm running
          a £400k extension, you pick your type of work and Builders Ready runs
          the whole thing — quote, build, hand over and get paid, start to
          finish.
        </p>

        <div className="flex flex-wrap justify-center gap-2.5">
          {TRADES.map((t, i) => (
            <span
              key={t}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                i % 5 === 0
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : i % 5 === 2
                    ? 'border-accent/30 bg-accent/5 text-accent-deep'
                    : 'border-hairline bg-white text-ink'
              }`}
            >
              {t}
            </span>
          ))}
          <span className="rounded-full border border-hairline bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-muted">
            + 40 job templates
          </span>
        </div>
      </div>
    </section>
  );
}
