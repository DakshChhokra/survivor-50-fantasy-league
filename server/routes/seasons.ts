import { Router, Request, Response } from 'express';
import db, {
  Season,
  getSeasonById,
  getCurrentSeason,
  setCurrentSeason,
} from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

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

  const { name, is_current } = req.body as { name?: string; is_current?: boolean };

  if (name?.trim()) {
    db.prepare('UPDATE seasons SET name = ? WHERE id = ?').run(name.trim(), id);
  }
  if (is_current) setCurrentSeason(id);

  res.json(getSeasonById(id));
});

export default router;
