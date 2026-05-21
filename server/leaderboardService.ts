import db from './db';
import { CORRECT_PICK_POINTS, PRESEASON_WINNER_BONUS } from './constants';

export { CORRECT_PICK_POINTS, PRESEASON_WINNER_BONUS } from './constants';

export type LeaderboardEntry = {
  user_id: number;
  username: string;
  weekly_points: number;
  correct_picks: number;
  total_picks: number;
  preseason_bonus: number;
  total_points: number;
  preseason_pick_name: string | null;
};

export function computeLeaderboard(): LeaderboardEntry[] {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const users = db
    .prepare('SELECT id, username FROM users WHERE username != ? ORDER BY username ASC')
    .all(adminUsername) as {
    id: number;
    username: string;
  }[];

  return users.map((user) => {
    const weeklyStats = db
      .prepare(`
        SELECT
          COUNT(*) AS total_picks,
          SUM(CASE WHEN EXISTS (
            SELECT 1 FROM eliminations el
            WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
          ) THEN 1 ELSE 0 END) AS correct_picks
        FROM predictions p
        WHERE p.user_id = ?
      `)
      .get(user.id) as { total_picks: number; correct_picks: number };

    const weeklyPoints = (weeklyStats.correct_picks || 0) * CORRECT_PICK_POINTS;

    const preseasonPick = db
      .prepare(`
        SELECT pp.contestant_id, c.name AS contestant_name
        FROM preseason_picks pp
        JOIN contestants c ON pp.contestant_id = c.id
        WHERE pp.user_id = ?
      `)
      .get(user.id) as { contestant_id: number; contestant_name: string } | undefined;

    let preseasonBonus = 0;
    if (preseasonPick) {
      const totalContestants = (
        db.prepare('SELECT COUNT(*) AS cnt FROM contestants').get() as { cnt: number }
      ).cnt;
      const eliminatedCount = (
        db
          .prepare(
            'SELECT COUNT(DISTINCT contestant_id) AS cnt FROM eliminations'
          )
          .get() as { cnt: number }
      ).cnt;

      if (eliminatedCount > 0 && eliminatedCount === totalContestants - 1) {
        const lastStanding = db
          .prepare(`
            SELECT id FROM contestants
            WHERE id NOT IN (SELECT DISTINCT contestant_id FROM eliminations)
            LIMIT 1
          `)
          .get() as { id: number } | undefined;

        if (lastStanding && lastStanding.id === preseasonPick.contestant_id) {
          preseasonBonus = PRESEASON_WINNER_BONUS;
        }
      }
    }

    return {
      user_id: user.id,
      username: user.username,
      weekly_points: weeklyPoints,
      correct_picks: weeklyStats.correct_picks || 0,
      total_picks: weeklyStats.total_picks || 0,
      preseason_bonus: preseasonBonus,
      total_points: weeklyPoints + preseasonBonus,
      preseason_pick_name: preseasonPick?.contestant_name || null,
    };
  });
}

export function getSortedLeaderboard(): LeaderboardEntry[] {
  return computeLeaderboard().sort((a, b) => b.total_points - a.total_points);
}
