export function applyLedgerEntry(balanceMicrocredits: number, amountMicrocredits: number): number {
  if (!Number.isSafeInteger(balanceMicrocredits) || !Number.isSafeInteger(amountMicrocredits)) {
    throw new TypeError("Ledger arithmetic requires safe integers.");
  }
  return balanceMicrocredits + amountMicrocredits;
}
