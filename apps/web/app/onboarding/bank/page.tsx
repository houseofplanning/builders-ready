import { requireAuth } from '@/lib/tenant-resolver';
import { BankForm } from './bank-form';

export default async function BankStep() {
  const { tenant } = await requireAuth();
  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">Bank details</h1>
      <p className="mt-1 text-xs text-ink-muted">
        These appear on every invoice your clients receive. You can skip and fill in later from
        Settings.
      </p>
      <BankForm
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
