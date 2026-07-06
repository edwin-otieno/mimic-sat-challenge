/** ACT Math odd questions use A–E; even questions use F, G, H, J (and K for a 5th option). */
const ACT_MATH_ODD_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const ACT_MATH_EVEN_LETTERS = ['F', 'G', 'H', 'J', 'K'] as const;

/** Passage-based and non-math ACT questions label every question A–E. */
const ACT_ABCD_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Whether an ACT question should use A–E labels for every question instead of
 * alternating A–E / F–G–H–J (full ACT Math only).
 */
export function shouldUseActMathAbcdOnly(
  isMiniActTest: boolean,
  moduleType: string | undefined,
  hasPassageId: boolean
): boolean {
  if (hasPassageId) return true;
  if (moduleType !== 'math') return true;
  if (isMiniActTest) return true;
  return false;
}

/**
 * Returns the option letter labels for an ACT question.
 */
export function getActOptionLetters(
  questionNumber: number | undefined,
  abcdOnly: boolean
): string[] {
  if (abcdOnly) {
    return [...ACT_ABCD_LETTERS];
  }

  const qNum = Math.max(1, questionNumber ?? 1);
  return qNum % 2 === 1 ? [...ACT_MATH_ODD_LETTERS] : [...ACT_MATH_EVEN_LETTERS];
}

/**
 * Returns a single option letter for an ACT question at the given index.
 */
export function getActOptionLetter(
  questionNumber: number,
  optionIndex: number,
  abcdOnly: boolean
): string {
  const letters = getActOptionLetters(questionNumber, abcdOnly);
  return letters[optionIndex] ?? String.fromCharCode(65 + optionIndex);
}
