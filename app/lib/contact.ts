/** Shared contact-form validation, used by the client form and the server action. */
export type ContactInput = { name: string; email: string; message: string };
/** Values are message keys under contact.errors (translated where they are shown). */
export type ContactErrors = Partial<Record<keyof ContactInput, 'name' | 'email' | 'message'>>;

export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 5000 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact({ name, email, message }: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (name.length < CONTACT_LIMITS.name.min || name.length > CONTACT_LIMITS.name.max) {
    errors.name = 'name';
  }
  if (!EMAIL_RE.test(email) || email.length > CONTACT_LIMITS.email.max) {
    errors.email = 'email';
  }
  if (message.length < CONTACT_LIMITS.message.min || message.length > CONTACT_LIMITS.message.max) {
    errors.message = 'message';
  }
  return errors;
}
