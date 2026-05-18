/**
 * UK-locale formatting helpers.
 *
 * Formatters are lazily constructed inside each function so the module
 * loads cleanly on JS runtimes that don't include every Intl API. Expo
 * Go's Hermes build can be missing `Intl.RelativeTimeFormat` on some
 * platforms; the surrounding try/catch falls back to a sensible default
 * so the app still renders even when the constructor is undefined.
 *
 * All money is stored as integer pence; format on the way out only.
 */

let gbpFormatter: Intl.NumberFormat | null = null;
let gbpWholeFormatter: Intl.NumberFormat | null = null;
let dateLongFormatter: Intl.DateTimeFormat | null = null;
let dateShortFormatter: Intl.DateTimeFormat | null = null;
let relativeFormatter: Intl.RelativeTimeFormat | null = null;

export function gbp(pence: number, opts?: { whole?: boolean }): string {
  try {
    if (opts?.whole) {
      if (!gbpWholeFormatter) {
        gbpWholeFormatter = new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
      }
      return gbpWholeFormatter.format(pence / 100);
    }
    if (!gbpFormatter) {
      gbpFormatter = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return gbpFormatter.format(pence / 100);
  } catch {
    // Fallback if Intl.NumberFormat isn't available.
    const pounds = (pence / 100).toFixed(opts?.whole ? 0 : 2);
    return `£${pounds}`;
  }
}

export function formatDate(iso: string, opts?: { short?: boolean }): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    if (opts?.short) {
      if (!dateShortFormatter) {
        dateShortFormatter = new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
        });
      }
      return dateShortFormatter.format(d);
    }
    if (!dateLongFormatter) {
      dateLongFormatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return dateLongFormatter.format(d);
  } catch {
    // Fallback: DD MMM YYYY without Intl.
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    return opts?.short ? `${dd} ${mmm}` : `${dd} ${mmm} ${d.getFullYear()}`;
  }
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const absSec = Math.abs(diffSec);

  try {
    if (!relativeFormatter) {
      relativeFormatter = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
    }
    if (absSec < 60) return relativeFormatter.format(diffSec, 'second');
    if (absSec < 3600) return relativeFormatter.format(Math.round(diffSec / 60), 'minute');
    if (absSec < 86400) return relativeFormatter.format(Math.round(diffSec / 3600), 'hour');
    if (absSec < 2592000) return relativeFormatter.format(Math.round(diffSec / 86400), 'day');
    if (absSec < 31536000) return relativeFormatter.format(Math.round(diffSec / 2592000), 'month');
    return relativeFormatter.format(Math.round(diffSec / 31536000), 'year');
  } catch {
    // Fallback: manual English plurals if Intl.RelativeTimeFormat is missing
    // (Hermes on older Expo Go builds occasionally omits this constructor).
    return manualRelative(diffSec);
  }
}

function manualRelative(diffSec: number): string {
  const abs = Math.abs(diffSec);
  const past = diffSec < 0;
  const units: Array<[number, string]> = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
    [31536000, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  for (let i = 0; i < units.length; i++) {
    const [bound, unit] = units[i];
    if (abs < bound) {
      const divisor = i === 0 ? 1 : units[i - 1][0];
      const n = Math.max(1, Math.round(abs / divisor));
      const plural = n === 1 ? unit : `${unit}s`;
      return past ? `${n} ${plural} ago` : `in ${n} ${plural}`;
    }
  }
  return past ? 'a long time ago' : 'in a long time';
}
