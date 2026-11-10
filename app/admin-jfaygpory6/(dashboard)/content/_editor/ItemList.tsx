'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { confirmDialog } from '../../../../components/confirmDialog';
import c from '../content.module.css';

type Patch<T> = Partial<T> | ((item: T) => T);

function applyPatch<T>(item: T, patch: Patch<T>): T {
  return typeof patch === 'function' ? (patch as (item: T) => T)(item) : { ...item, ...patch };
}

/**
 * A reorderable list of collapsible items (projects, roles, links…). Items are
 * keyed locally so editing an item's own id or slug doesn't reset it.
 */
export function ItemList<T>({
  items,
  onChange,
  title,
  meta,
  leading,
  children,
  create,
  addLabel,
  empty,
  noun,
  max,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  title: (item: T, index: number) => string;
  meta?: (item: T) => ReactNode;
  leading?: (item: T) => ReactNode;
  children: (item: T, update: (patch: Patch<T>) => void, index: number) => ReactNode;
  create: () => T;
  addLabel: string;
  empty: string;
  /** "project", "link"… for buttons and the delete confirmation. */
  noun: string;
  max?: number;
}) {
  const [keys, setKeys] = useState(() => items.map((_, i) => `i${i}`));
  const [open, setOpen] = useState<string[]>([]);
  // The list was replaced (saved, discarded or reset): line the keys up again
  if (keys.length !== items.length) setKeys(items.map((_, i) => keys[i] ?? `r${i}-${items.length}`));

  const toggle = (key: string) =>
    setOpen((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  const update = (index: number) => (patch: Patch<T>) =>
    onChange(items.map((item, i) => (i === index ? applyPatch(item, patch) : item)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const nextKeys = [...keys];
    [nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]];
    [nextKeys[index], nextKeys[target]] = [nextKeys[target], nextKeys[index]];
    setKeys(nextKeys);
    onChange(nextItems);
  };

  const remove = async (index: number) => {
    const ok = await confirmDialog({
      title: `Delete this ${noun}?`,
      message: `“${title(items[index], index)}” is removed from the site when you save.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setKeys(keys.filter((_, i) => i !== index));
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    const key = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setKeys([...keys, key]);
    setOpen([...open, key]);
    onChange([...items, create()]);
    window.setTimeout(() => {
      document.getElementById(`item-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const full = max !== undefined && items.length >= max;

  return (
    <>
      {items.length === 0 ? (
        <p className={c.empty}>{empty}</p>
      ) : (
        <ul className={c.items}>
          {items.map((item, index) => {
            const key = keys[index] ?? `i${index}`;
            const isOpen = open.includes(key);
            const name = title(item, index);
            return (
              <li key={key} id={`item-${key}`} className={`${c.item} ${isOpen ? c.itemOpen : ''}`}>
                <div className={c.itemHead}>
                  <button
                    type="button"
                    className={c.itemToggle}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? `body-${key}` : undefined}
                    onClick={() => toggle(key)}
                  >
                    <ChevronRight size={18} className={c.itemChevron} aria-hidden="true" />
                    {leading?.(item)}
                    <span className={c.itemTitle}>
                      <span className={c.itemName}>{name}</span>
                      {meta && <span className={c.itemMeta}>{meta(item)}</span>}
                    </span>
                  </button>
                  <div className={c.itemActions}>
                    <button
                      type="button"
                      className={c.iconButton}
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${name} up`}
                      title="Move up"
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={c.iconButton}
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${name} down`}
                      title="Move down"
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${c.iconButton} ${c.iconButtonDanger}`}
                      onClick={() => remove(index)}
                      aria-label={`Delete ${name}`}
                      title="Delete"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div id={`body-${key}`} className={c.itemBody}>
                    {children(item, update(index), index)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className={c.addButton} onClick={add} disabled={full}>
        <Plus size={17} aria-hidden="true" />
        {full ? `Limit reached (${max})` : addLabel}
      </button>
    </>
  );
}

/** Small rows inside an item (achievements, skills, collaborators): move and remove without a dialog. */
export function RowList<T>({
  items,
  onChange,
  render,
  create,
  addLabel,
  noun,
  max,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Patch<T>) => void, index: number) => ReactNode;
  create: () => T;
  addLabel: string;
  noun: string;
  max?: number;
}) {
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const full = max !== undefined && items.length >= max;
  return (
    <div className={c.rows}>
      {items.map((item, index) => (
        <div key={index} className={c.row}>
          <div>{render(item, (patch) => onChange(items.map((it, i) => (i === index ? applyPatch(it, patch) : it))), index)}</div>
          <div className={c.rowActions}>
            <button
              type="button"
              className={c.iconButton}
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Move ${noun} ${index + 1} up`}
              title="Move up"
            >
              <ArrowUp size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${c.iconButton} ${c.iconButtonDanger}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`Remove ${noun} ${index + 1}`}
              title="Remove"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className={c.smallAdd} onClick={() => onChange([...items, create()])} disabled={full}>
        <Plus size={14} aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}
