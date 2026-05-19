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
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.buildersready.uk';
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
