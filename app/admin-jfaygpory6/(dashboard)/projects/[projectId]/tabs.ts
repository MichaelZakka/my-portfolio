/**
 * The admin project screen's tab ids. Kept out of AdminProjectTabs.tsx
 * ('use client') so the server page can call isAdminProjectTab(): a server
 * module importing from a client module only gets client references, which
 * cannot be called.
 */
export const ADMIN_PROJECT_TABS = [
  'overview',
  'milestones',
  'meetings',
  'messages',
  'files',
  'clients',
  'activity',
  'settings',
] as const;
export type AdminProjectTab = (typeof ADMIN_PROJECT_TABS)[number];

export function isAdminProjectTab(value: unknown): value is AdminProjectTab {
  return typeof value === 'string' && (ADMIN_PROJECT_TABS as readonly string[]).includes(value);
}
