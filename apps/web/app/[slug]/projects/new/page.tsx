import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { ProjectForm } from './project-form';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

interface MemberOption {
  user_id: string;
  full_name: string;
  role: 'owner' | 'pm' | 'client';
}

export default async function NewProjectPage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role, user_id } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') {
    redirect(`/${slug}/projects`);
  }

  const supabase = await createSupabaseServer();
  const { data: members } = await supabase
    .from('tenant_members')
    .select('user_id, role, profile:profiles(full_name)')
    .eq('tenant_id', tenant.id);

  const options: MemberOption[] = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return {
      user_id: m.user_id,
      full_name: profile?.full_name ?? 'Unknown',
      role: m.role as 'owner' | 'pm' | 'client',
    };
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${slug}/projects`}
        className="mb-4 inline-block text-xs text-ink-muted hover:text-ink"
      >
        ← Back to projects
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Create a project</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Eight default stages will be auto-generated from the start and end dates. You can rename or
        re-time them after.
      </p>
      <div className="mt-6 rounded-card border border-hairline bg-white p-6 shadow-card">
        <ProjectForm
          slug={slug}
          members={options}
          currentUserId={user_id}
          currentUserRole={role}
        />
      </div>
    </div>
  );
}
