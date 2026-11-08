import { C, FONT, MONO, escapeHtml, formatReceived, textDir } from './emailTheme';
import {
  getBriefColorApproachLabel,
  getBriefDomainsLabel,
  getBriefProjectTypesLabel,
  type ProjectBriefPayload,
} from './projectBrief';

/** Email sent to the inbox when someone submits the "Work with me" survey. */

const NOT_PROVIDED = `<span style="color:${C.dim};">Not provided</span>`;

function display(value: string): string {
  const trimmed = value.trim();
  return trimmed ? escapeHtml(trimmed) : NOT_PROVIDED;
}

function multilines(value: string): string {
  const trimmed = value.trim();
  return trimmed ? escapeHtml(trimmed).replace(/\r?\n/g, '<br />') : NOT_PROVIDED;
}

function isSafeHex(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.trim());
}

function label(text: string): string {
  return `<span style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.dim};">${text}</span>`;
}

/** `source` is the client's own text, when there is any: Arabic answers then read right to left. */
function row(name: string, valueHtml: string, source = ''): string {
  const dir = textDir(source);
  return `
                <tr>
                  <td width="104" valign="top" style="width:104px;padding:3px 12px 16px 0;">${label(name)}</td>
                  <td valign="top" dir="${dir}" style="padding:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted};text-align:${dir === 'rtl' ? 'right' : 'left'};word-break:break-word;">${valueHtml}</td>
                </tr>`;
}

function section(title: string, bodyHtml: string): string {
  return `
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card};border:1px solid ${C.border};border-radius:14px;">
                <tr>
                  <td style="padding:22px 24px 6px 24px;">
                    <p style="margin:0 0 16px 0;font-family:${MONO};font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.accentText};">${title}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${bodyHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function stat(name: string, value: string, source: string, last = false): string {
  // Left aligned whatever the language, so the three labels and values stay lined up.
  return `
                <td width="33%" valign="top" style="width:33%;padding:16px 14px;text-align:left;${last ? '' : `border-right:1px solid ${C.border};`}">
                  <div>${label(name)}</div>
                  <div dir="${textDir(source)}" style="margin-top:6px;font-family:${FONT};font-size:14px;line-height:1.45;font-weight:600;color:${C.text};text-align:left;word-break:break-word;">${value}</div>
                </td>`;
}

/** The client's colors are their data, so each swatch keeps its own color rather than the theme's. */
function colorSwatch(name: string, color: string): string {
  const safe = isSafeHex(color) ? color.trim() : C.cardInner;
  return `
                        <td width="33%" valign="top" style="width:33%;padding:4px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cardInner};border:1px solid ${C.border};border-radius:10px;">
                            <tr>
                              <td height="52" style="height:52px;background:${safe};border-radius:9px 9px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                            <tr>
                              <td align="center" style="padding:10px 6px 12px 6px;">
                                <div>${label(name)}</div>
                                <div style="margin-top:4px;font-family:${MONO};font-size:12px;color:${C.text};">${escapeHtml(color.trim() || 'N/A')}</div>
                              </td>
                            </tr>
                          </table>
                        </td>`;
}

/** Same look as the tech chips in the site's hero. */
function chip(text: string): string {
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 10px;background:${C.cardInner};border:1px solid ${C.border};border-radius:6px;font-family:${MONO};font-size:12px;color:${C.text};">${escapeHtml(text)}</span>`;
}

