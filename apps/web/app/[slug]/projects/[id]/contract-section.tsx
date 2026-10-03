'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  gbp,
  formatDate,
  milestoneAmountPence,
  summariseSchedule,
} from '@br/shared';
import {
  upsertContractOnWeb,
  sendContractOnWeb,
  deleteContractOnWeb,
  signContractOnWeb,
  raiseMilestoneInvoiceOnWeb,
} from '@/lib/server-actions/contracts';

export interface MilestoneView {
  id: string;
  name: string;
  percent: number | null;
  amount_pence: number | null;
  is_retention: boolean;
  invoice_id: string | null;
  invoice_status: string | null;
}

export interface ContractView {
  id: string;
  contract_sum_pence: number;
  terms: string | null;
  retention_percent: number;
  status: 'draft' | 'sent' | 'signed';
  signed_at: string | null;
  client_signature: string | null;
}

interface FormRow {
  key: string;
  name: string;
  mode: 'percent' | 'fixed';
  value: string;
  is_retention: boolean;
}

let seq = 0;
const newKey = () => `r${(seq += 1)}`;

function poundsToPence(s: string): number {
  const n = Number(s.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
function num(s: string): number {
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function defaultRows(): FormRow[] {
  return [
    { key: newKey(), name: 'Deposit', mode: 'percent', value: '25', is_retention: false },
    { key: newKey(), name: 'First fix complete', mode: 'percent', value: '25', is_retention: false },
    { key: newKey(), name: 'Second fix complete', mode: 'percent', value: '25', is_retention: false },
    { key: newKey(), name: 'On completion', mode: 'percent', value: '20', is_retention: false },
    { key: newKey(), name: 'Retention (released after snagging)', mode: 'percent', value: '5', is_retention: true },
  ];
}

export function ContractSection({
  projectId,
  contract,
  milestones,
  defaultContractSum,
  canWrite,
  canSign,
}: {
  projectId: string;
  contract: ContractView | null;
  milestones: MilestoneView[];
  defaultContractSum: number;
  canWrite: boolean;
  canSign: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (!contract && !canWrite) return null;

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex flex-wrap items-center gap-2 px-5 py-3">
        <h2 className="text-sm font-bold">Contract &amp; payments</h2>
        {contract && <StatusPill status={contract.status} />}
        {canWrite && contract && contract.status === 'draft' && !editing && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
            >
              Edit
            </button>
            <SendButton contractId={contract.id} />
          </div>
        )}
      </header>

      {!contract || editing ? (
        canWrite ? (
          <div className="border-t border-hairline px-5 py-4">
            <ContractForm
              projectId={projectId}
              contract={contract}
              milestones={milestones}
              defaultContractSum={defaultContractSum}
              onDone={() => setEditing(false)}
            />
          </div>
        ) : null
      ) : (
        <ContractDetail
          contract={contract}
          milestones={milestones}
          canWrite={canWrite}
          canSign={canSign}
        />
      )}
    </section>
  );
}

function ContractDetail({
  contract,
  milestones,
  canWrite,
  canSign,
}: {
  contract: ContractView;
  milestones: MilestoneView[];
  canWrite: boolean;
  canSign: boolean;
}) {
  const summary = summariseSchedule(
    contract.contract_sum_pence,
    milestones.map((m) => ({
      percent: m.percent,
      amount_pence: m.amount_pence,
      is_retention: m.is_retention,
    })),
  );
  const off = Math.abs(summary.difference_pence) > 50; // >50p out

  return (
    <div className="border-t border-hairline px-5 py-4">
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Contract sum
          </div>
          <div className="text-2xl font-extrabold tracking-tight">
            {gbp(contract.contract_sum_pence)}
          </div>
        </div>
        {summary.retention_pence > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Retention held
            </div>
            <div className="text-lg font-bold">{gbp(summary.retention_pence)}</div>
          </div>
        )}
        {off && (
          <div className="text-[11px] text-accent-deep">
            Schedule totals {gbp(summary.scheduled_total_pence)} ·{' '}
            {summary.difference_pence > 0 ? 'over' : 'under'} the contract sum by{' '}
            {gbp(Math.abs(summary.difference_pence))}
          </div>
        )}
      </div>

      {/* SCHEDULE */}
      <div className="overflow-hidden rounded-lg border border-hairline">
        {milestones.map((m, i) => {
          const amt = milestoneAmountPence(contract.contract_sum_pence, {
            percent: m.percent,
            amount_pence: m.amount_pence,
          });
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? 'border-t border-hairline' : ''
              }`}
            >
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {m.name}
                  {m.is_retention && (
                    <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                      retention
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {m.percent != null ? `${m.percent}% of contract` : 'fixed amount'}
                </div>
              </div>
              <div className="text-sm font-bold">{gbp(amt)}</div>
              <MilestoneStatus
                milestone={m}
                canWrite={canWrite}
                contractSigned={contract.status === 'signed'}
              />
            </div>
          );
        })}
      </div>

      {contract.terms && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Terms
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink">{contract.terms}</p>
        </div>
      )}

      {/* STATUS / SIGN */}
      {contract.status === 'signed' ? (
        <div className="mt-4 rounded-lg border border-[#B7E3D2] bg-[#E1F5EE] px-4 py-3 text-sm text-[#0F6E56]">
          Signed{contract.client_signature ? ` by ${contract.client_signature}` : ''}
          {contract.signed_at ? ` · ${formatDate(contract.signed_at)}` : ''}.
        </div>
      ) : contract.status === 'sent' ? (
        canSign ? (
          <SignForm contractId={contract.id} />
        ) : (
          <p className="mt-4 text-xs text-ink-muted">
            Sent to the client — awaiting their signature.
          </p>
        )
      ) : null}

      {canWrite && contract.status !== 'signed' && (
        <div className="mt-4">
          <DeleteButton contractId={contract.id} />
        </div>
      )}
    </div>
  );
}

function MilestoneStatus({
  milestone,
  canWrite,
  contractSigned,
}: {
  milestone: MilestoneView;
  canWrite: boolean;
  contractSigned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (milestone.invoice_id) {
    const paid = milestone.invoice_status === 'paid';
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          paid ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#E6F0FA] text-[#2563A8]'
        }`}
      >
        {paid ? 'Paid' : 'Invoiced'}
      </span>
    );
  }
  if (!canWrite) {
    return <span className="text-[10px] text-ink-muted">Not yet due</span>;
  }
  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await raiseMilestoneInvoiceOnWeb(milestone.id);
            if (!res.ok) setError(res.error ?? 'Failed.');
          });
        }}
        disabled={pending}
        title={
          contractSigned ? undefined : 'Tip: usually raised after the contract is signed'
        }
        className="rounded-lg border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50"
      >
        {pending ? '…' : milestone.is_retention ? 'Release retention' : 'Raise invoice'}
      </button>
      {error && <div className="mt-0.5 text-[10px] text-error">{error}</div>}
    </div>
  );
}

