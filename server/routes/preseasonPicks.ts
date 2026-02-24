import { Router, Request, Response } from 'express';
import db, { PreseasonPick } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/mine', requireAuth, (req: Request, res: Response) => {
  const pick = db
    .prepare(`
      SELECT pp.*, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN contestants c ON pp.contestant_id = c.id
      WHERE pp.user_id = ?
    `)
    .get(req.user!.userId);

  res.json(pick || null);
});

router.get('/all', (_req: Request, res: Response) => {
  const picks = db
    .prepare(`
      SELECT pp.*, u.username, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN users u ON pp.user_id = u.id
      JOIN contestants c ON pp.contestant_id = c.id
      ORDER BY u.username ASC
    `)
    .all();

  res.json(picks);
});

router.post('/', requireAuth, (req: Request, res: Response) => {
  const { contestant_id } = req.body as { contestant_id?: number };

  if (!contestant_id) {
    res.status(400).json({ error: 'contestant_id is required' });
    return;
  }

  const contestant = db.prepare('SELECT id FROM contestants WHERE id = ?').get(contestant_id);
  if (!contestant) {
    res.status(404).json({ error: 'Contestant not found' });
    return;
  }

  const existing = db
    .prepare('SELECT * FROM preseason_picks WHERE user_id = ?')
    .get(req.user!.userId) as PreseasonPick | undefined;

  if (existing) {
    const firstEpisode = db
      .prepare('SELECT * FROM episodes ORDER BY episode_number ASC LIMIT 1')
      .get() as { is_locked: number; deadline: string | null } | undefined;

    if (firstEpisode) {
      const isLocked =
        firstEpisode.is_locked ||
        (firstEpisode.deadline && new Date() > new Date(firstEpisode.deadline));
      if (isLocked) {
        res.status(403).json({ error: 'Preseason pick is locked — season has started' });
        return;
      }
    }
  }

  db.prepare(
    'INSERT INTO preseason_picks (user_id, contestant_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET contestant_id = excluded.contestant_id, created_at = CURRENT_TIMESTAMP'
  ).run(req.user!.userId, contestant_id);

  const pick = db
    .prepare(`
      SELECT pp.*, c.name AS contestant_name, c.headshot_url
      FROM preseason_picks pp
      JOIN contestants c ON pp.contestant_id = c.id
      WHERE pp.user_id = ?
    `)
    .get(req.user!.userId);

  res.json(pick);
});

export default router;
