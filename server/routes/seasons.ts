import { Router, Request, Response } from 'express';
import db, {
  Season,
  getSeasonById,
  getCurrentSeason,
  setCurrentSeason,
} from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

function parsePoints(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

router.get('/', (_req: Request, res: Response) => {
  const seasons = db
    .prepare('SELECT * FROM seasons ORDER BY id DESC')
    .all() as Season[];
  res.json(seasons);
});

router.get('/current', (_req: Request, res: Response) => {
  res.json(getCurrentSeason() ?? null);
});

router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { name, make_current } = req.body as { name?: string; make_current?: boolean };

  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = db
    .prepare('INSERT INTO seasons (name, is_current) VALUES (?, 0)')
    .run(name.trim());
  const id = result.lastInsertRowid as number;

  const shouldCurrent = make_current || !getCurrentSeason();
  if (shouldCurrent) setCurrentSeason(id);

  const season = getSeasonById(id)!;
  res.status(201).json(season);
});

router.patch('/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const season = getSeasonById(id);
  if (!season) {
    res.status(404).json({ error: 'Season not found' });
    return;
  }

  const { name, is_current, weekly_pick_points, winner_pick_points } = req.body as {
    name?: string;
    is_current?: boolean;
    weekly_pick_points?: unknown;
    winner_pick_points?: unknown;
  };

  const weekly = parsePoints(weekly_pick_points);
  if (weekly === null) {
    res.status(400).json({ error: 'weekly_pick_points must be a whole number 0 or more' });
    return;
  }
  const winner = parsePoints(winner_pick_points);
  if (winner === null) {
    res.status(400).json({ error: 'winner_pick_points must be a whole number 0 or more' });
    return;
  }

  if (name?.trim()) {
    db.prepare('UPDATE seasons SET name = ? WHERE id = ?').run(name.trim(), id);
  }
  if (is_current) setCurrentSeason(id);
  if (weekly !== undefined) {
    db.prepare('UPDATE seasons SET weekly_pick_points = ? WHERE id = ?').run(weekly, id);
  }
  if (winner !== undefined) {
    db.prepare('UPDATE seasons SET winner_pick_points = ? WHERE id = ?').run(winner, id);
  }

  res.json(getSeasonById(id));
});

export default router;
