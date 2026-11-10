'use client';

import { useEffect, useMemo, useState } from 'react';
import { confirmDialog } from '../../../../components/confirmDialog';
import { jsonInit } from '../../projects/useAdminAction';

export type TextValue = { en: string; ar: string; defaultEn: string; defaultAr: string };
export type TextState = Record<string, TextValue>;

type Snapshot<T> = { data?: T; text: TextState; savedAt: string };
type ErrorBody = { error?: string; issues?: { path: string; message: string }[] } | null;

function sameText(a: TextState, b: TextState): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key]?.en !== b[key]?.en || a[key]?.ar !== b[key]?.ar) return false;
  }
  return true;
}

/** "3.title.en" → "Learn Programming › Title › English" (with the editor's item names). */
function describePath(path: string, itemName?: (index: number) => string | undefined): string {
  return path
    .replace(/^data(\.|$)/, '')
    .split('.')
    .filter(Boolean)
    .map((part, i) => {
      if (/^\d+$/.test(part)) return (i === 0 && itemName?.(Number(part))) || `#${Number(part) + 1}`;
      if (part === 'en') return 'English';
      if (part === 'ar') return 'Arabic';
      const words = part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
      return words.charAt(0).toUpperCase() + words.slice(1);
    })
    .join(' › ');
}

/**
 * State for one content editor: the edited value, its saved baseline, save /
 * discard / reset, and a guard against leaving with unsaved changes.
 */
export function useContentEditor<T>({
  part,
  initial,
  initialText = {},
  initiallyEdited,
  itemName,
}: {
  part: string;
  initial: T;
  initialText?: TextState;
  /** Whether saved content exists (vs. the code's original). */
  initiallyEdited: boolean;
  /** Names list items in error messages. */
  itemName?: (value: T, index: number) => string | undefined;
}) {
  const [value, setValue] = useState(initial);
  const [text, setText] = useState(initialText);
  const [saved, setSaved] = useState({ value: initial, text: initialText });
  const [edited, setEdited] = useState(initiallyEdited);
  const [pending, setPending] = useState<'save' | 'reset' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const dirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(saved.value) || !sameText(text, saved.text),
    [value, text, saved]
  );

  async function request(method: 'PUT' | 'DELETE', body: unknown): Promise<Snapshot<T> | null> {
    setPending(method === 'PUT' ? 'save' : 'reset');
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/content/${part}`, jsonInit(method, body));
      const json = (await response.json().catch(() => null)) as (Snapshot<T> & ErrorBody) | null;
      if (!response.ok) {
        const issues = json?.issues ?? [];
        setError(
          issues.length
            ? issues
                .slice(0, 4)
                .map((issue) =>
                  issue.path
                    ? `${describePath(issue.path, (i) => itemName?.(value, i))}: ${issue.message}`
                    : issue.message
                )
                .join(' · ')
            : json?.error || `Request failed (${response.status}).`
        );
        return null;
      }
      return json;
    } catch {
      setError('Network error — please try again.');
      return null;
    } finally {
      setPending(null);
    }
  }

  function apply(snapshot: Snapshot<T>) {
    const nextValue = snapshot.data === undefined ? value : snapshot.data;
    const nextText = { ...text, ...snapshot.text };
    setValue(nextValue);
    setText(nextText);
    setSaved({ value: nextValue, text: nextText });
  }

  async function save() {
    if (pending || !dirty) return;
    const textEdits = Object.fromEntries(Object.entries(text).map(([key, v]) => [key, { en: v.en, ar: v.ar }]));
    const result = await request('PUT', {
      ...(part === 'text' ? {} : { data: value }),
      ...(Object.keys(textEdits).length ? { text: textEdits } : {}),
    });
    if (result) {
      apply(result);
      setEdited(true);
      setNotice('Saved. The public site shows it on the next page load.');
    }
  }

  async function reset() {
    if (pending) return;
    const ok = await confirmDialog({
      title: 'Go back to the original content?',
      message: 'Your saved changes on this page are removed and the site shows the content that ships with the code.',
      confirmLabel: 'Reset',
      cancelLabel: 'Keep my changes',
      danger: true,
    });
    if (!ok) return;
    const result = await request('DELETE', { textKeys: Object.keys(text) });
    if (result) {
      apply(result);
      setEdited(false);
      setNotice('Back to the original content.');
    }
  }

  function discard() {
    setValue(saved.value);
    setText(saved.text);
    setError('');
    setNotice('');
  }

  function updateText(key: string, next: { en: string; ar: string }) {
    setText((current) => ({ ...current, [key]: { ...current[key], ...next } }));
    setNotice('');
  }

  // Leaving with unsaved changes: the browser asks on reload/close; links ask here.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm('You have unsaved changes on this page. Leave without saving them?')) {
        // Capture phase on window: stops the click before <Link> or the navigation tracker sees it
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return {
    value,
    setValue: (next: T | ((current: T) => T)) => {
      setValue(next);
      setNotice('');
    },
    text,
    updateText,
    dirty,
    edited,
    pending,
    error,
    notice,
    save,
    discard,
    reset,
  };
}
