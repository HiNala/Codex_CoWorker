import { STOPWORDS } from "./stopwords";

/** Lowercase, strip most punctuation, collapse whitespace. Keeps letters/numbers/emoji spans. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\p{Emoji_Presentation}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  if (!text) return [];
  return normalizeText(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Extract 2–4-gram phrases from token list. */
export function extractPhrases(tokens: string[]): string[] {
  const phrases: string[] = [];
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      phrases.push(tokens.slice(i, i + n).join(" "));
    }
  }
  return phrases;
}

/** First ~140 chars of body for representative quotes (no newlines). */
export function excerptQuote(body: string, maxLen = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen - 1).trimEnd()}…`;
}
