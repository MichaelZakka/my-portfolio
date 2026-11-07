'use server';

import { headers } from 'next/headers';
import { validateContact, type ContactErrors } from '../lib/contact';
import { sendContactEmail } from '../lib/email';
import { rateLimit } from '../lib/rateLimit';

export type ContactState =
  | { status: 'idle' }
  | { status: 'success' }
  /** `message` is a key under contact.errors */
  | { status: 'error'; message: 'fixFields' | 'rateLimited' | 'sendFailed'; fieldErrors?: ContactErrors };

const field = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real users never fill this hidden field
  if (field(formData, 'company')) return { status: 'success' };

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  if (!rateLimit(`contact:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 }).success) {
    return { status: 'error', message: 'rateLimited' };
  }

  const input = {
    name: field(formData, 'name'),
    email: field(formData, 'email'),
    message: field(formData, 'message'),
  };
  const fieldErrors = validateContact(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', message: 'fixFields', fieldErrors };
  }

  const result = await sendContactEmail(input);
  if (!result.sent) {
    console.error('Contact form email failed:', result.error);
    return { status: 'error', message: 'sendFailed' };
  }
  return { status: 'success' };
}
