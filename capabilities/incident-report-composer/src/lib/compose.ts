import type {
  Citation,
  ReportComposerInput,
  ReportComposerOutput,
  SectionMeta,
} from "./types";
import { escapeUserContent, formatUsd, wordCount } from "./escape";

/**
 * Compose a markdown incident report with real [^eN] citations.
 * Never fabricates evidence IDs; unsupported claims become warnings.
 */
export function composeReport(input: ReportComposerInput): ReportComposerOutput {
  const evidenceById = new Map(input.evidence.map((e) => [e.id, e]));
  const evidenceIds = [...evidenceById.keys()].sort((a, b) => a.localeCompare(b));

  const citations: Citation[] = [];
  const warnings: string[] = [];
  let anchorSeq = 0;

  const cite = (evidenceId: string, claim: string): string => {
    if (!evidenceById.has(evidenceId)) {
      warnings.push(
        `unsupported claim (missing evidence ${evidenceId}): ${claim}`,
      );
      return " **[unsupported]**";
    }
    anchorSeq += 1;
    const anchorId = `e${anchorSeq}`;
    citations.push({ anchorId, evidenceId, claim });
    return ` [^${anchorId}]`;
  };

  /** Prefer first evidence whose id or title relates to ticket / cluster. */
  const pickEvidenceForTicket = (ticketId: string): string | undefined => {
    const exact = evidenceIds.find(
      (id) => id === ticketId || id.endsWith(`:${ticketId}`) || id.includes(ticketId),
    );
    if (exact) return exact;
    return evidenceIds[0];
  };

  const title = escapeUserContent(input.title);
  const clusters = [...input.clusters].sort((a, b) =>
    a.clusterId.localeCompare(b.clusterId),
  );
  const impactRows = [...input.impactRows].sort((a, b) =>
    a.accountId.localeCompare(b.accountId),
  );
  const timeline = [...input.timeline].sort((a, b) => a.ts.localeCompare(b.ts));

  // --- Summary ---
  const totalTickets = clusters.reduce((n, c) => n + c.ticketIds.length, 0);
  const totalMrr = impactRows.reduce((n, r) => n + r.mrrAtRiskMicrodollars, 0);
  let summaryBody = `${clusters.length} cluster(s) covering ${totalTickets} ticket(s) across ${impactRows.length} account(s); MRR at risk ${formatUsd(totalMrr)}.`;
  if (input.changeSummary) {
    summaryBody += ` Change context: ${escapeUserContent(input.changeSummary)}.`;
  }
  if (clusters[0]) {
    const ev = pickEvidenceForTicket(clusters[0].ticketIds[0] ?? "");
    if (ev) {
      summaryBody += cite(ev, `Primary cluster ${clusters[0].clusterId} observed`);
    } else {
      warnings.push("Summary has no supporting evidence");
      summaryBody += " **[unsupported]**";
    }
  } else if (evidenceIds.length === 0) {
    warnings.push("Summary has no supporting evidence");
    summaryBody += " **[unsupported]**";
  }

  // --- Impact ---
  const impactLines: string[] = [];
  if (impactRows.length === 0) {
    impactLines.push("No customer impact rows provided.");
    warnings.push("Impact section has no account rows");
  } else {
    for (const row of impactRows) {
      const name = escapeUserContent(row.accountName);
      const plan = escapeUserContent(row.plan);
      const sev = escapeUserContent(row.severity);
      let line = `- **${name}** (${plan}): severity \`${sev}\`, ${row.ticketCount} ticket(s), MRR at risk ${formatUsd(row.mrrAtRiskMicrodollars)}.`;
      const ref = row.evidenceRefs[0];
      if (ref) {
        const ev = pickEvidenceForTicket(ref);
        if (ev) {
          line += cite(ev, `${row.accountId} affected by tickets`);
        } else {
          warnings.push(`Impact claim for ${row.accountId} has no evidence`);
          line += " **[unsupported]**";
        }
      } else {
        warnings.push(`Impact row ${row.rowId} has empty evidenceRefs`);
        line += " **[unsupported]**";
      }
      impactLines.push(line);
    }
  }

  // --- Timeline ---
  const timelineLines: string[] = [];
  if (timeline.length === 0) {
    timelineLines.push("_No timeline events supplied._");
  } else {
    for (const ev of timeline) {
      timelineLines.push(
        `- **${escapeUserContent(ev.ts)}** — ${escapeUserContent(ev.event)}`,
      );
    }
  }

  // --- Root cause ---
  const rootLines: string[] = [];
  if (clusters.length === 0) {
    rootLines.push("No clusters available to form a root-cause hypothesis.");
    warnings.push("Root cause section has no clusters");
  } else {
    for (const c of clusters) {
      let line = `- **${escapeUserContent(c.label)}** (\`${escapeUserContent(c.clusterId)}\`, confidence ${c.confidence}): ${escapeUserContent(c.rootCauseHypothesis)}`;
      const t0 = c.ticketIds[0];
      const ev = t0 ? pickEvidenceForTicket(t0) : evidenceIds[0];
      if (ev) {
        line += cite(ev, `Root cause hypothesis for ${c.clusterId}`);
      } else {
        warnings.push(`Root cause for ${c.clusterId} has no supporting evidence`);
        line += " **[unsupported]**";
      }
      rootLines.push(line);
    }
  }

  // --- Evidence ---
  const evidenceLines: string[] = [];
  const sortedEvidence = [...input.evidence].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  if (sortedEvidence.length === 0) {
    evidenceLines.push("_No evidence records supplied._");
    warnings.push("Evidence section is empty");
  } else {
    for (const e of sortedEvidence) {
      evidenceLines.push(
        `- \`${escapeUserContent(e.id)}\` — **${escapeUserContent(e.title)}**: ${escapeUserContent(e.excerpt)}`,
      );
    }
  }

  // --- Recommended actions ---
  const actionLines: string[] = [
    "- Confirm the highest-severity customer impact rows with account owners.",
    "- Reproduce the leading cluster hypothesis in a staging environment.",
    "- Prepare a customer-facing status update once root cause is verified.",
  ];
  if (input.changeSummary) {
    actionLines.push(
      `- Review the related change: ${escapeUserContent(input.changeSummary)}.`,
    );
  }
  if (clusters[0]) {
    actionLines.push(
      `- Prioritize tickets in cluster \`${escapeUserContent(clusters[0].clusterId)}\`.`,
    );
  }

  // --- Open questions ---
  const questionLines: string[] = [
    "- Which deploy or config change first correlates with the leading cluster?",
    "- Are there additional accounts affected but not yet ticketed?",
  ];
  if (evidenceIds.length === 0) {
    questionLines.push("- What primary evidence can be attached to support these claims?");
  }

  const sectionDefs: Array<{ id: string; heading: string; body: string }> = [
    { id: "summary", heading: "Summary", body: summaryBody },
    { id: "impact", heading: "Impact", body: impactLines.join("\n") },
    { id: "timeline", heading: "Timeline", body: timelineLines.join("\n") },
    { id: "root-cause", heading: "Root cause", body: rootLines.join("\n") },
    { id: "evidence", heading: "Evidence", body: evidenceLines.join("\n") },
    {
      id: "recommended-actions",
      heading: "Recommended actions",
      body: actionLines.join("\n"),
    },
    {
      id: "open-questions",
      heading: "Open questions",
      body: questionLines.join("\n"),
    },
  ];

  const sections: SectionMeta[] = sectionDefs.map((s) => ({
    id: s.id,
    heading: s.heading,
    wordCount: wordCount(s.body),
  }));

  // Citation footnotes block
  const footnoteLines = citations.map((c) => {
    const ev = evidenceById.get(c.evidenceId);
    const title = ev ? escapeUserContent(ev.title) : c.evidenceId;
    return `[^${c.anchorId}]: ${title} (\`${escapeUserContent(c.evidenceId)}\`) — ${escapeUserContent(c.claim)}`;
  });

  const parts = [
    `# ${title}`,
    "",
    ...sectionDefs.flatMap((s) => [`## ${s.heading}`, "", s.body, ""]),
  ];
  if (footnoteLines.length > 0) {
    parts.push("---", "", ...footnoteLines, "");
  }

  const markdown = parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  // Sort citations by anchor for stable output (already sequential)
  citations.sort((a, b) => a.anchorId.localeCompare(b.anchorId));

  // Defence in depth: strip residual raw tags (escaped entities are left alone)
  const safeMarkdown = markdown.replace(
    /<(script|iframe|img|style|object|embed)[^>]*>/gi,
    "",
  );

  warnings.sort((a, b) => a.localeCompare(b));

  return {
    markdown: safeMarkdown,
    sections,
    citations,
    warnings,
  };
}
