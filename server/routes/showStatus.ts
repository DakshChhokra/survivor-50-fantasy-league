import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const contestants = db
    .prepare(`
      SELECT c.*,
        CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el WHERE el.contestant_id = c.id
        ) THEN 1 ELSE 0 END AS is_eliminated,
        (
          SELECT e.episode_number FROM eliminations el
          JOIN episodes e ON el.episode_id = e.id
          WHERE el.contestant_id = c.id
          ORDER BY e.episode_number ASC
          LIMIT 1
        ) AS eliminated_episode,
        (
          SELECT el.episode_id FROM eliminations el
          JOIN episodes e ON el.episode_id = e.id
          WHERE el.contestant_id = c.id
          ORDER BY e.episode_number ASC
          LIMIT 1
        ) AS eliminated_episode_id
      FROM contestants c
      ORDER BY c.display_order ASC, c.name ASC
    `)
    .all();

  const now = new Date().toISOString();

  const currentEpisode = db
    .prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = e.id) AS elimination_count
      FROM episodes e
      WHERE e.is_locked = 0 AND (e.deadline IS NULL OR e.deadline > ?)
      ORDER BY e.episode_number ASC
      LIMIT 1
    `)
    .get(now);

  const latestEpisode = db
    .prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = e.id) AS elimination_count
      FROM episodes e
      ORDER BY e.episode_number DESC
      LIMIT 1
    `)
    .get();

  const leaderboard = db
    .prepare(`
      SELECT u.id AS user_id, u.username,
        COALESCE(SUM(CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
        ) THEN 10 ELSE 0 END), 0) AS total_points,
        COUNT(p.id) AS total_picks,
        COALESCE(SUM(CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
        ) THEN 1 ELSE 0 END), 0) AS correct_picks
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id
      GROUP BY u.id
      ORDER BY total_points DESC, u.username ASC
    `)
    .all();

  res.json({
    contestants,
    currentEpisode: currentEpisode || null,
    latestEpisode: latestEpisode || null,
    leaderboard,
  });
});

export default router;
