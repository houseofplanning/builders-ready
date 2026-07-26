import 'server-only';
import { Resend } from 'resend';

/**
 * Resend client + transactional email senders.
 *
 * Required env:
 *   RESEND_API_KEY        — API key from the Resend dashboard
 *   RESEND_FROM_EMAIL     — "Builders Ready <info@buildersready.uk>"
 *   NEXT_PUBLIC_APP_URL   — base URL for accept links
 */

let resendSingleton: Resend | null = null;

function getResend(): Resend {
  if (resendSingleton) return resendSingleton;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  resendSingleton = new Resend(apiKey);
  return resendSingleton;
}

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL ?? 'Builders Ready <info@buildersready.uk>'
  );
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildersready.uk';
}

// -------------------------------------------------------------------------
// Invitation email
// -------------------------------------------------------------------------
export interface InvitationEmailParams {
  to: string;
  tenantName: string;
  inviterName: string;
  role: 'pm' | 'client';
  token: string;
}

const ROLE_LABEL = {
  pm: 'Project Manager',
  client: 'Client',
} as const;

const ROLE_CONTEXT = {
  pm:
    "As a Project Manager, you'll be able to post site updates, change stage statuses, raise decisions, propose variations and create invoices on the projects assigned to you.",
  client:
    "As a Client, you'll be able to follow your project's progress in real time, accept decisions, sign variations and view invoices — all on a clean mobile app.",
} as const;

