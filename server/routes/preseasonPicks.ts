import { Router, Request, Response } from 'express';
import db, {
  Contestant,
  Episode,
  getSeasonById,
  resolveSeasonId,
} from '../db';
import { requireAuth } from '../middleware/auth';
import { isEpisodeLocked } from '../constants';

const router = Router();

function preseasonLocked(seasonId: number): boolean {
  const firstEpisode = db
    .prepare('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC LIMIT 1')
    .get(seasonId) as Episode | undefined;
  return firstEpisode ? isEpisodeLocked(firstEpisode) : false;
}

router.get('/mine', requireAuth, (req: Request, res: Response) => {
  const seasonId = resolveSeasonId(req.query.season_id as string | undefined);
  if (!seasonId) {
    res.json(null);
    return;
  }

  const pick = db
    .prepare(
      `
      SELECT pp.*, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN contestants c ON pp.contestant_id = c.id
      WHERE pp.user_id = ? AND pp.season_id = ?
    `
    )
    .get(req.user!.userId, seasonId);

  res.json(pick || null);
});

router.get('/all', (req: Request, res: Response) => {
  const seasonId = resolveSeasonId(req.query.season_id as string | undefined);
  if (!seasonId) {
    res.json([]);
    return;
  }

  const picks = db
    .prepare(
      `
      SELECT pp.*, u.username, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN users u ON pp.user_id = u.id
      JOIN contestants c ON pp.contestant_id = c.id
      WHERE pp.season_id = ?
      ORDER BY u.username ASC
    `
    )
    .all(seasonId);

  res.json(picks);
});

router.post('/', requireAuth, (req: Request, res: Response) => {
  const { contestant_id } = req.body as { contestant_id?: number };

  if (!contestant_id) {
    res.status(400).json({ error: 'contestant_id is required' });
    return;
  }

  const contestant = db
    .prepare('SELECT * FROM contestants WHERE id = ?')
    .get(contestant_id) as Contestant | undefined;
  if (!contestant) {
    res.status(404).json({ error: 'Contestant not found' });
    return;
  }

  const season = getSeasonById(contestant.season_id);
  if (!season?.is_current) {
    res.status(403).json({ error: 'Winner picks are only open for the current season' });
    return;
  }

  if (preseasonLocked(contestant.season_id)) {
    res.status(403).json({ error: 'Preseason pick is locked — season has started' });
    return;
  }

  db.prepare(
    `INSERT INTO preseason_picks (user_id, contestant_id, season_id)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, season_id) DO UPDATE SET contestant_id = excluded.contestant_id, created_at = CURRENT_TIMESTAMP`
  ).run(req.user!.userId, contestant_id, contestant.season_id);

  const pick = db
    .prepare(
      `
      SELECT pp.*, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN contestants c ON pp.contestant_id = c.id
      WHERE pp.user_id = ? AND pp.season_id = ?
    `
    )
    .get(req.user!.userId, contestant.season_id);

  res.json(pick);
});

export default router;
