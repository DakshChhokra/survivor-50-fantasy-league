import db, { getSeasonById } from './db';

export type LeaderboardEntry = {
  user_id: number;
  username: string;
  weekly_points: number;
  correct_picks: number;
  total_picks: number;
  preseason_bonus: number;
  total_points: number;
  preseason_pick_name: string | null;
  preseason_pick_eliminated: number;
};

export function computeLeaderboard(seasonId: number): LeaderboardEntry[] {
  const season = getSeasonById(seasonId);
  if (!season) return [];

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const users = db
    .prepare(
      `
      SELECT u.id, u.username FROM users u
      WHERE u.username != ?
        AND (
          EXISTS (
            SELECT 1 FROM predictions p
            JOIN episodes e ON p.episode_id = e.id
            WHERE p.user_id = u.id AND e.season_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM preseason_picks pp
            WHERE pp.user_id = u.id AND pp.season_id = ?
          )
        )
      ORDER BY u.username ASC
    `
    )
    .all(adminUsername, seasonId, seasonId) as { id: number; username: string }[];

  return users.map((user) => {
    const weeklyStats = db
      .prepare(
        `
        SELECT
          COUNT(*) AS total_picks,
          SUM(CASE WHEN EXISTS (
            SELECT 1 FROM eliminations el
            WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
          ) THEN 1 ELSE 0 END) AS correct_picks
        FROM predictions p
        JOIN episodes e ON p.episode_id = e.id
        WHERE p.user_id = ? AND e.season_id = ?
      `
      )
      .get(user.id, seasonId) as { total_picks: number; correct_picks: number };

    const weeklyPoints = (weeklyStats.correct_picks || 0) * season.weekly_pick_points;

    const preseasonPick = db
      .prepare(
        `
        SELECT pp.contestant_id, c.name AS contestant_name,
          CASE WHEN EXISTS (
            SELECT 1 FROM eliminations el
            JOIN episodes e ON el.episode_id = e.id
            WHERE el.contestant_id = c.id AND e.season_id = c.season_id
          ) THEN 1 ELSE 0 END AS is_eliminated
        FROM preseason_picks pp
        JOIN contestants c ON pp.contestant_id = c.id
        WHERE pp.user_id = ? AND pp.season_id = ?
      `
      )
      .get(user.id, seasonId) as
        | { contestant_id: number; contestant_name: string; is_eliminated: number }
        | undefined;

    let preseasonBonus = 0;
    if (preseasonPick) {
      const totalContestants = (
        db
          .prepare('SELECT COUNT(*) AS cnt FROM contestants WHERE season_id = ?')
          .get(seasonId) as { cnt: number }
      ).cnt;
      const eliminatedCount = (
        db
          .prepare(
            `
            SELECT COUNT(DISTINCT el.contestant_id) AS cnt
            FROM eliminations el
            JOIN episodes e ON el.episode_id = e.id
            WHERE e.season_id = ?
          `
          )
          .get(seasonId) as { cnt: number }
      ).cnt;

      if (eliminatedCount > 0 && eliminatedCount === totalContestants - 1) {
        const lastStanding = db
          .prepare(
            `
            SELECT id FROM contestants
            WHERE season_id = ?
              AND id NOT IN (
                SELECT DISTINCT el.contestant_id FROM eliminations el
                JOIN episodes e ON el.episode_id = e.id
                WHERE e.season_id = ?
              )
            LIMIT 1
          `
          )
          .get(seasonId, seasonId) as { id: number } | undefined;

        if (lastStanding && lastStanding.id === preseasonPick.contestant_id) {
          preseasonBonus = season.winner_pick_points;
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
      preseason_pick_eliminated: preseasonPick?.is_eliminated || 0,
    };
  });
}

export function getSortedLeaderboard(seasonId: number): LeaderboardEntry[] {
  return computeLeaderboard(seasonId).sort((a, b) => b.total_points - a.total_points);
}
