/* eslint-disable no-console */
/**
 * Cross-tenant isolation test for Builders Ready.
 *
 * Programmatically creates two test tenants ("alpha" and "beta") via the
 * service_role key, then signs in as each anon user and asserts every
 * business query returns only the caller's tenant rows.
 *
 * Run from the repo root:
 *   pnpm dlx tsx apps/web/scripts/test-isolation.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local (no extra deps).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------- env loader (no dotenv dep) ----------
function loadEnv(filePath: string) {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const k = m[1];
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '../.env.local');
loadEnv(envPath);

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SVC) {
  console.error(
    `Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY in ${envPath} (already done if you wired apps/web/.env.local).`,
  );
  process.exit(1);
}

const admin = createClient(URL, SVC, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- test data ----------
const NONCE = Math.random().toString(36).slice(2, 8);
const ALPHA = {
  email: `alpha-${NONCE}@isolation.test`,
  password: 'IsolationTest1234!',
  name: 'Alpha Builders',
  slug: `alpha-${NONCE}`,
};
const BETA = {
  email: `beta-${NONCE}@isolation.test`,
  password: 'IsolationTest1234!',
  name: 'Beta Builders',
  slug: `beta-${NONCE}`,
};

interface Created {
  userId: string;
  tenantId: string;
  projectId: string;
}

async function createTenantFor(t: typeof ALPHA): Promise<Created> {
  const { data: u, error: ue } = await admin.auth.admin.createUser({
    email: t.email,
    password: t.password,
    email_confirm: true,
    user_metadata: { full_name: `${t.name} Owner` },
  });
  if (ue || !u.user) throw new Error(`create user: ${ue?.message}`);

  const trialEnds = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const { data: tr, error: te } = await admin
    .from('tenants')
    .insert({
      slug: t.slug,
      name: t.name,
      business_email: t.email,
      owner_user_id: u.user.id,
      subscription_tier: 'starter',
      subscription_status: 'trialing',
      trial_ends_at: trialEnds,
    })
    .select('id')
    .single();
  if (te || !tr) throw new Error(`create tenant: ${te?.message}`);

  const { error: me } = await admin.from('tenant_members').insert({
    tenant_id: tr.id,
    user_id: u.user.id,
    role: 'owner',
  });
  if (me) throw new Error(`create membership: ${me.message}`);

  const { data: pr, error: pe } = await admin
    .from('projects')
    .insert({
      tenant_id: tr.id,
      name: `${t.name} Project`,
      address_line1: '1 Test Street',
      city: 'London',
      postcode: 'W1A 1AA',
      client_id: u.user.id,
      pm_id: u.user.id,
      start_date: '2026-01-01',
      estimated_end_date: '2026-12-31',
    })
    .select('id')
    .single();
  if (pe || !pr) throw new Error(`create project: ${pe?.message}`);

  return { userId: u.user.id, tenantId: tr.id, projectId: pr.id };
}

async function signInAs(t: typeof ALPHA): Promise<SupabaseClient> {
  const c = createClient(URL!, ANON!);
  const { error } = await c.auth.signInWithPassword({
    email: t.email,
    password: t.password,
  });
  if (error) throw new Error(`sign-in as ${t.email}: ${error.message}`);
  return c;
}

// ---------- assertions ----------
type Failure = string;
const failures: Failure[] = [];

function expect(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

async function countMine(
  c: SupabaseClient,
  table: string,
  expectedId: string,
): Promise<number> {
  const { data, error } = await c.from(table).select('id');
  if (error) {
    failures.push(`${table}: query errored — ${error.message}`);
    return -1;
  }
  if (!data) return 0;
  const otherTenant = data.find((r) => r.id !== expectedId);
  if (otherTenant) {
    failures.push(
      `${table}: alpha saw a row that should be hidden (id=${otherTenant.id})`,
    );
  }
  return data.length;
}

async function main() {
  console.log('Creating two test tenants...');
  let alpha: Created | null = null;
  let beta: Created | null = null;

  try {
    alpha = await createTenantFor(ALPHA);
    beta = await createTenantFor(BETA);
    console.log(`  alpha tenant=${alpha.tenantId.slice(0, 8)} project=${alpha.projectId.slice(0, 8)}`);
    console.log(`  beta  tenant=${beta.tenantId.slice(0, 8)} project=${beta.projectId.slice(0, 8)}`);

    console.log('\nSigning in as alpha and querying everything...');
    const aClient = await signInAs(ALPHA);

    const aTenants = await countMine(aClient, 'tenants', alpha.tenantId);
    const aProjects = await countMine(aClient, 'projects', alpha.projectId);
    const { data: aMembers } = await aClient.from('tenant_members').select('user_id');
    const { data: aInvoices } = await aClient.from('invoices').select('id');
    const { data: aDecisions } = await aClient.from('decisions').select('id');
    const { data: aVariations } = await aClient.from('variations').select('id');

    expect(aTenants === 1, `alpha should see exactly 1 tenant, saw ${aTenants}`);
    expect(aProjects === 1, `alpha should see exactly 1 project, saw ${aProjects}`);
    expect(
      (aMembers?.length ?? 0) === 1 && aMembers![0].user_id === alpha.userId,
      `alpha tenant_members leak: ${JSON.stringify(aMembers)}`,
    );
    expect((aInvoices ?? []).length === 0, `alpha invoices should be empty`);
    expect((aDecisions ?? []).length === 0, `alpha decisions should be empty`);
    expect((aVariations ?? []).length === 0, `alpha variations should be empty`);

    console.log('Signing in as beta and querying everything...');
    const bClient = await signInAs(BETA);

    const bTenants = await countMine(bClient, 'tenants', beta.tenantId);
    const bProjects = await countMine(bClient, 'projects', beta.projectId);
    const { data: bMembers } = await bClient.from('tenant_members').select('user_id');

    expect(bTenants === 1, `beta should see exactly 1 tenant, saw ${bTenants}`);
    expect(bProjects === 1, `beta should see exactly 1 project, saw ${bProjects}`);
    expect(
      (bMembers?.length ?? 0) === 1 && bMembers![0].user_id === beta.userId,
      `beta tenant_members leak: ${JSON.stringify(bMembers)}`,
    );

    console.log('\nAttempting cross-tenant write (alpha → beta) ...');
    const { error: writeErr } = await aClient.from('projects').insert({
      tenant_id: beta.tenantId,
      name: 'Should be denied',
      address_line1: 'x',
      city: 'x',
      postcode: 'X1 1XX',
      client_id: alpha.userId,
      pm_id: alpha.userId,
      start_date: '2026-01-01',
      estimated_end_date: '2026-12-31',
    });
    expect(
      !!writeErr,
      `cross-tenant write should be denied, but it succeeded (RLS leak!)`,
    );
    if (writeErr) console.log(`  ✓ denied as expected: ${writeErr.message}`);
  } catch (err) {
    console.error('Setup error:', err);
    failures.push(String(err));
  } finally {
    console.log('\nCleaning up test users...');
    if (alpha) await admin.auth.admin.deleteUser(alpha.userId).catch(() => null);
    if (beta) await admin.auth.admin.deleteUser(beta.userId).catch(() => null);
  }

  console.log();
  if (failures.length) {
    console.error('❌ FAILED — cross-tenant isolation is broken:');
    for (const f of failures) console.error('   ' + f);
    process.exit(1);
  }
  console.log('✅ PASSED — RLS is enforcing tenant isolation correctly.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
