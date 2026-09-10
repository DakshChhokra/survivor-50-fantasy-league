export function pickResult(pred: {
  is_correct?: number;
  elimination_count?: number;
}): 'correct' | 'wrong' | 'pending' {
  if (pred.is_correct) return 'correct';
  if ((pred.elimination_count ?? 0) > 0) return 'wrong';
  return 'pending';
}

export function multiBootNote(numEliminations: number): string | null {
  if (numEliminations <= 1) return null;
  return `${numEliminations} people going home — pick one, any of them counts.`;
}
