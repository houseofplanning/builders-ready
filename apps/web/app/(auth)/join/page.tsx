import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Builders Ready',
  description: 'Hire a trade or grow your trade business — join Builders Ready.',
};

export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      <div className="mb-10 text-center">
        <div className="text-sm font-extrabold tracking-[0.2em] text-ink">
          BUILDERS <span className="text-primary">READY</span>
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          What brings you here?
        </h1>
        <p className="mt-2 text-base text-ink-muted">Pick the one that sounds like you.</p>
      </div>

      <div className="grid w-full max-w-3xl gap-5 md:grid-cols-2">
        <Choice
          href="/signup/customer"
          kicker="I need a trade"
          title="Post a job — free"
          body="Describe what you need, get quotes from local trades, and run the whole job from your phone. Free, always."
          cta="Post a job"
          primary
        />
        <Choice
          href="/signup"
          kicker="I'm a tradesperson"
          title="Grow your trade business"
          body="Win leads, quote on site, run the job and get paid — all in one app. Set up your account on the web."
          cta="Start free trial"
        />
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Choice({
  href,
  kicker,
  title,
  body,
  cta,
  primary,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-hairline bg-white p-7 shadow-card transition hover:border-primary/40 hover:shadow-lg"
    >
      <span className="text-[11px] font-bold uppercase tracking-widest text-accent-deep">
        {kicker}
      </span>
      <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{body}</p>
      <span
        className={`mt-5 inline-block rounded-lg px-5 py-2.5 text-sm font-bold ${
          primary ? 'bg-primary text-white' : 'border border-primary text-primary'
        }`}
      >
        {cta} →
      </span>
    </Link>
  );
}
