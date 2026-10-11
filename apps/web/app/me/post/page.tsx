import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isInvitedClient } from '@/lib/customer-resolver';
import { PostJobForm } from './post-form';

export default async function PostJobPage() {
  // Invited project clients have no marketplace — send them to their project.
  if (await isInvitedClient()) redirect('/me');
  return (
    <div>
      <Link href="/me" className="text-sm font-bold text-primary hover:underline">
        ‹ Your requests
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Post a job</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Describe what you need and trades will come to you.
      </p>
      <div className="mt-6">
        <PostJobForm />
      </div>
    </div>
  );
}
