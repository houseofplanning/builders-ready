/**
 * UK-locale formatting helpers. All money is stored as integer pence and
 * formatted via Intl.NumberFormat('en-GB').
 */

const gbpFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const gbpWholeFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function gbp(pence: number, opts?: { whole?: boolean }): string {
  const f = opts?.whole ? gbpWholeFormatter : gbpFormatter;
  return f.format(pence / 100);
}

const dateLongFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateShortFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
});

export function formatDate(iso: string, opts?: { short?: boolean }): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (opts?.short ? dateShortFormatter : dateLongFormatter).format(d);
}

const relativeFormatter = new Intl.RelativeTimeFormat('en-GB', {
  numeric: 'auto',
});

export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const absSec = Math.abs(diffSec);
  if (absSec < 60) return relativeFormatter.format(diffSec, 'second');
  if (absSec < 3600)
    return relativeFormatter.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86400)
    return relativeFormatter.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 2592000)
    return relativeFormatter.format(Math.round(diffSec / 86400), 'day');
  if (absSec < 31536000)
    return relativeFormatter.format(Math.round(diffSec / 2592000), 'month');
  return relativeFormatter.format(Math.round(diffSec / 31536000), 'year');
}
