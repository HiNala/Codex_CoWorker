import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSeedArtifact } from "../seed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = getSeedArtifact(id);
  return { title: detail?.artifact.title ?? "Output" };
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function truncateHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}

export default async function OutputDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getSeedArtifact(id);
  if (!detail) notFound();

  const { artifact, versions, evidence, provenance, summary } = detail;

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
      <nav className="mb-5 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Dashboard
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link href="/outputs" className="underline-offset-4 hover:text-foreground hover:underline">
          Outputs
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-foreground">{artifact.title}</span>
      </nav>

      <header className="mb-6 border-b border-border pb-5">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{artifact.title}</h1>
          <Badge variant="outline">{artifact.type}</Badge>
          <Badge variant="secondary" className="capitalize">
            {artifact.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <p className="mt-3 max-w-[70ch] text-sm leading-6 text-muted-foreground">{summary}</p>
        <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div>
            <dt className="font-medium text-foreground/80">Assignment</dt>
            <dd className="mt-0.5 font-mono">{artifact.assignmentId.slice(0, 13)}…</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground/80">Updated</dt>
            <dd className="mt-0.5">
              <time dateTime={artifact.updatedAt}>{formatDate(artifact.updatedAt)}</time>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground/80">Visibility</dt>
            <dd className="mt-0.5 capitalize">{artifact.visibility}</dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="version-history-heading" className="space-y-3">
          <h2 id="version-history-heading" className="text-sm font-semibold tracking-tight">
            Version history
          </h2>
          <p className="text-xs text-muted-foreground">
            Immutable versions (seed). Side-by-side compare lands with the Canvas.
          </p>
          <ol className="space-y-3">
            {versions.map((v) => (
              <li key={v.id}>
                <Card size="sm" className="border-border/80 bg-card">
                  <CardHeader className="border-b border-border/50">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>
                        v{v.ordinal} · {v.changeSummary}
                      </CardTitle>
                      <Badge variant="outline">{v.authorType}</Badge>
                    </div>
                    <CardDescription>
                      <time dateTime={v.createdAt}>{formatDate(v.createdAt)}</time>
                      {" · "}
                      <span className="font-mono">{truncateHash(v.sha256)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* No nested scroll — outer panel-body owns scrolling */}
                    <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
                      {v.contentInline ?? "(content in object store)"}
                    </pre>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="evidence-heading" className="space-y-3">
            <h2 id="evidence-heading" className="text-sm font-semibold tracking-tight">
              Evidence
            </h2>
            <p className="text-xs text-muted-foreground">
              Sources linked to this artifact. Missing refs render as unsupported — never fabricated.
            </p>
            {evidence.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No evidence attached.
              </div>
            ) : (
              <ul className="space-y-3">
                {evidence.map((ev) => (
                  <li key={ev.id}>
                    <Card size="sm" className="border-border/80 bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm">{ev.title}</CardTitle>
                          <Badge variant="outline" className="capitalize">
                            {ev.trust}
                          </Badge>
                        </div>
                        <CardDescription className="font-mono text-[11px]">
                          {ev.kind}
                          {ev.sourceUrl ? (
                            <>
                              {" · "}
                              <a
                                href={ev.sourceUrl}
                                className="underline-offset-2 hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                source
                              </a>
                            </>
                          ) : null}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs leading-5 text-muted-foreground">
                        <p>{ev.excerpt}</p>
                        <p className="font-mono text-[10px]">
                          sha256 {truncateHash(ev.contentSha256)} · retrieved{" "}
                          <time dateTime={ev.retrievedAt}>{formatDate(ev.retrievedAt)}</time>
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="provenance-heading" className="space-y-3">
            <h2 id="provenance-heading" className="text-sm font-semibold tracking-tight">
              Provenance
            </h2>
            <p className="text-xs text-muted-foreground">
              Upstream links: inputs, evidence, capability versions, tools, edits, approvals, run.
            </p>
            {provenance.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No provenance relations recorded.
              </div>
            ) : (
              <ul className="divide-y divide-border/70 rounded-lg border border-border bg-card">
                {provenance.map((rel) => (
                  <li
                    key={`${rel.relation}:${rel.toId}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{rel.label}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {rel.toId.slice(0, 13)}…
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {rel.relation.replaceAll("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