export async function sendInvitationEmail(p: InvitationEmailParams): Promise<void> {
  const acceptUrl = `${appUrl()}/accept?token=${encodeURIComponent(p.token)}`;
  const roleLabel = ROLE_LABEL[p.role];
  const subject = `${p.inviterName} invited you to join ${p.tenantName} on Builders Ready`;

  const html = renderInvitationHtml({
    tenantName: p.tenantName,
    inviterName: p.inviterName,
    roleLabel,
    roleContext: ROLE_CONTEXT[p.role],
    acceptUrl,
  });

  const text = [
    `${p.inviterName} has invited you to join ${p.tenantName} on Builders Ready as a ${roleLabel}.`,
    '',
    ROLE_CONTEXT[p.role],
    '',
    'Accept the invitation:',
    acceptUrl,
    '',
    'This link expires in 7 days. If you weren’t expecting this email, you can safely ignore it.',
    '',
    '— Builders Ready',
  ].join('\n');

  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: p.to,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend rejected the email: ${error.message ?? 'unknown'}`);
  }
}

// -------------------------------------------------------------------------
// HTML template — minimal, table-based for email-client compatibility
// -------------------------------------------------------------------------
function renderInvitationHtml(args: {
  tenantName: string;
  inviterName: string;
  roleLabel: string;
  roleContext: string;
  acceptUrl: string;
}): string {
  // Inline styles only — most email clients strip <style> blocks.
  const PRIMARY = '#0F4C5C';
  const ACCENT = '#E07A5F';
  const INK = '#0B1418';
  const MUTED = '#5F7480';
  const HAIRLINE = '#E1E6E9';
  const CANVAS = '#F4F6F7';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>You're invited to ${escapeHtml(args.tenantName)}</title>
  </head>
  <body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CANVAS};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid ${HAIRLINE};">
                <div style="font-weight:800;letter-spacing:2px;font-size:13px;color:${INK};">
                  BUILDERS <span style="color:${PRIMARY};">READY</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <div style="font-size:11px;font-weight:600;color:${PRIMARY};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;">
                  You're invited
                </div>
                <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:800;color:${INK};">
                  Join <span style="color:${PRIMARY};">${escapeHtml(args.tenantName)}</span> on Builders Ready
                </h1>
                <p style="margin:0 0 14px;font-size:14px;line-height:22px;color:${INK};">
                  <strong>${escapeHtml(args.inviterName)}</strong> has invited you to join
                  <strong>${escapeHtml(args.tenantName)}</strong> as a
                  <strong>${escapeHtml(args.roleLabel)}</strong>.
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:${MUTED};">
                  ${escapeHtml(args.roleContext)}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">
                  <tr>
                    <td bgcolor="${PRIMARY}" style="border-radius:10px;">
                      <a href="${args.acceptUrl}"
                         style="display:inline-block;padding:14px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                         Accept invitation &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px;font-size:12px;line-height:18px;color:${MUTED};">
                  Or paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:12px;line-height:18px;color:${PRIMARY};word-break:break-all;">
                  <a href="${args.acceptUrl}" style="color:${PRIMARY};">${args.acceptUrl}</a>
                </p>
                <div style="height:1px;background:${HAIRLINE};margin:8px 0 20px;"></div>
                <p style="margin:0;font-size:12px;line-height:18px;color:${MUTED};">
                  This link expires in 7 days. If you didn't expect this email you can safely
                  ignore it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:${CANVAS};border-top:1px solid ${HAIRLINE};">
                <p style="margin:0;font-size:11px;line-height:16px;color:${MUTED};">
                  Builders Ready &middot; the client portal for UK builders
                  &middot; <a href="https://buildersready.uk" style="color:${ACCENT};">buildersready.uk</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// -------------------------------------------------------------------------
// New tenant signup notification — internal alert to ops
// -------------------------------------------------------------------------
export interface SignupNotificationParams {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  slug: string;
  tier: 'starter' | 'pro' | 'unlimited';
}

// -------------------------------------------------------------------------
// Welcome email — sent to the owner immediately after they sign up
// -------------------------------------------------------------------------
export interface WelcomeEmailParams {
  to: string;
  ownerName: string;
  businessName: string;
  slug: string;
}

export async function sendWelcomeEmail(p: WelcomeEmailParams): Promise<void> {
  const firstName = (p.ownerName ?? '').trim().split(/\s+/)[0] || 'there';
  const subject = 'Welcome to Builders Ready';
  const dashboardUrl = `${appUrl()}/${encodeURIComponent(p.slug)}/dashboard`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Thanks for signing up to Builders Ready — welcome aboard!`,
    ``,
    `You're all set up for ${p.businessName}. Builders Ready gives each of your clients a branded app that follows every milestone, decision, variation and invoice — and you run it all from one dashboard.`,
    ``,
    `A few things worth trying first:`,
    `- Create your first project (about a minute)`,
    `- Invite a client so they get the app on their phone`,
    `- Raise a decision or propose a variation and watch it get signed off`,
    `- Generate the one-click handover PDF at the end of a job`,
    ``,
    `Open your dashboard: ${dashboardUrl}`,
    ``,
    `I really hope you enjoy using it. If you have any feedback, or an idea for a feature you'd love to see, just reply to this email — I read every one.`,
    ``,
    `All the best,`,
    `The Builders Ready team`,
    `buildersready.uk`,
  ].join('\n');

  const PRIMARY = '#0F4C5C';
  const INK = '#0B1418';
  const MUTED = '#5F7480';
  const HAIRLINE = '#E1E6E9';
  const CANVAS = '#F4F6F7';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-weight:800;letter-spacing:2px;font-size:13px;color:${INK};">BUILDERS <span style="color:${PRIMARY};">READY</span></div>
          </td></tr>
          <tr><td style="padding:26px 28px;">
            <div style="font-size:11px;font-weight:600;color:${PRIMARY};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Welcome aboard</div>
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:800;color:${INK};">Thanks for signing up, ${escapeHtml(firstName)}</h1>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${INK};">You're all set up for <strong>${escapeHtml(p.businessName)}</strong>. Builders Ready gives each of your clients a branded app that follows every milestone, decision, variation and invoice — and you run it all from one dashboard.</p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${INK};">A few things worth trying first:</p>
            <ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.7;color:${INK};">
              <li>Create your first project — it takes about a minute</li>
              <li>Invite a client so they get the app on their phone</li>
              <li>Raise a decision or propose a variation and watch it get signed off</li>
              <li>Generate the one-click handover PDF at the end of a job</li>
            </ul>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:10px;background:${PRIMARY};">
              <a href="${dashboardUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Open your dashboard &rarr;</a>
            </td></tr></table>
            <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:${INK};">I really hope you enjoy using it. If you have any feedback, or an idea for a feature you'd love to see, just reply to this email — I read every one.</p>
            <p style="margin:16px 0 0;font-size:14px;color:${INK};">All the best,<br/>The Builders Ready team</p>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid ${HAIRLINE};font-size:11px;color:${MUTED};">
            Builders Ready · <a href="https://buildersready.uk" style="color:${PRIMARY};">buildersready.uk</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: p.to,
    subject,
    html,
    text,
  });
  if (error) {
    // Never block signup on a welcome email — log for visibility.
    console.error('[welcome-email] resend rejected', error);
  }
}

