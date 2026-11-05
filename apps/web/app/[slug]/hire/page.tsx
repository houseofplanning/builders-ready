import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { searchTradespeople } from '@/lib/server-actions/connections';
import { listMySubJobPosts } from '@/lib/server-actions/sub-jobs';
import { HireDirectory } from './hire-directory';
import { SubJobPoster } from './sub-job-poster';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: 'Find subbies · Builders Ready' };

export default async function HirePage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

  const [initial, { data: hiredRows }] = await Promise.all([
    searchTradespeople(null, null),
    (await createSupabaseServer())
      .from('resources')
      .select('marketplace_tenant_id')
      .eq('tenant_id', tenant.id)
      .not('marketplace_tenant_id', 'is', null),
  ]);

  const myPosts = await listMySubJobPosts();

  const hiredIds = (hiredRows ?? [])
    .map((r) => (r as { marketplace_tenant_id: string | null }).marketplace_tenant_id)
    .filter(Boolean) as string[];

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Find subbies</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Local tradespeople available for work. Add one to your team to schedule and cost them like
          any subcontractor. Their profile, rating and certs come from their own Builders Ready account.
        </p>
      </header>
      <HireDirectory initialRows={initial.rows ?? []} initialHiredIds={hiredIds} />

      <SubJobPoster posts={myPosts.posts} bids={myPosts.bids} />
    </div>
  );
}
