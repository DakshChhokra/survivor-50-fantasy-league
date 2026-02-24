import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

type LeaderboardEntry = {
  user_id: number;
  username: string;
  weekly_points: number;
  correct_picks: number;
  total_picks: number;
  preseason_bonus: number;
  total_points: number;
  preseason_pick_name: string | null;
};

type EpisodeBreakdown = {
  episode_id: number;
  episode_number: number;
  contestant_name: string;
  is_correct: number;
  points: number;
};

function computeLeaderboard(): LeaderboardEntry[] {
  const users = db.prepare('SELECT id, username FROM users ORDER BY username ASC').all() as {
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

    const weeklyPoints = (weeklyStats.correct_picks || 0) * 10;

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
          preseasonBonus = 50;
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

router.get('/', (_req: Request, res: Response) => {
  const entries = computeLeaderboard().sort((a, b) => b.total_points - a.total_points);
  res.json(entries);
});

router.get('/details', (_req: Request, res: Response) => {
  const entries = computeLeaderboard().sort((a, b) => b.total_points - a.total_points);

  const detailed = entries.map((entry) => {
    const breakdown = db
      .prepare(`
        SELECT
          p.episode_id,
          e.episode_number,
          c.name AS contestant_name,
          CASE WHEN EXISTS (
            SELECT 1 FROM eliminations el
            WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
          ) THEN 1 ELSE 0 END AS is_correct
        FROM predictions p
        JOIN episodes e ON p.episode_id = e.id
        JOIN contestants c ON p.contestant_id = c.id
        WHERE p.user_id = ?
        ORDER BY e.episode_number ASC
      `)
      .all(entry.user_id) as EpisodeBreakdown[];

    return {
      ...entry,
      breakdown: breakdown.map((b) => ({ ...b, points: b.is_correct ? 10 : 0 })),
    };
  });

  res.json(detailed);
});

export default router;
