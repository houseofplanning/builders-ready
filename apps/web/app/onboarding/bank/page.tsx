import { requireAuth } from '@/lib/tenant-resolver';
import { SetupChoice } from './setup-choice';

export default async function BankStep() {
  const { tenant } = await requireAuth();
  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">How would you like to get paid?</h1>
      <p className="mt-1 text-xs text-ink-muted">
        Choose how your clients pay you for the work. You can change this any
        time in Billing settings — and this is separate from your Builders Ready
        subscription (already set up in the previous step).
      </p>
      <SetupChoice
        isUnlimited={tenant.subscription_tier === 'unlimited'}
        initial={{
          bank_name: tenant.bank_name,
          bank_account_name: tenant.bank_account_name ?? tenant.name,
          bank_sort_code: tenant.bank_sort_code,
          bank_account_number: tenant.bank_account_number,
          vat_number: tenant.vat_number,
          company_number: tenant.company_number,
        }}
      />
    </section>
  );
}
