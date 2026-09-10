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
