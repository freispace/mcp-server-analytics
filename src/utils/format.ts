export const money = (cents: number, currency: string) =>
  `${(cents / 100).toFixed(2)} ${currency}`;

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/** "2026-07-03T14:30:00" -> "2026-07-03 14:30" (API times are already caller-local) */
export const dateTime = (s: string) => s.replace("T", " ").slice(0, 16);

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
