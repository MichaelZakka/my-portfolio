'use client';

import { createContext } from 'react';

/**
 * Provided by the admin project screen: re-reads its data after a change.
 * Panels use it instead of router.refresh(), which on Next 16.1.1 can skip
 * applying a refresh whose response arrives within a few milliseconds.
 */
export const ProjectViewContext = createContext<{ reload: () => Promise<void> } | null>(null);
