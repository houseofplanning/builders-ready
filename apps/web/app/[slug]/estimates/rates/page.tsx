import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { SavedRate } from '@br/shared';
import { RatesManager } from './rates-manager';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RatesPage({ params }: Props) {
  const { slug } = await params;
  const { role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/estimates`);

  const supabase = await createSupabaseServer();
  const { data: rates } = await supabase
    .from('saved_rates')
    .select('*')
    .eq('active', true)
    .order('position', { ascending: true });

  return (
    <div>
      <header className="mb-6">
        <Link
          href={`/${slug}/estimates`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Quotes
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Saved rates
        </h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Your reusable materials and labour rates. Add them once and pull them
          into any quote with a tap — every figure stays editable on the quote
          itself.
        </p>
      </header>
      <RatesManager slug={slug} rates={(rates ?? []) as SavedRate[]} />
    </div>
  );
}
