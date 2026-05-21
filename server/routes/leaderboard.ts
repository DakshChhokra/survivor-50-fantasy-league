import { Router, Request, Response } from 'express';
import db from '../db';
import { CORRECT_PICK_POINTS } from '../constants';
import { getSortedLeaderboard } from '../leaderboardService';

const router = Router();

type EpisodeBreakdown = {
  episode_id: number;
  episode_number: number;
  contestant_name: string;
  is_correct: number;
  points: number;
};

router.get('/', (_req: Request, res: Response) => {
  res.json(getSortedLeaderboard());
});

router.get('/details', (_req: Request, res: Response) => {
  const entries = getSortedLeaderboard();

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
      breakdown: breakdown.map((b) => ({ ...b, points: b.is_correct ? CORRECT_PICK_POINTS : 0 })),
    };
  });

  res.json(detailed);
});

export default router;
