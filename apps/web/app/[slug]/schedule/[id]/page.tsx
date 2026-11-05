import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

// Per-project schedule moved to its own tab/route. Keep old links working.
export default async function LegacyProjectScheduleRedirect({ params }: Props) {
  const { slug, id } = await params;
  redirect(`/${slug}/project-schedule/${id}`);
}
