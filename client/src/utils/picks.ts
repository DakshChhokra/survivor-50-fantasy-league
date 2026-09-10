export function pickResult(pred: {
  is_correct?: number;
  elimination_count?: number;
}): 'correct' | 'wrong' | 'pending' {
  if (pred.is_correct) return 'correct';
  if ((pred.elimination_count ?? 0) > 0) return 'wrong';
  return 'pending';
}
