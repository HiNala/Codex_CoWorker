# customer-impact-mapper

**Version:** 1.0.1 · **Kind:** skill · **Authored by:** human

Joins ticket clusters to customer accounts and produces the typed impact table used in the demo.

## Severity rules

Severity is a documented rule, not a model score. First match wins:

| Severity   | Condition                                                           |
| ---------- | ------------------------------------------------------------------- |
| `critical` | `plan` is `enterprise` (case-insensitive) **and** `ticketCount ≥ 3` |
| `high`     | `mrrAtRiskMicrodollars ≥ 1_000_000_000` ($1,000)                    |
| `medium`   | `ticketCount ≥ 2`                                                   |
| `low`      | otherwise                                                           |

Money is always integer **microdollars** (1 USD = 1_000_000 µ$).

## Input

```ts
{
  clusters: Array<{ clusterId: string; ticketIds: string[]; ... }>;
  accounts: Array<{
    id: string;
    name: string;
    plan: string;
    mrrMicrodollars: number;
    contacts: Array<{ id: string; email: string }>;
  }>;
  ticketRequesterIndex: Record<string, string>; // ticketId -> requesterId
}
```

Requester IDs are matched to `accounts[].contacts[].id`.

## Output

```ts
{
  rows: Array<{
    rowId: string; // deterministic hash of accountId + cluster ids
    accountId: string;
    accountName: string;
    plan: string;
    affectedClusterIds: string[]; // sorted
    ticketCount: number;
    mrrAtRiskMicrodollars: number;
    severity: "low" | "medium" | "high" | "critical";
    evidenceRefs: string[]; // ticket ids for this row, sorted
  }>;
  totals: {
    accounts: number;
    tickets: number;
    mrrAtRiskMicrodollars: number;
  }
}
```

**Every row carries `evidenceRefs`.** Tickets whose requester matches no account contact are skipped (no throw); the count is logged.

## Limitations

- Full account MRR is treated as at-risk when any ticket matches.
- Does not invent accounts for unmatched requesters.
  }
