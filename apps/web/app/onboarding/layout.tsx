import { requireAuth } from '@/lib/tenant-resolver';
import { OnboardingProgress } from '@/components/onboarding-progress';

/**
 * Onboarding layout — gates on auth (any tenant), renders the progress
 * strip across all four steps.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8 flex items-center">
          <div className="font-extrabold tracking-[0.2em] text-sm">
            BUILDERS <span className="text-primary">READY</span>
          </div>
          <div className="ml-auto">
            <OnboardingProgress />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
