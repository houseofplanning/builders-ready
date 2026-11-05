import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { Resource, ResourceDocument } from '@br/shared';
import { WorkforceManager, type ResourceWithDocs } from './workforce-manager';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: 'Team & rates · Builders Ready' };

export default async function WorkforcePage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

  const supabase = await createSupabaseServer();
  const [resRes, docRes] = await Promise.all([
    supabase
      .from('resources')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_name', { ascending: true }),
    supabase
      .from('resource_documents')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('expires_on', { ascending: true }),
  ]);

  const docsByResource = new Map<string, ResourceDocument[]>();
  for (const d of (docRes.data ?? []) as ResourceDocument[]) {
    const list = docsByResource.get(d.resource_id) ?? [];
    list.push(d);
    docsByResource.set(d.resource_id, list);
  }

  const resources: ResourceWithDocs[] = ((resRes.data ?? []) as Resource[]).map((r) => ({
    ...r,
    documents: docsByResource.get(r.id) ?? [],
  }));

  return <WorkforceManager initialResources={resources} />;
}
