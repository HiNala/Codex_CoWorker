"use client";

import { useCallback, useState } from "react";

/**
 * Controlled/uncontrolled expansion of hierarchical plan steps.
 * Status never changes here — disclosure only toggles visibility.
 */
export function useStepDisclosure(
  initial: Iterable<string> = [],
  controlled?: {
    expandedIds: Set<string>;
    onExpandedChange: (ids: Set<string>) => void;
  },
) {
  const [internal, setInternal] = useState(() => new Set(initial));
  const expandedIds = controlled?.expandedIds ?? internal;

  const setExpanded = useCallback(
    (next: Set<string>) => {
      if (controlled) {
        controlled.onExpandedChange(next);
      } else {
        setInternal(next);
      }
    },
    [controlled],
  );

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(expandedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExpanded(next);
    },
    [expandedIds, setExpanded],
  );

  const expand = useCallback(
    (id: string) => {
      if (expandedIds.has(id)) return;
      const next = new Set(expandedIds);
      next.add(id);
      setExpanded(next);
    },
    [expandedIds, setExpanded],
  );

  const collapse = useCallback(
    (id: string) => {
      if (!expandedIds.has(id)) return;
      const next = new Set(expandedIds);
      next.delete(id);
      setExpanded(next);
    },
    [expandedIds, setExpanded],
  );

  return { expandedIds, isExpanded, toggle, expand, collapse, setExpanded };
}
