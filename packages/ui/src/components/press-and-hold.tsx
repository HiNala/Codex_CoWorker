"use client";

import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "../cn";
import { motion } from "../motion";

export interface PressAndHoldProps {
  onComplete: () => void;
  durationMs?: number;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  /** Accessible name when children are decorative */
  label?: string;
  /** Keyboard path: normal click opens confirm; second activation confirms */
  keyboardConfirmLabel?: string;
}

/**
 * 600ms press-and-hold with ring fill. Release cancels.
 * Keyboard users get a two-step confirm — never require holding a key.
 * Progress is pointer-duration driven for the hold UX only; completion is intentional, not fake status.
 */
export function PressAndHold({
  onComplete,
  durationMs = motion.pressAndHoldMs,
  disabled,
  className,
  children,
  label,
  keyboardConfirmLabel = "Press again to confirm",
}: PressAndHoldProps) {
  const [progress, setProgress] = useState(0);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const completed = useRef(false);

  const clear = useCallback(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    start.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(
    (ts: number) => {
      if (start.current == null) start.current = ts;
      const elapsed = ts - start.current;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p >= 1 && !completed.current) {
        completed.current = true;
        clear();
        onComplete();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [clear, durationMs, onComplete],
  );

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    completed.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    raf.current = requestAnimationFrame(tick);
  };

  const onPointerUp = () => {
    if (!completed.current) clear();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!confirmArmed) {
      setConfirmArmed(true);
      return;
    }
    setConfirmArmed(false);
    onComplete();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={confirmArmed ? keyboardConfirmLabel : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      onKeyDown={onKeyDown}
      onBlur={() => setConfirmArmed(false)}
      className={cn(
        "relative inline-flex min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform duration-[var(--dur-instant)] active:scale-[0.98] disabled:opacity-50",
        confirmArmed && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        className,
      )}
      data-press-progress={progress.toFixed(2)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 origin-left bg-primary-foreground/20"
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className="relative z-10">{confirmArmed ? keyboardConfirmLabel : children}</span>
    </button>
  );
}
