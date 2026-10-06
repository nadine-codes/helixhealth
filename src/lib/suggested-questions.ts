// The suggested "Ask why" chips. These are the only questions whose answers are
// cached in the database; free-typed questions are answered and discarded.
export const SUGGESTED_QUESTIONS = [
  "Why am I exhausted every afternoon?",
  "Why is my recovery declining?",
  "Why is my recovery worse this month?",
  "Why do I feel worse in the late luteal phase?",
];

const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");
const SUGGESTED = new Set(SUGGESTED_QUESTIONS.map(normalize));

export function isSuggestedQuestion(question: string): boolean {
  return SUGGESTED.has(normalize(question));
}
