/**
 * Turns a raw email-delivery error (mostly Resend's) into a short explanation
 * and the fix, for the admin's "link created, email not sent" cards.
 */
export function explainEmailProblem(error: string | undefined): { reason: string; fix: string | null } {
  const raw = error ?? '';
  if (/only send testing emails|verify a domain/i.test(raw)) {
    return {
      reason: 'Email is still in test mode, so it can only go to your own address.',
      fix: 'Verify your domain at resend.com/domains and set RESEND_FROM_EMAIL to an address on it.',
    };
  }
  if (/RESEND_API_KEY is not configured/i.test(raw)) {
    return { reason: 'Email sending is not set up on this site.', fix: 'Add RESEND_API_KEY to the environment variables.' };
  }
  if (/invalid.*(to|email)|not a valid/i.test(raw)) {
    return { reason: 'The email address looks invalid.', fix: 'Check the address for typos and send again.' };
  }
  return { reason: 'The email service rejected the message.', fix: null };
}
