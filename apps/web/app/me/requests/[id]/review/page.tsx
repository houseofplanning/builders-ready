import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { ReviewForm } from './review-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();

  const { data: job } = await supabase
    .from('job_requests')
    .select('id, title, matched_project_id')
    .eq('id', id)
    .eq('customer_id', me.user_id)
    .maybeSingle();
  if (!job || !job.matched_project_id) notFound();

  const { data: project } = await supabase
    .from('projects')
    .select('pm_id')
    .eq('id', job.matched_project_id)
    .maybeSingle();
  if (!project) notFound();

  const { data: existing } = await supabase
    .from('marketplace_reviews')
    .select('id')
    .eq('project_id', job.matched_project_id)
    .eq('direction', 'customer_to_trade')
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/me/requests/${id}`} className="text-sm font-bold text-primary hover:underline">
        ‹ Back
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Leave a review</h1>
      <p className="mt-1 text-sm text-ink-muted">{job.title}</p>

      {existing ? (
        <div className="mt-6 rounded-card border border-hairline bg-white p-8 text-center text-sm text-ink-muted">
          Thanks — you&rsquo;ve already reviewed this job.
        </div>
      ) : (
        <div className="mt-6">
          <ReviewForm
            projectId={job.matched_project_id}
            revieweeId={project.pm_id as string}
            backTo={`/me/requests/${id}`}
          />
        </div>
      )}
    </div>
  );
}
