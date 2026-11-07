import {
  getBriefColorApproachLabel,
  getBriefDomainsLabel,
  getBriefProjectTypesLabel,
  type ProjectBriefPayload,
} from './projectBrief';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function display(value: string, fallback = 'Not provided'): string {
  const trimmed = value.trim();
  return trimmed ? escapeHtml(trimmed) : fallback;
}

function multilines(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Not provided';
  return escapeHtml(trimmed).replace(/\n/g, '<br />');
}

function isSafeHex(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.trim());
}

function row(label: string, valueHtml: string): string {
  return `
    <tr>
      <td style="padding:0 0 14px 0;vertical-align:top;width:132px;">
        <span style="display:inline-block;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">
          ${label}
        </span>
      </td>
      <td style="padding:0 0 14px 0;vertical-align:top;">
        <span style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#ececec;">
          ${valueHtml}
        </span>
      </td>
    </tr>`;
}

function section(title: string, bodyHtml: string): string {
  return `
    <tr>
      <td style="padding:0 0 22px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;">
          <tr>
            <td style="padding:22px 24px 8px 24px;border-bottom:1px solid #222;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.3;color:#f3f3f3;">
                ${title}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${bodyHtml}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function colorSwatch(label: string, color: string): string {
  const safe = isSafeHex(color) ? color.trim() : '#333333';
  const shown = escapeHtml(color.trim() || 'N/A');
  return `
    <td align="center" style="padding:4px;width:33.33%;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;">
        <tr>
          <td style="height:56px;background:${safe};border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:10px 8px 12px 8px;text-align:center;">
            <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9a9a9a;">
              ${label}
            </div>
            <div style="margin-top:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#e8e8e8;">
              ${shown}
            </div>
          </td>
        </tr>
      </table>
    </td>`;
}

function chip(text: string): string {
  return `
    <span style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;background:#1c1c1c;border:1px solid #333;border-radius:999px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#e8e8e8;">
      ${escapeHtml(text)}
    </span>`;
}

export function buildBriefEmailHtml(data: ProjectBriefPayload): string {
  const title = data.projectTitle.trim() || 'Untitled project';
  const types = getBriefProjectTypesLabel(data);
  const domains = getBriefDomainsLabel(data);
  const colorApproach = getBriefColorApproachLabel(data);
  const personalityHtml =
    data.personalities.length > 0
      ? data.personalities.map((trait) => chip(trait)).join('')
      : '<span style="color:#9a9a9a;">Not provided</span>';
  const replyHref = `mailto:${encodeURIComponent(data.clientEmail)}?subject=${encodeURIComponent(`Re: ${title}`)}`;
  const logoUrl = data.logoUrl.trim();
  const logoIsSafe = /^https?:\/\//i.test(logoUrl);
  const logoHtml = logoIsSafe
    ? `<a href="${escapeHtml(logoUrl)}" style="color:#f87171;text-decoration:none;word-break:break-all;">${escapeHtml(logoUrl)}</a>`
    : logoUrl
      ? escapeHtml(logoUrl)
      : 'Not provided';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>New project brief</title>
</head>
<body style="margin:0;padding:0;background:#050505;color:#ececec;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    New brief from ${escapeHtml(data.clientName)} — ${escapeHtml(title)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050505;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 0 18px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#f5f5f5;">
                    Michael Zakka
                  </td>
                  <td align="right" style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#dc2626;">
                    Portfolio intake
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 0 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#1a0f0f 0%,#121212 100%);border:1px solid #3a1f1f;border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#dc2626,#b91c1c);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 30px 28px;">
                    <p style="margin:0 0 10px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f87171;">
                      New project brief
                    </p>
                    <h1 style="margin:0 0 12px 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;font-weight:700;color:#ffffff;">
                      ${escapeHtml(title)}
                    </h1>
                    <p style="margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#b8b8b8;">
                      Submitted by <strong style="color:#f0f0f0;">${escapeHtml(data.clientName)}</strong>
                      ${data.company.trim() ? ` · ${escapeHtml(data.company.trim())}` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 0 22px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;">
                <tr>
                  <td style="padding:18px 20px;width:33.33%;border-right:1px solid #222;">
                    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">Budget</div>
                    <div style="margin-top:6px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#f0f0f0;">${display(data.budget)}</div>
                  </td>
                  <td style="padding:18px 20px;width:33.33%;border-right:1px solid #222;">
                    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">Timeline</div>
                    <div style="margin-top:6px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#f0f0f0;">${display(data.timeline)}</div>
                  </td>
                  <td style="padding:18px 20px;width:33.33%;">
                    <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">Type</div>
                    <div style="margin-top:6px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#f0f0f0;">${escapeHtml(types)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${section(
            'Project overview',
            `
              ${row('Description', multilines(data.projectDescription))}
              ${row('Domain', escapeHtml(domains))}
            `
          )}

          ${section(
            'Client',
            `
              ${row('Name', display(data.clientName))}
              ${row(
                'Email',
                `<a href="mailto:${escapeHtml(data.clientEmail)}" style="color:#f87171;text-decoration:none;">${escapeHtml(data.clientEmail)}</a>`
              )}
              ${row('Company', display(data.company))}
              ${row('Phone', display(data.phone))}
            `
          )}

          ${section(
            'Brand identity',
            `
              ${row('Existing brand', display(data.hasBrand))}
              ${row('Brand name', display(data.brandName))}
              ${row('Tagline', display(data.tagline))}
              ${row('Personality', personalityHtml)}
              ${row('References', multilines(data.references))}
              ${row('Logo / assets', logoHtml)}
            `
          )}

          ${section(
            'Colors & visual direction',
            `
              <tr>
                <td colspan="2" style="padding:0 0 16px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      ${colorSwatch('Primary', data.primaryColor)}
                      ${colorSwatch('Secondary', data.secondaryColor)}
                      ${colorSwatch('Accent', data.accentColor)}
                    </tr>
                  </table>
                </td>
              </tr>
              ${row('Mood', display(data.mood))}
              ${row('Color approach', escapeHtml(colorApproach))}
              ${row('Visual notes', multilines(data.visualNotes))}
            `
          )}

          <tr>
            <td style="padding:4px 0 28px 0;" align="center">
              <a href="${replyHref}" style="display:inline-block;padding:14px 28px;background:#dc2626;border-radius:999px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                Reply to ${escapeHtml(data.clientName.split(' ')[0] || 'client')}
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 8px 8px 8px;text-align:center;">
              <p style="margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6e6e6e;">
                Sent from your portfolio intake survey · Reply goes directly to the client.
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