// -------------------------------------------------------------------------
// Cancellation emails — sent from the Stripe webhook when a subscription
// is cancelled. One warm win-back email to the customer, one ops alert.
// -------------------------------------------------------------------------
export interface CancellationEmailParams {
  to: string;
  ownerName: string;
  businessName: string;
}

export async function sendCancellationEmail(p: CancellationEmailParams): Promise<void> {
  const firstName = (p.ownerName ?? '').trim().split(/\s+/)[0] || 'there';
  const subject = 'Sorry to see you go';

  const text = [
    `Hi ${firstName},`,
    ``,
    `We noticed you cancelled your Builders Ready subscription — sorry to see you go.`,
    ``,
    `If there's anything that didn't click — a missing feature, something that got in the way, or the timing just wasn't right — I'd genuinely love to hear it. Just reply to this email; I read every message and it shapes what we build next.`,
    ``,
    `Your account and data are safe, and you can pick up right where you left off any time at https://buildersready.uk.`,
    ``,
    `Thanks for giving us a go — the door's always open.`,
    ``,
    `All the best,`,
    `The Builders Ready team`,
    `buildersready.uk`,
  ].join('\n');

  const PRIMARY = '#0F4C5C';
  const INK = '#0B1418';
  const MUTED = '#5F7480';
  const HAIRLINE = '#E1E6E9';
  const CANVAS = '#F4F6F7';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-weight:800;letter-spacing:2px;font-size:13px;color:${INK};">BUILDERS <span style="color:${PRIMARY};">READY</span></div>
          </td></tr>
          <tr><td style="padding:26px 28px;">
            <div style="font-size:11px;font-weight:600;color:${PRIMARY};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Subscription cancelled</div>
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:800;color:${INK};">Sorry to see you go, ${escapeHtml(firstName)}</h1>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${INK};">We noticed you cancelled your Builders Ready subscription. No hard feelings — but if there's anything that didn't click for you, I'd genuinely love to know.</p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${INK};">A missing feature? Something that got in the way? The timing just wasn't right? Just reply to this email — I read every message, and it shapes what we build next.</p>
            <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${INK};">Your account and data are safe, and you can pick up right where you left off any time.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:10px;background:${PRIMARY};">
              <a href="https://buildersready.uk" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Come back any time &rarr;</a>
            </td></tr></table>
            <p style="margin:22px 0 0;font-size:14px;color:${INK};">All the best,<br/>The Builders Ready team</p>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid ${HAIRLINE};font-size:11px;color:${MUTED};">
            Builders Ready · <a href="https://buildersready.uk" style="color:${PRIMARY};">buildersready.uk</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to: p.to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[cancellation-email] resend rejected', error);
  }
}

export interface CancellationNotificationParams {
  businessName: string;
  ownerEmail: string;
  tier: string;
}

