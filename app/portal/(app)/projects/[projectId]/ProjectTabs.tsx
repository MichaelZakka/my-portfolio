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
import { useTranslations } from 'next-intl';
import { useLive } from './LiveSections';
import styles from '../../../portal.module.css';

export const PROJECT_TABS = ['overview', 'milestones', 'meetings', 'messages', 'files', 'activity'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export function isProjectTab(value: unknown): value is ProjectTab {
  return typeof value === 'string' && (PROJECT_TABS as readonly string[]).includes(value);
}

type Tabs = { active: ProjectTab; select: (tab: ProjectTab) => void };
const TabsContext = createContext<Tabs | null>(null);

/** The open tab, or null outside <ProjectTabs> (sections still work on their own). */
export function useProjectTabs(): Tabs | null {
  return useContext(TabsContext);
}

/**
 * The project page's tabs (WAI-ARIA tabs pattern, automatic activation).
 * Every panel stays mounted and is only hidden, so live data, drafts and
 * open forms survive switching. The open tab is kept in ?tab= (replaceState,
 * no navigation) and the old #section links from emails still land on the
 * right tab.
 */
export default function ProjectTabs({
  initialTab,
  panels,
}: {
  initialTab: ProjectTab;
  panels: Record<ProjectTab, ReactNode>;
}) {
  const t = useTranslations('portal.project');
  const { data } = useLive();
  const [active, setActive] = useState<ProjectTab>(initialTab);
  const tabRefs = useRef<Partial<Record<ProjectTab, HTMLButtonElement | null>>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const select = useCallback((tab: ProjectTab, { focus = false, scroll = false } = {}) => {
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

  // Links from emails and older bookmarks use #meetings, #messages, …
  // The hash never reaches the server, so it is read once the page is up
  // (and again if it changes while the page is open).
  useEffect(() => {
    const openFromHash = () => {
      const fromHash = window.location.hash.slice(1);
      if (isProjectTab(fromHash)) select(fromHash);
    };
    const frame = requestAnimationFrame(openFromHash);
    window.addEventListener('hashchange', openFromHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', openFromHash);
    };
  }, [select]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const index = PROJECT_TABS.indexOf(active);
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
    let next: number | null = null;
    if (step) next = (index + step + PROJECT_TABS.length) % PROJECT_TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = PROJECT_TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    select(PROJECT_TABS[next], { focus: true });
  };

  const awaitingMeetings = data.meetings.filter((m) => m.canAccept).length;
  const counts: Partial<Record<ProjectTab, { value: number; alert?: boolean }>> = {
    meetings: awaitingMeetings ? { value: awaitingMeetings, alert: true } : undefined,
    messages: data.messages.length ? { value: data.messages.length } : undefined,
    files: data.files.length ? { value: data.files.length } : undefined,
  };

  const label = (tab: ProjectTab) => (tab === 'overview' ? t('tabOverview') : t(`${tab}Title`));

  return (
    <TabsContext.Provider value={{ active, select: (tab) => select(tab, { scroll: true }) }}>
      <div ref={listRef} role="tablist" aria-label={t('sectionsNav')} className={styles.tabList}>
        {PROJECT_TABS.map((tab) => {
          const count = counts[tab];
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
              className={styles.tab}
              onClick={() => select(tab)}
              onKeyDown={onKeyDown}
            >
              {label(tab)}
              {count && (
                <span className={styles.tabCount} data-alert={count.alert || undefined}>
                  {count.alert ? <span className="visually-hidden">{t('meetingAwaitingYou')}: </span> : null}
                  {count.value}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {PROJECT_TABS.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          hidden={active !== tab}
          tabIndex={0}
          className={styles.tabPanel}
        >
          {panels[tab]}
        </div>
      ))}
    </TabsContext.Provider>
  );
}
