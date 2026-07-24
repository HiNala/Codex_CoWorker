"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArtifactStatus, ArtifactType } from "@forge/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ArtifactListItem } from "./seed";

const TYPE_OPTIONS: Array<{ value: "" | ArtifactType; label: string }> = [
  { value: "", label: "All types" },
  { value: "document.markdown", label: "Document" },
  { value: "table.typed", label: "Table" },
  { value: "code.change", label: "Code change" },
  { value: "capability.package", label: "Capability" },
  { value: "receipt.assignment", label: "Receipt" },
];

const STATUS_OPTIONS: Array<{ value: "" | ArtifactStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
  { value: "published", label: "Published" },
  { value: "ready_for_review", label: "Ready for review" },
  { value: "drafting", label: "Drafting" },
  { value: "archived", label: "Archived" },
];

function typeLabel(type: ArtifactType): string {
  switch (type) {
    case "document.markdown":
      return "Document";
    case "table.typed":
      return "Table";
    case "code.change":
      return "Code";
    case "capability.package":
      return "Capability";
    case "receipt.assignment":
      return "Receipt";
    default:
      return type;
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function OutputsLibrary({ items }: { items: ArtifactListItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"" | ArtifactType>("");
  const [status, setStatus] = useState<"" | ArtifactStatus>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (type && item.type !== type) return false;
      if (status && item.status !== status) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [items, query, type, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md">
          <label htmlFor="outputs-search" className="mb-1.5 block text-xs text-muted-foreground">
            Search
          </label>
          <Input
            id="outputs-search"
            type="search"
            placeholder="Search title, summary, type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="outputs-type" className="mb-1.5 block text-xs text-muted-foreground">
              Type
            </label>
            <select
              id="outputs-type"
              className="h-7 rounded-md border border-input bg-input/20 px-2 text-sm dark:bg-input/30"
              value={type}
              onChange={(e) => setType(e.target.value as "" | ArtifactType)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="outputs-status" className="mb-1.5 block text-xs text-muted-foreground">
              Status
            </label>
            <select
              id="outputs-status"
              className="h-7 rounded-md border border-input bg-input/20 px-2 text-sm dark:bg-input/30"
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | ArtifactStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <p className="text-sm font-medium">No outputs match these filters.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Outputs appear automatically from assignments.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={`/outputs/${item.id}`}
                className="block h-full focus-visible:outline-none"
              >
                <Card className="h-full transition-colors hover:bg-muted/25 focus-within:ring-2 focus-within:ring-ring/40">
                  <CardHeader className="border-b border-border/60">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <Badge variant="outline">{typeLabel(item.type)}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{item.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="capitalize">{item.status.replaceAll("_", " ")}</span>
                    <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
