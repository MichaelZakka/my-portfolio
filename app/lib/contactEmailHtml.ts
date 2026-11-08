/**
 * Email sent to the inbox when someone uses the homepage contact form.
 * Email clients ignore <style> blocks and modern CSS, so this is table layout
 * with inline styles only, in the site's navy + signal blue palette.
 */

export type ContactEmailData = {
  name: string;
  email: string;
  message: string;
};

const FONT = "'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const C = {
  page: '#07122a',
  card: '#0f1f38',
  cardInner: '#13284a',
  border: '#22385c',
  text: '#ffffff',
  muted: '#a9b4c6',
  dim: '#7d8ba3',
  accent: '#1a73ff',
  accentText: '#5c9dff',
  button: '#1668e8',
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/** "8 Nov 2026, 14:05 (Damascus)" — the inbox owner's local time. */
function formatReceived(date: Date): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Damascus',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${formatted} (Damascus)`;
}

/** Arabic messages read right to left; everything else left to right. */
function textDir(value: string): 'rtl' | 'ltr' {
  return /[؀-ۿ]/.test(value) ? 'rtl' : 'ltr';
}

export function buildContactSubject(data: ContactEmailData): string {
  return `New message from ${data.name} · Portfolio`;
}

export function buildContactEmailText(data: ContactEmailData, received = new Date()): string {
  return [
    'New message from your portfolio contact form',
    '',
    `Name:     ${data.name}`,
    `Email:    ${data.email}`,
    `Received: ${formatReceived(received)}`,
    '',
    '--- Message ---',
    data.message,
    '',
    `Reply directly to this email to answer ${data.name}.`,
  ].join('\n');
}

export function buildContactEmailHtml(data: ContactEmailData, received = new Date()): string {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const message = escapeHtml(data.message.trim()).replace(/\r?\n/g, '<br />');
  const dir = textDir(data.message);
  const initial = escapeHtml(Array.from(data.name.trim())[0]?.toUpperCase() || '?');
  const replyHref = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(
    'Re: your message on my portfolio'
  )}`;
  const preheader = escapeHtml(data.message.trim().replace(/\s+/g, ' ').slice(0, 110));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>New message from ${name}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Inbox preview text -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 4px 18px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${FONT};font-size:18px;font-weight:700;color:${C.text};">
                    Michael <span style="color:${C.accentText};">Zakka</span>
                  </td>
                  <td align="right" style="font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${C.dim};">
                    08 / Contact
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${C.card};border:1px solid ${C.border};border-radius:14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background:${C.accent};border-radius:14px 14px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <p style="margin:0 0 6px 0;font-family:${MONO};font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.accentText};">
                      New message
                    </p>
                    <h1 style="margin:0;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${C.text};">
                      ${name} reached out through your portfolio
                    </h1>
                  </td>
                </tr>

                <!-- Sender -->
                <tr>
                  <td style="padding:20px 28px 0 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cardInner};border:1px solid ${C.border};border-radius:10px;">
                      <tr>
                        <td width="64" valign="middle" style="padding:16px 0 16px 16px;">
                          <div style="width:44px;height:44px;line-height:44px;border-radius:50%;background:${C.accent};text-align:center;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;">
                            ${initial}
                          </div>
                        </td>
                        <td valign="middle" style="padding:16px 16px 16px 4px;">
                          <div style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.text};">${name}</div>
                          <a href="mailto:${email}" style="font-family:${FONT};font-size:14px;color:${C.accentText};text-decoration:none;word-break:break-all;">${email}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding:24px 28px 0 28px;">
                    <p style="margin:0 0 10px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.dim};">
                      Message
                    </p>
                    <div dir="${dir}" style="padding:4px 0 4px 16px;border-left:3px solid ${C.accent};font-family:${FONT};font-size:15px;line-height:1.65;color:${C.muted};text-align:${dir === 'rtl' ? 'right' : 'left'};">
                      ${message}
                    </div>
                  </td>
                </tr>

                <!-- Reply button -->
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:${C.button};border-radius:6px;">
                          <a href="${replyHref}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                            Reply to ${name} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Meta -->
                <tr>
                  <td style="padding:18px 28px 26px 28px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.dim};">
                    Received ${escapeHtml(formatReceived(received))}<br />
                    Or just hit reply: replies go straight to ${email}.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:18px 4px 0 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.dim};">
              Sent from the contact form on your portfolio.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
