/** Shared contact-form validation, used by the client form and the server action. */
export type ContactInput = { name: string; email: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 5000 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact({ name, email, message }: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (name.length < CONTACT_LIMITS.name.min || name.length > CONTACT_LIMITS.name.max) {
    errors.name = `Please enter your name (${CONTACT_LIMITS.name.min}–${CONTACT_LIMITS.name.max} characters).`;
  }
  if (!EMAIL_RE.test(email) || email.length > CONTACT_LIMITS.email.max) {
    errors.email = 'Please enter a valid email address.';
  }
  if (message.length < CONTACT_LIMITS.message.min || message.length > CONTACT_LIMITS.message.max) {
    errors.message = `Your message should be ${CONTACT_LIMITS.message.min}–${CONTACT_LIMITS.message.max} characters.`;
  }
  return errors;
}
