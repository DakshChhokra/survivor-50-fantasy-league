import { Router, Request, Response } from 'express';
import db, { Episode } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const episodes = db
    .prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = e.id) AS elimination_count
      FROM episodes e
      ORDER BY e.episode_number ASC
    `)
    .all();
  res.json(episodes);
});

router.get('/:id', (req: Request, res: Response) => {
  const episode = db
    .prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM eliminations WHERE episode_id = e.id) AS elimination_count
      FROM episodes e
      WHERE e.id = ?
    `)
    .get(req.params.id) as (Episode & { elimination_count: number }) | undefined;

  if (!episode) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }
  res.json(episode);
});

router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { episode_number, air_date, num_eliminations, deadline } = req.body as {
    episode_number?: number;
    air_date?: string;
    num_eliminations?: number;
    deadline?: string;
  };

  if (!episode_number) {
    res.status(400).json({ error: 'episode_number is required' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM episodes WHERE episode_number = ?')
    .get(episode_number);
  if (existing) {
    res.status(409).json({ error: `Episode ${episode_number} already exists` });
    return;
  }

  const result = db
    .prepare(
      'INSERT INTO episodes (episode_number, air_date, num_eliminations, deadline) VALUES (?, ?, ?, ?)'
    )
    .run(episode_number, air_date || null, num_eliminations || 1, deadline || null);

  const episode = db
    .prepare('SELECT * FROM episodes WHERE id = ?')
    .get(result.lastInsertRowid) as Episode;

  res.status(201).json(episode);
});

router.patch('/:id', requireAdmin, (req: Request, res: Response) => {
  const episode = db
    .prepare('SELECT * FROM episodes WHERE id = ?')
    .get(req.params.id) as Episode | undefined;

  if (!episode) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }

  const { air_date, num_eliminations, deadline, is_locked } = req.body as {
    air_date?: string;
    num_eliminations?: number;
    deadline?: string;
    is_locked?: boolean;
  };

  db.prepare(
    `UPDATE episodes SET
      air_date = COALESCE(?, air_date),
      num_eliminations = COALESCE(?, num_eliminations),
      deadline = COALESCE(?, deadline),
      is_locked = COALESCE(?, is_locked)
    WHERE id = ?`
  ).run(
    air_date ?? null,
    num_eliminations ?? null,
    deadline ?? null,
    is_locked !== undefined ? (is_locked ? 1 : 0) : null,
    req.params.id
  );

  const updated = db
    .prepare('SELECT * FROM episodes WHERE id = ?')
    .get(req.params.id) as Episode;

  res.json(updated);
});

router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const episode = db
    .prepare('SELECT * FROM episodes WHERE id = ?')
    .get(req.params.id) as Episode | undefined;

  if (!episode) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }

  db.prepare('DELETE FROM episodes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
