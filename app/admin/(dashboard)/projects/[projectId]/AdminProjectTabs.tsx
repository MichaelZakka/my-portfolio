'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ADMIN_PROJECT_TABS, isAdminProjectTab, type AdminProjectTab } from './tabs';
import projectStyles from '../projects.module.css';

export const ADMIN_TAB_LABELS: Record<AdminProjectTab, string> = {
  overview: 'Overview',
  milestones: 'Milestones & tasks',
  meetings: 'Meetings',
  messages: 'Messages',
  files: 'Files',
  clients: 'Clients',
  activity: 'Activity',
  settings: 'Settings',
};

type Tabs = { active: AdminProjectTab; select: (tab: AdminProjectTab) => void };
const TabsContext = createContext<Tabs | null>(null);

/** The open tab, or null outside the tabs (panels still work on their own). */
export function useAdminProjectTabs(): Tabs | null {
  return useContext(TabsContext);
}

export type TabBadge = { value: number; tone?: 'alert' | 'danger' };

/**
 * Tabs for the admin project screen (WAI-ARIA tabs pattern, automatic
 * activation). Panels stay mounted and are only hidden, so drafts and open
 * forms survive switching. The open tab lives in ?tab= (replaceState); the
 * #meetings links in notification emails open their tab.
 */
export default function AdminProjectTabs({
  initialTab,
  panels,
  badges,
}: {
  initialTab: AdminProjectTab;
  panels: Record<AdminProjectTab, ReactNode>;
  badges: Partial<Record<AdminProjectTab, TabBadge>>;
}) {
  const [active, setActive] = useState<AdminProjectTab>(initialTab);
  const tabRefs = useRef<Partial<Record<AdminProjectTab, HTMLButtonElement | null>>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const select = useCallback((tab: AdminProjectTab, { focus = false, scroll = false } = {}) => {
    setActive(tab);
    const url = new URL(window.location.href);
    if (tab === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    url.hash = '';
    window.history.replaceState(window.history.state, '', url);
    const button = tabRefs.current[tab];
    if (focus) button?.focus();
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (scroll) listRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  // The hash never reaches the server, so it is read once the page is up.
  useEffect(() => {
    const openFromHash = () => {
      const fromHash = window.location.hash.slice(1);
      if (isAdminProjectTab(fromHash)) select(fromHash);
    };
    const frame = requestAnimationFrame(openFromHash);
    window.addEventListener('hashchange', openFromHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', openFromHash);
    };
  }, [select]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = ADMIN_PROJECT_TABS.indexOf(active);
    const last = ADMIN_PROJECT_TABS.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % ADMIN_PROJECT_TABS.length
        : event.key === 'ArrowLeft'
          ? (index + last) % ADMIN_PROJECT_TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(ADMIN_PROJECT_TABS[next], { focus: true });
  };

  return (
    <TabsContext.Provider value={{ active, select: (tab) => select(tab, { scroll: true }) }}>
      <div ref={listRef} role="tablist" aria-label="Project sections" className={projectStyles.tabList}>
        {ADMIN_PROJECT_TABS.map((tab) => {
          const badge = badges[tab];
          return (
            <button
              key={tab}
              ref={(node) => {
                tabRefs.current[tab] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-controls={`panel-${tab}`}
              aria-selected={active === tab}
              tabIndex={active === tab ? 0 : -1}
              className={projectStyles.tab}
              onClick={() => select(tab)}
              onKeyDown={onKeyDown}
            >
              {ADMIN_TAB_LABELS[tab]}
              {badge && badge.value > 0 && (
                <span className={projectStyles.tabCount} data-tone={badge.tone}>
                  {badge.value}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {ADMIN_PROJECT_TABS.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          hidden={active !== tab}
          tabIndex={0}
          className={projectStyles.tabPanel}
        >
          {panels[tab]}
        </div>
      ))}
    </TabsContext.Provider>
  );
}