export function buildBriefEmailHtml(data: ProjectBriefPayload, received = new Date()): string {
  const title = data.projectTitle.trim() || 'Untitled project';
  const titleDir = textDir(title);
  const name = escapeHtml(data.clientName);
  const email = escapeHtml(data.clientEmail);
  const company = data.company.trim();
  const initial = escapeHtml(Array.from(data.clientName.trim())[0]?.toUpperCase() || '?');
  const types = getBriefProjectTypesLabel(data);
  const domains = getBriefDomainsLabel(data);
  const colorApproach = getBriefColorApproachLabel(data);
  const personalityHtml = data.personalities.length > 0 ? data.personalities.map(chip).join('') : NOT_PROVIDED;
  const replyHref = `mailto:${encodeURIComponent(data.clientEmail)}?subject=${encodeURIComponent(`Re: ${title}`)}`;
  const firstName = escapeHtml(data.clientName.trim().split(/\s+/)[0] || 'client');
  const logoUrl = data.logoUrl.trim();
  const logoHtml = /^https?:\/\//i.test(logoUrl)
    ? `<a href="${escapeHtml(logoUrl)}" style="color:${C.accentText};text-decoration:none;word-break:break-all;">${escapeHtml(logoUrl)}</a>`
    : display(logoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>New project brief</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Inbox preview text -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">New brief from ${name}: ${escapeHtml(title)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 4px 18px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${FONT};font-size:18px;font-weight:700;color:${C.text};">
                    Michael <span style="color:${C.accentText};">Zakka</span>
                  </td>
                  <td align="right" style="font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${C.dim};">
                    Work with me
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card};border:1px solid ${C.border};border-radius:14px;">
                <tr>
                  <td style="height:4px;background:${C.accent};border-radius:13px 13px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:28px 24px 0 24px;">
                    <p style="margin:0 0 6px 0;font-family:${MONO};font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.accentText};">
                      New project brief
                    </p>
                    <h1 dir="${titleDir}" style="margin:0;font-family:${FONT};font-size:26px;line-height:1.3;font-weight:700;color:${C.text};text-align:${titleDir === 'rtl' ? 'right' : 'left'};">
                      ${escapeHtml(title)}
                    </h1>
                  </td>
                </tr>

                <!-- Sender -->
                <tr>
                  <td style="padding:20px 24px 0 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cardInner};border:1px solid ${C.border};border-radius:10px;">
                      <tr>
                        <td width="64" valign="middle" style="padding:16px 0 16px 16px;">
                          <div style="width:44px;height:44px;line-height:44px;border-radius:50%;background:${C.accent};text-align:center;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;">
                            ${initial}
                          </div>
                        </td>
                        <td valign="middle" style="padding:16px 16px 16px 4px;">
                          <div style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.text};">${name}${company ? `<span style="font-weight:400;color:${C.muted};"> · ${escapeHtml(company)}</span>` : ''}</div>
                          <a href="mailto:${email}" style="font-family:${FONT};font-size:14px;color:${C.accentText};text-decoration:none;word-break:break-all;">${email}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- At a glance -->
                <tr>
                  <td style="padding:12px 24px 24px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cardInner};border:1px solid ${C.border};border-radius:10px;">
                      <tr>${stat('Budget', display(data.budget), data.budget)}${stat('Timeline', display(data.timeline), data.timeline)}${stat('Type', escapeHtml(types), types, true)}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${section(
  'Project overview',
  `${row('Description', multilines(data.projectDescription), data.projectDescription)}${row('Domain', escapeHtml(domains), domains)}`
)}
${section(
  'Client',
  `${row('Name', display(data.clientName), data.clientName)}${row(
    'Email',
    `<a href="mailto:${email}" style="color:${C.accentText};text-decoration:none;">${email}</a>`
  )}${row('Company', display(data.company), data.company)}${row('Phone', display(data.phone))}`
)}
${section(
  'Brand identity',
  `${row('Existing brand', display(data.hasBrand), data.hasBrand)}${row('Brand name', display(data.brandName), data.brandName)}${row('Tagline', display(data.tagline), data.tagline)}${row('Personality', personalityHtml)}${row('References', multilines(data.references), data.references)}${row('Logo / assets', logoHtml)}`
)}
${section(
  'Colors &amp; visual direction',
  `
                <tr>
                  <td colspan="2" style="padding:0 0 14px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>${colorSwatch('Primary', data.primaryColor)}${colorSwatch('Secondary', data.secondaryColor)}${colorSwatch('Accent', data.accentColor)}
                      </tr>
                    </table>
                  </td>
                </tr>${row('Mood', display(data.mood), data.mood)}${row('Color approach', colorApproach === 'N/A' ? NOT_PROVIDED : escapeHtml(colorApproach))}${row('Visual notes', multilines(data.visualNotes), data.visualNotes)}`
)}

          <!-- Reply button -->
          <tr>
            <td align="center" style="padding:8px 0 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${C.button};border-radius:6px;">
                    <a href="${replyHref}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Reply to ${firstName} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px 4px 0 4px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.dim};">
              Received ${escapeHtml(formatReceived(received))}<br />
              Sent from the survey on your portfolio. Replies go straight to the client.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
