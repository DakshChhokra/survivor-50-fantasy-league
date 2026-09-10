/** Scoring values — used by server scoring and client UI (import from both). */
export const CORRECT_PICK_POINTS = 30;
export const PRESEASON_WINNER_BONUS = 50;

export function isEpisodeLocked(episode: {
  is_locked: number | boolean;
  deadline: string | null;
}): boolean {
  if (episode.is_locked) return true;
  if (!episode.deadline) return false;
  const deadline = new Date(episode.deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return Date.now() > deadline.getTime();
}
