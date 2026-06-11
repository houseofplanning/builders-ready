import { requireAuth } from '@/lib/tenant-resolver';
import { BankForm } from './bank-form';

export default async function BankStep() {
  const { tenant } = await requireAuth();
  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">
        Your invoice details (for your clients to pay you)
      </h1>
      <p className="mt-1 text-xs text-ink-muted">
        Your bank account, VAT number and Companies House number — printed on
        every invoice you send your clients so they can pay you by bank
        transfer. You can skip and fill in later from Settings.
      </p>
      <div className="mt-4 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-xs text-ink">
        <strong className="font-bold">This is not how you&rsquo;re charged.</strong>{' '}
        Builders Ready takes your subscription payment via Stripe in the
        previous step. Anything you enter here is purely for display on the
        invoices you send to your clients.
      </div>
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
