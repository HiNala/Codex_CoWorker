"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ComposerProps {
  disabled?: boolean;
  disabledReason?: string;
  onSend?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Large composer: ⌘/Ctrl+Enter sends, Esc blurs.
 * Disabled with an explicit reason while awaiting approval.
 */
export function Composer({
  disabled,
  disabledReason,
  onSend,
  placeholder = "Ask Nala to do something, or reply…",
  className,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const canSend = !disabled && value.trim().length > 0;

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend?.(text);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={cn("shrink-0 border-t border-border bg-card/80 p-3 backdrop-blur", className)}>
      <Textarea
        className="min-h-[88px] resize-none text-[15px]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label="Message composer"
        aria-disabled={disabled || undefined}
        aria-describedby={
          disabled && disabledReason ? "composer-disabled-reason" : "composer-hints"
        }
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          id={disabled && disabledReason ? "composer-disabled-reason" : "composer-hints"}
          className={cn(
            "text-xs",
            disabled && disabledReason
              ? "text-[color:var(--status-warning)]"
              : "text-muted-foreground",
          )}
        >
          {disabled && disabledReason
            ? disabledReason
            : "⌘↵ to send · Esc blur · /pause /artifacts /cost"}
        </span>
        <Button
          type="button"
          size="lg"
          className="min-h-11 min-w-[5.5rem] px-5"
          disabled={!canSend}
          title={disabled ? disabledReason : "Send message (⌘↵)"}
          onClick={submit}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
