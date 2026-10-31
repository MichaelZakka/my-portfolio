/**
 * The project page's tab ids. Kept out of ProjectTabs.tsx ('use client') so
 * the server page can call isProjectTab(): a server module importing from a
 * client module only gets client references, which cannot be called.
 */
export const PROJECT_TABS = ['overview', 'milestones', 'meetings', 'messages', 'files', 'activity'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export function isProjectTab(value: unknown): value is ProjectTab {
  return typeof value === 'string' && (PROJECT_TABS as readonly string[]).includes(value);
}
