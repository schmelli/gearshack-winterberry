/**
 * Email Service — Brevo (ex-Sendinblue) Integration
 *
 * Centralized email sending via Brevo Transactional API.
 * Used for: newsletter confirmations, system notifications.
 *
 * Auth emails (password reset, magic link) are handled by Supabase SMTP
 * configured to use Brevo SMTP in the Supabase Dashboard.
 */

import { BrevoClient } from '@getbrevo/brevo';

// =============================================================================
// Client Setup
// =============================================================================

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = 'info@gearshack.app';
const SENDER_NAME = 'Gearshack';

function getClient(): BrevoClient {
  if (!BREVO_API_KEY) {
    throw new Error('[EmailService] BREVO_API_KEY not configured');
  }

  return new BrevoClient({ apiKey: BREVO_API_KEY });
}

// =============================================================================
// Email Templates
// =============================================================================

function newsletterConfirmationHtml(locale: string): string {
  const isDE = locale === 'de';

  const heading = isDE
    ? 'Willkommen bei Gearshack!'
    : 'Welcome to Gearshack!';
  const body = isDE
    ? 'Danke für deine Anmeldung! Wir arbeiten an etwas Großartigem für Outdoor-Enthusiasten und melden uns, sobald es losgeht.'
    : "Thanks for signing up! We're building something great for outdoor enthusiasts and will let you know as soon as we launch.";
  const footer = isDE
    ? 'Du erhältst diese E-Mail, weil du dich auf gearshack.app angemeldet hast.'
    : 'You received this email because you signed up at gearshack.app.';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="background:#2d5016;padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:1px">GEARSHACK</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#18181b;font-size:22px">${heading}</h2>
          <p style="margin:0 0 24px;color:#3f3f46;font-size:16px;line-height:1.6">${body}</p>
          <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5">🏔️ — The Gearshack Team</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #e4e4e7">
          <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// Send Functions
// =============================================================================

export async function sendNewsletterConfirmation(
  email: string,
  locale: string = 'en',
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient();
    const isDE = locale === 'de';

    await client.transactionalEmails.sendTransacEmail({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email }],
      subject: isDE
        ? 'Willkommen bei Gearshack! 🏔️'
        : 'Welcome to Gearshack! 🏔️',
      htmlContent: newsletterConfirmationHtml(locale),
    });
    console.log(`[EmailService] Newsletter confirmation sent to ${email}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[EmailService] Failed to send to ${email}:`, msg);
    return { success: false, error: msg };
  }
}
