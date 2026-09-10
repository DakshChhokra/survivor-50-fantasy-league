import { Router, Request, Response } from 'express';
import db, { Season, resolveSeasonId } from '../db';
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

function playerSeason(userId: number, season: Season) {
  const entry = getSortedLeaderboard(season.id).find((e) => e.user_id === userId);

  const preseason_pick = db
    .prepare(
      `
      SELECT pp.contestant_id, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN contestants c ON pp.contestant_id = c.id
      WHERE pp.user_id = ? AND pp.season_id = ?
    `
    )
    .get(userId, season.id) as {
    contestant_id: number;
    contestant_name: string;
    headshot_url: string | null;
  } | undefined;

  const picks = db
    .prepare(
      `
      SELECT
        p.id,
        p.episode_id,
        e.episode_number,
        c.name AS contestant_name,
        c.headshot_url,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = p.episode_id) AS elimination_count,
        CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
        ) THEN 1 ELSE 0 END AS is_correct
      FROM predictions p
      JOIN episodes e ON p.episode_id = e.id
      JOIN contestants c ON p.contestant_id = c.id
      WHERE p.user_id = ? AND e.season_id = ?
      ORDER BY e.episode_number ASC
    `
    )
    .all(userId, season.id);

  return {
    season,
    total_points: entry?.total_points ?? 0,
    correct_picks: entry?.correct_picks ?? 0,
    total_picks: entry?.total_picks ?? 0,
    preseason_bonus: entry?.preseason_bonus ?? 0,
    preseason_pick: preseason_pick ?? null,
    picks,
  };
}

router.get('/', (req: Request, res: Response) => {
  const seasonId = resolveSeasonId(req.query.season_id as string | undefined);
  if (!seasonId) {
    res.json([]);
    return;
  }
  res.json(getSortedLeaderboard(seasonId));
});

router.get('/player/:username', (req: Request, res: Response) => {
  const user = db
    .prepare('SELECT id, username FROM users WHERE username = ?')
    .get(req.params.username) as { id: number; username: string } | undefined;

  if (!user) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const seasons = db
    .prepare('SELECT * FROM seasons ORDER BY is_current DESC, id DESC')
    .all() as Season[];

  const slices = seasons
    .map((season) => playerSeason(user.id, season))
    .filter(
      (slice) =>
        slice.season.is_current ||
        slice.picks.length > 0 ||
        slice.preseason_pick
    );

  res.json({
    username: user.username,
    seasons: slices,
  });
});

router.get('/details', (req: Request, res: Response) => {
  const seasonId = resolveSeasonId(req.query.season_id as string | undefined);
  if (!seasonId) {
    res.json([]);
    return;
  }

  const entries = getSortedLeaderboard(seasonId);

  const detailed = entries.map((entry) => {
    const breakdown = db
      .prepare(
        `
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
        WHERE p.user_id = ? AND e.season_id = ?
        ORDER BY e.episode_number ASC
      `
      )
      .all(entry.user_id, seasonId) as EpisodeBreakdown[];

    return {
      ...entry,
      breakdown: breakdown.map((b) => ({ ...b, points: b.is_correct ? CORRECT_PICK_POINTS : 0 })),
    };
  });

  res.json(detailed);
});

export default router;
