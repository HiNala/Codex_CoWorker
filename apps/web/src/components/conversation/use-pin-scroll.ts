"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PIN_THRESHOLD_PX = 48;

/**
 * Auto-scroll pins only while the user is already at the bottom.
 * When new items arrive off-pin, expose a "N new" count instead of yanking.
 */
export function usePinScroll(itemCount: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinBottom = useRef(true);
  const prevCount = useRef(0);
  const [newCount, setNewCount] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinBottom.current = distance < PIN_THRESHOLD_PX;
    if (pinBottom.current) setNewCount(0);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (itemCount > prevCount.current) {
      const delta = itemCount - prevCount.current;
      if (pinBottom.current) {
        el.scrollTop = el.scrollHeight;
        setNewCount(0);
      } else {
        setNewCount((c) => c + delta);
      }
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  const jumpToLatest = useCallback(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinBottom.current = true;
    setNewCount(0);
  }, []);

  return { scrollerRef, newCount, onScroll, jumpToLatest };
}
