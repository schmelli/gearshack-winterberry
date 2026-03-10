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
// Shared Base Layout
// =============================================================================

const BASE_URL = 'https://gearshack.app';
const HERO_IMAGE = `${BASE_URL}/images/headers/headerimage2.jpeg`;
const LOGO_IMAGE = `${BASE_URL}/logos/big_gearshack_logo.png`;

function emailLayout(opts: {
  locale: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText: string;
}): string {
  const ctaBlock = opts.ctaText && opts.ctaUrl
    ? `<tr><td style="padding:0 40px 32px" align="center">
        <a href="${opts.ctaUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;mso-padding-alt:0;text-align:center">
          <!--[if mso]><i style="letter-spacing:36px;mso-font-width:-100%;mso-text-raise:21pt">&nbsp;</i><![endif]-->
          <span style="mso-text-raise:10pt">${opts.ctaText}</span>
          <!--[if mso]><i style="letter-spacing:36px;mso-font-width:-100%">&nbsp;</i><![endif]-->
        </a>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="${opts.locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    @media (prefers-color-scheme:dark){
      .email-bg{background:#1a1a1a!important}
      .card{background:#262626!important}
      .heading{color:#f5f5f5!important}
      .body-text{color:#d4d4d4!important}
      .muted{color:#a3a3a3!important}
      .footer-cell{background:#1f1f1f!important;border-color:#333!important}
      .footer-text{color:#737373!important}
      .divider{border-color:#333!important}
    }
    @media only screen and (max-width:620px){
      .outer{width:100%!important;padding:16px!important}
      .card{border-radius:8px!important}
      .content{padding:28px 24px!important}
      .hero-img{height:160px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0f4f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table class="email-bg" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f4f3">
    <tr><td align="center" style="padding:40px 20px" class="outer">

      <!-- Card -->
      <table class="card" width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%">

        <!-- Hero Image -->
        <tr><td style="padding:0;line-height:0">
          <img class="hero-img" src="${HERO_IMAGE}" alt="Outdoor adventure" width="600" height="200" style="display:block;width:100%;height:200px;object-fit:cover;border:0">
        </td></tr>

        <!-- Logo Bar -->
        <tr><td style="padding:28px 40px 0;text-align:center">
          <img src="${LOGO_IMAGE}" alt="Gearshack" width="140" height="47" style="display:inline-block;width:140px;height:auto;border:0">
        </td></tr>

        <!-- Thin Divider -->
        <tr><td style="padding:20px 40px 0">
          <hr class="divider" style="border:0;border-top:1px solid #e5e7eb;margin:0">
        </td></tr>

        <!-- Heading -->
        <tr><td class="content" style="padding:28px 40px 0">
          <h1 class="heading" style="margin:0;color:#0f172a;font-size:24px;font-weight:700;line-height:1.3">${opts.heading}</h1>
        </td></tr>

        <!-- Body Text -->
        <tr><td class="content" style="padding:16px 40px 32px">
          <p class="body-text" style="margin:0;color:#374151;font-size:16px;line-height:1.7">${opts.body}</p>
        </td></tr>

        <!-- CTA Button -->
        ${ctaBlock}

        <!-- Signature -->
        <tr><td style="padding:0 40px 32px">
          <p class="muted" style="margin:0;color:#6b7280;font-size:14px;line-height:1.5">
            Happy trails! 🏔️<br>
            <span style="font-weight:600">The Gearshack Team</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td class="footer-cell" style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center">
                <p class="footer-text" style="margin:0 0 8px;color:#9ca3af;font-size:12px;line-height:1.5">${opts.footerText}</p>
                <p class="footer-text" style="margin:0;color:#9ca3af;font-size:12px">
                  <a href="${BASE_URL}" style="color:#16a34a;text-decoration:none;font-weight:500">gearshack.app</a>
                  &nbsp;&middot;&nbsp;
                  Smarter gear lists for outdoor adventures
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// Email Templates
// =============================================================================

function newsletterConfirmationHtml(locale: string): string {
  const isDE = locale === 'de';

  return emailLayout({
    locale,
    heading: isDE
      ? 'Willkommen bei Gearshack!'
      : 'Welcome to Gearshack!',
    body: isDE
      ? 'Danke, dass du dich angemeldet hast! Wir bauen gerade etwas richtig Gutes für Outdoor-Enthusiasten — und du bist von Anfang an dabei. Wir melden uns, sobald es losgeht.'
      : "Thanks for signing up! We're building something great for outdoor enthusiasts — and you're in from the start. We'll let you know as soon as we launch.",
    footerText: isDE
      ? 'Du erhältst diese E-Mail, weil du dich auf gearshack.app angemeldet hast.'
      : 'You received this email because you signed up at gearshack.app.',
  });
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
