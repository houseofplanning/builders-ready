import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { listForHireWork, type ForHireJob } from '@/lib/server-actions/for-hire';
import { listOpenSubJobs } from '@/lib/server-actions/sub-jobs';
import { ForHireEditor } from './for-hire-editor';
import { ForHireWork } from './for-hire-work';
import { SubJobBidder } from './sub-job-bidder';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: 'For Hire profile · Builders Ready' };

export default async function ForHirePage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner') redirect(`/${slug}/dashboard`);

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from('tenants')
    .select('discoverable, day_rate_pence, day_rate_unit, for_hire_trades, service_area')
    .eq('id', tenant.id)
    .single();

  const work = await listForHireWork();
  const openJobs = await listOpenSubJobs();

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">For Hire profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Switch on to let other builders find you for work and bid on their jobs. Off by default:
          nothing is listed until you turn it on. Your profile, reviews and certs come from the work
          you already do on Builders Ready.
        </p>
      </header>
      <ForHireEditor
        initial={{
          discoverable: Boolean(data?.discoverable),
          day_rate_pence: (data?.day_rate_pence as number | null) ?? null,
          day_rate_unit: (data?.day_rate_unit as 'day' | 'hour' | null) ?? 'day',
          trades: (data?.for_hire_trades as string[] | null) ?? [],
          service_area: (data?.service_area as string | null) ?? null,
        }}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">Work from other builders</h2>
        <ForHireWork initial={(work.rows ?? []) as ForHireJob[]} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">Open jobs to bid on</h2>
        <SubJobBidder initial={openJobs.posts} />
      </section>
    </div>
  );
}
