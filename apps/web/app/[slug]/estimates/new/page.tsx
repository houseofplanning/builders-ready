import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { SavedRate } from '@br/shared';
import { EstimateForm } from '../estimate-form';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewEstimatePage({ params }: Props) {
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
      <header className="mb-6 flex items-center">
        <div>
          <Link
            href={`/${slug}/estimates`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Quotes
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">New quote</h1>
        </div>
      </header>
      <EstimateForm slug={slug} savedRates={(rates ?? []) as SavedRate[]} />
    </div>
  );
}
