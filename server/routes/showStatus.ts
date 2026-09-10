import { Router, Request, Response } from 'express';
import db, { resolveSeasonId, getSeasonById } from '../db';
import { getSortedLeaderboard } from '../leaderboardService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const seasonId = resolveSeasonId(req.query.season_id as string | undefined);
  if (!seasonId) {
    res.json({
      season: null,
      contestants: [],
      currentEpisode: null,
      latestEpisode: null,
      leaderboard: [],
    });
    return;
  }

  const season = getSeasonById(seasonId)!;

  const contestants = db
    .prepare(
      `
      SELECT c.*,
        CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          JOIN episodes e ON el.episode_id = e.id
          WHERE el.contestant_id = c.id AND e.season_id = c.season_id
        ) THEN 1 ELSE 0 END AS is_eliminated,
        (
          SELECT e.episode_number FROM eliminations el
          JOIN episodes e ON el.episode_id = e.id
          WHERE el.contestant_id = c.id AND e.season_id = c.season_id
          ORDER BY e.episode_number ASC
          LIMIT 1
        ) AS eliminated_episode,
        (
          SELECT el.episode_id FROM eliminations el
          JOIN episodes e ON el.episode_id = e.id
          WHERE el.contestant_id = c.id AND e.season_id = c.season_id
          ORDER BY e.episode_number ASC
          LIMIT 1
        ) AS eliminated_episode_id
      FROM contestants c
      WHERE c.season_id = ?
      ORDER BY c.display_order ASC, c.name ASC
    `
    )
    .all(seasonId);

  const now = new Date().toISOString();

  const currentEpisode = db
    .prepare(
      `
      SELECT e.*,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = e.id) AS elimination_count
      FROM episodes e
      WHERE e.season_id = ? AND e.is_locked = 0 AND (e.deadline IS NULL OR e.deadline > ?)
      ORDER BY e.episode_number ASC
      LIMIT 1
    `
    )
    .get(seasonId, now);

  const latestEpisode = db
    .prepare(
      `
      SELECT e.*,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = e.id) AS elimination_count
      FROM episodes e
      WHERE e.season_id = ?
      ORDER BY e.episode_number DESC
      LIMIT 1
    `
    )
    .get(seasonId);

  res.json({
    season,
    contestants,
    currentEpisode: currentEpisode || null,
    latestEpisode: latestEpisode || null,
    leaderboard: getSortedLeaderboard(seasonId),
  });
});

export default router;
