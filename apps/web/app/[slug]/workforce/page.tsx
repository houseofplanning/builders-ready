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
  const [resRes, docRes, memberRes] = await Promise.all([
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
    supabase
      .from('tenant_members')
      .select('user_id, role')
      .eq('tenant_id', tenant.id)
      .in('role', ['owner', 'pm']),
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

  // Account team (owner/PMs) — so they can be added to the schedule.
  const members = (memberRes.data ?? []) as { user_id: string; role: 'owner' | 'pm' }[];
  const memberIds = members.map((m) => m.user_id);
  const { data: profileRows } = memberIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', memberIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]));
  const linkedMemberIds = new Set(
    ((resRes.data ?? []) as Resource[]).map((r) => r.member_user_id).filter(Boolean) as string[],
  );
  const accountTeam = members.map((m) => ({
    user_id: m.user_id,
    full_name: nameById.get(m.user_id) ?? 'Team member',
    role: m.role,
    linked: linkedMemberIds.has(m.user_id),
  }));

  return <WorkforceManager initialResources={resources} accountTeam={accountTeam} />;
}