export async function sendCancellationNotification(
  p: CancellationNotificationParams,
): Promise<void> {
  const to = process.env.SIGNUP_NOTIFICATION_EMAIL ?? 'info@buildersready.uk';
  const subject = `Cancellation: ${p.businessName} (${p.tier})`;

  const text = [
    `A tenant has cancelled their Builders Ready subscription.`,
    ``,
    `Business name : ${p.businessName}`,
    `Owner email   : ${p.ownerEmail}`,
    `Tier          : ${p.tier}`,
    `Cancelled at  : ${new Date().toUTCString()}`,
    ``,
    `— Builders Ready`,
  ].join('\n');

  const PRIMARY = '#0F4C5C';
  const INK = '#0B1418';
  const MUTED = '#5F7480';
  const HAIRLINE = '#E1E6E9';
  const CANVAS = '#F4F6F7';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-weight:800;letter-spacing:2px;font-size:13px;color:${INK};">BUILDERS <span style="color:${PRIMARY};">READY</span></div>
          </td></tr>
          <tr><td style="padding:24px 28px;">
            <div style="font-size:11px;font-weight:600;color:#8B2635;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Cancellation</div>
            <h1 style="margin:0 0 14px;font-size:20px;line-height:1.25;font-weight:800;color:${INK};">${escapeHtml(p.businessName)} cancelled</h1>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;line-height:20px;color:${INK};">
              <tr><td style="padding:4px 0;color:${MUTED};width:130px;">Business</td><td>${escapeHtml(p.businessName)}</td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Owner email</td><td><a href="mailto:${escapeHtml(p.ownerEmail)}" style="color:${PRIMARY};">${escapeHtml(p.ownerEmail)}</a></td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Tier</td><td><strong>${escapeHtml(p.tier)}</strong></td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Cancelled at</td><td>${escapeHtml(new Date().toUTCString())}</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[cancellation-notification] resend rejected', error);
  }
}

export async function sendSignupNotification(
  p: SignupNotificationParams,
): Promise<void> {
  const to =
    process.env.SIGNUP_NOTIFICATION_EMAIL ?? 'info@buildersready.uk';
  const subject = `New Builders Ready signup: ${p.businessName} (${p.tier})`;

  const text = [
    `A new tenant just signed up for Builders Ready.`,
    ``,
    `Business name : ${p.businessName}`,
    `Slug          : ${p.slug}`,
    `Owner         : ${p.ownerName}`,
    `Owner email   : ${p.ownerEmail}`,
    `Tier          : ${p.tier}`,
    `Signed up at  : ${new Date().toUTCString()}`,
    ``,
    `Open the tenant: ${appUrl()}/${p.slug}/dashboard`,
    ``,
    `— Builders Ready signup bot`,
  ].join('\n');

  const PRIMARY = '#0F4C5C';
  const INK = '#0B1418';
  const MUTED = '#5F7480';
  const HAIRLINE = '#E1E6E9';
  const CANVAS = '#F4F6F7';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fff;border:1px solid ${HAIRLINE};border-radius:14px;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-weight:800;letter-spacing:2px;font-size:13px;color:${INK};">BUILDERS <span style="color:${PRIMARY};">READY</span></div>
          </td></tr>
          <tr><td style="padding:24px 28px;">
            <div style="font-size:11px;font-weight:600;color:${PRIMARY};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">
              New signup
            </div>
            <h1 style="margin:0 0 14px;font-size:20px;line-height:1.25;font-weight:800;color:${INK};">
              ${escapeHtml(p.businessName)} just signed up
            </h1>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;line-height:20px;color:${INK};margin:8px 0 16px;">
              <tr><td style="padding:4px 0;color:${MUTED};width:130px;">Business name</td><td>${escapeHtml(p.businessName)}</td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Slug</td><td><code>${escapeHtml(p.slug)}</code></td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Owner</td><td>${escapeHtml(p.ownerName)}</td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Owner email</td><td><a href="mailto:${escapeHtml(p.ownerEmail)}" style="color:${PRIMARY};">${escapeHtml(p.ownerEmail)}</a></td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Tier</td><td><strong>${escapeHtml(p.tier)}</strong></td></tr>
              <tr><td style="padding:4px 0;color:${MUTED};">Signed up at</td><td>${escapeHtml(new Date().toUTCString())}</td></tr>
            </table>
            <p style="margin:14px 0 0;font-size:13px;color:${MUTED};">
              <a href="${appUrl()}/${encodeURIComponent(p.slug)}/dashboard" style="color:${PRIMARY};font-weight:700;">Open tenant dashboard &rarr;</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  try {
    const { error } = await getResend().emails.send({
      from: fromAddress(),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      // Don't throw — a failed ops notification shouldn't block the
      // signup flow. Log to the server for visibility instead.
      console.error('[signup-notification] resend rejected', error);
    }
  } catch (err) {
    console.error('[signup-notification] send failed', err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
