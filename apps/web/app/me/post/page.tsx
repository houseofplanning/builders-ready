import Link from 'next/link';
import { PostJobForm } from './post-form';

export default function PostJobPage() {
  return (
    <div>
      <Link href="/me" className="text-sm font-bold text-primary hover:underline">
        ‹ Your requests
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Post a job</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Free to post. Describe what you need and trades will come to you.
      </p>
      <div className="mt-6">
        <PostJobForm />
      </div>
    </div>
  );
}
