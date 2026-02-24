import { Router, Request, Response } from 'express';
import db, { Elimination, Episode } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/episode/:episodeId', (_req: Request, res: Response) => {
  const { episodeId } = _req.params;
  const eliminations = db
    .prepare(`
      SELECT e.*, c.name AS contestant_name, c.headshot_url
      FROM eliminations e
      JOIN contestants c ON e.contestant_id = c.id
      WHERE e.episode_id = ?
    `)
    .all(episodeId);
  res.json(eliminations);
});

router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { episode_id, contestant_id } = req.body as {
    episode_id?: number;
    contestant_id?: number;
  };

  if (!episode_id || !contestant_id) {
    res.status(400).json({ error: 'episode_id and contestant_id are required' });
    return;
  }

  const episode = db
    .prepare('SELECT * FROM episodes WHERE id = ?')
    .get(episode_id) as Episode | undefined;
  if (!episode) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }

  const contestant = db.prepare('SELECT id FROM contestants WHERE id = ?').get(contestant_id);
  if (!contestant) {
    res.status(404).json({ error: 'Contestant not found' });
    return;
  }

  const alreadyElim = db
    .prepare('SELECT id FROM eliminations WHERE episode_id = ? AND contestant_id = ?')
    .get(episode_id, contestant_id);
  if (alreadyElim) {
    res.status(409).json({ error: 'Contestant already eliminated in this episode' });
    return;
  }

  const result = db
    .prepare('INSERT INTO eliminations (episode_id, contestant_id) VALUES (?, ?)')
    .run(episode_id, contestant_id);

  const elimination = db
    .prepare(`
      SELECT e.*, c.name AS contestant_name, c.headshot_url
      FROM eliminations e
      JOIN contestants c ON e.contestant_id = c.id
      WHERE e.id = ?
    `)
    .get(result.lastInsertRowid) as Elimination;

  res.status(201).json(elimination);
});

router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const elimination = db
    .prepare('SELECT * FROM eliminations WHERE id = ?')
    .get(req.params.id) as Elimination | undefined;

  if (!elimination) {
    res.status(404).json({ error: 'Elimination not found' });
    return;
  }

  db.prepare('DELETE FROM eliminations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
