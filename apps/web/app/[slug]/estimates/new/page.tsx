import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { SavedRate } from '@br/shared';
import { EstimateForm } from '../estimate-form';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    pt?: string;
    title?: string;
    address?: string;
    postcode?: string;
  }>;
}

export default async function NewEstimatePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/estimates`);

  const sp = await searchParams;
  // Prefill from Planning Radar ("+ Create a quote") when params are present.
  const seed =
    sp.pt || sp.title || sp.address
      ? {
          title: sp.title ?? undefined,
          project_type: sp.pt ?? undefined,
          lines: [],
          site_address_line1: sp.address ?? null,
          postcode: sp.postcode ?? null,
          note:
            'Started from Planning Radar — site address and job type are filled in. Pick your template, add your prices, then add the client when you have them.',
        }
      : undefined;

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
      <EstimateForm slug={slug} savedRates={(rates ?? []) as SavedRate[]} seed={seed} />
    </div>
  );
}