function ContractForm({
  projectId,
  contract,
  milestones,
  defaultContractSum,
  onDone,
}: {
  projectId: string;
  contract: ContractView | null;
  milestones: MilestoneView[];
  defaultContractSum: number;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sumText, setSumText] = useState(
    ((contract?.contract_sum_pence ?? defaultContractSum) / 100).toString(),
  );
  const [terms, setTerms] = useState(contract?.terms ?? '');
  const [rows, setRows] = useState<FormRow[]>(
    contract && milestones.length
      ? milestones.map((m) => ({
          key: newKey(),
          name: m.name,
          mode: m.amount_pence != null ? 'fixed' : 'percent',
          value:
            m.amount_pence != null
              ? (m.amount_pence / 100).toString()
              : String(m.percent ?? ''),
          is_retention: m.is_retention,
        }))
      : defaultRows(),
  );

  const contractSumPence = poundsToPence(sumText);
  const summary = useMemo(
    () =>
      summariseSchedule(
        contractSumPence,
        rows.map((r) => ({
          percent: r.mode === 'percent' ? num(r.value) : null,
          amount_pence: r.mode === 'fixed' ? poundsToPence(r.value) : null,
          is_retention: r.is_retention,
        })),
      ),
    [contractSumPence, rows],
  );

  function patch(key: string, p: Partial<FormRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  function onSubmit() {
    setError(null);
    if (contractSumPence <= 0) {
      setError('Enter the contract sum.');
      return;
    }
    const milestonesPayload = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        percent: r.mode === 'percent' ? num(r.value) : null,
        amount_pence: r.mode === 'fixed' ? poundsToPence(r.value) : null,
        is_retention: r.is_retention,
      }));
    if (milestonesPayload.length === 0) {
      setError('Add at least one payment milestone.');
      return;
    }
    const retention = milestonesPayload.find((m) => m.is_retention);
    startTransition(async () => {
      const res = await upsertContractOnWeb({
        project_id: projectId,
        contract_sum_pence: contractSumPence,
        terms: terms.trim() || null,
        retention_percent: retention?.percent ?? 0,
        milestones: milestonesPayload,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      onDone();
    });
  }

  const inputCls =
    'block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none';
  const lbl = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <label className="block">
          <span className={lbl}>Contract sum (£)</span>
          <input
            value={sumText}
            onChange={(e) => setSumText(e.target.value.replace(/[^0-9.]/g, ''))}
            className={inputCls}
          />
        </label>
        <div className="flex items-end">
          <p className="text-[11px] text-ink-muted">
            Defaults to the accepted quote plus signed variations. Build the
            schedule below — deposit, stages, and a retention held until snagging.
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={lbl}>Payment schedule</span>
          <button
            type="button"
            onClick={() =>
              setRows((p) => [
                ...p,
                { key: newKey(), name: '', mode: 'percent', value: '', is_retention: false },
              ])
            }
            className="rounded-md border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-canvas"
          >
            + Milestone
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((r) => {
            const amt = milestoneAmountPence(contractSumPence, {
              percent: r.mode === 'percent' ? num(r.value) : null,
              amount_pence: r.mode === 'fixed' ? poundsToPence(r.value) : null,
            });
            return (
              <div
                key={r.key}
                className="grid items-center gap-2 rounded-lg border border-hairline bg-canvas p-2 md:grid-cols-[2fr_auto_1fr_auto_auto]"
              >
                <input
                  value={r.name}
                  onChange={(e) => patch(r.key, { name: e.target.value })}
                  placeholder="Milestone name"
                  className="rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <select
                  value={r.mode}
                  onChange={(e) => patch(r.key, { mode: e.target.value as 'percent' | 'fixed' })}
                  className="rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm"
                >
                  <option value="percent">%</option>
                  <option value="fixed">£</option>
                </select>
                <input
                  value={r.value}
                  onChange={(e) => patch(r.key, { value: e.target.value.replace(/[^0-9.]/g, '') })}
                  placeholder={r.mode === 'percent' ? '25' : '5000'}
                  className="rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <span className="whitespace-nowrap text-xs font-bold text-ink">
                  {gbp(amt)}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[10px] text-ink-muted">
                    <input
                      type="checkbox"
                      checked={r.is_retention}
                      onChange={(e) => patch(r.key, { is_retention: e.target.checked })}
                    />
                    ret.
                  </label>
                  <button
                    type="button"
                    onClick={() => setRows((p) => (p.length > 1 ? p.filter((x) => x.key !== r.key) : p))}
                    className="text-[11px] font-semibold text-error hover:underline"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-ink-muted">
          Scheduled total: <span className="font-bold text-ink">{gbp(summary.scheduled_total_pence)}</span>
          {Math.abs(summary.difference_pence) > 50 && (
            <span className="text-accent-deep">
              {' '}
              · {summary.difference_pence > 0 ? 'over' : 'under'} the contract sum by{' '}
              {gbp(Math.abs(summary.difference_pence))}
            </span>
          )}
        </div>
      </div>

      <label className="block">
        <span className={lbl}>Terms (optional)</span>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={4}
          placeholder="Scope summary, payment terms, what's included/excluded…"
          className={inputCls}
        />
      </label>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save contract'}
        </button>
      </div>
    </div>
  );
}

function SendButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await sendContractOnWeb(contractId);
            if (!res.ok) setError(res.error ?? 'Failed.');
          });
        }}
        disabled={pending}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send to client'}
      </button>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </>
  );
}

function DeleteButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm('Delete this contract and its schedule?')) return;
        startTransition(async () => {
          await deleteContractOnWeb(contractId);
        });
      }}
      disabled={pending}
      className="text-[11px] font-semibold text-error hover:underline disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'Delete contract'}
    </button>
  );
}

function SignForm({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4 rounded-lg border border-hairline bg-canvas p-4">
      <div className="text-sm font-bold">Accept &amp; sign this contract</div>
      <p className="mt-1 text-xs text-ink-muted">
        Type your full name to agree the scope, sum and payment schedule above.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="flex-1 rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setError(null);
            if (name.trim().length < 2) {
              setError('Type your full name.');
              return;
            }
            startTransition(async () => {
              const res = await signContractOnWeb(contractId, name.trim());
              if (!res.ok) setError(res.error ?? 'Failed.');
            });
          }}
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Signing…' : 'Sign'}
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-error">{error}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: 'draft' | 'sent' | 'signed' }) {
  const cls =
    status === 'signed'
      ? 'bg-[#E1F5EE] text-[#0F6E56]'
      : status === 'sent'
        ? 'bg-[#E6F0FA] text-[#2563A8]'
        : 'bg-canvas text-ink-muted';
  const label = status === 'signed' ? 'Signed' : status === 'sent' ? 'Awaiting signature' : 'Draft';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
