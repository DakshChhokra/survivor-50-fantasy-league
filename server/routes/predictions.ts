import { Router, Request, Response } from 'express';
import db, { Episode, Prediction } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/episode/:episodeId', (req: Request, res: Response) => {
  const { episodeId } = req.params;

  const predictions = db
    .prepare(`
      SELECT p.*, u.username, c.name AS contestant_name, c.headshot_url,
        CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
        ) THEN 1 ELSE 0 END AS is_correct
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      JOIN contestants c ON p.contestant_id = c.id
      WHERE p.episode_id = ?
      ORDER BY u.username ASC
    `)
    .all(episodeId);

  res.json(predictions);
});

router.get('/mine', requireAuth, (req: Request, res: Response) => {
  const predictions = db
    .prepare(`
      SELECT p.*, c.name AS contestant_name, c.headshot_url,
        e.episode_number, e.air_date, e.is_locked,
        CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          WHERE el.episode_id = p.episode_id AND el.contestant_id = p.contestant_id
        ) THEN 1 ELSE 0 END AS is_correct
      FROM predictions p
      JOIN contestants c ON p.contestant_id = c.id
      JOIN episodes e ON p.episode_id = e.id
      WHERE p.user_id = ?
      ORDER BY e.episode_number ASC
    `)
    .all(req.user!.userId);

  res.json(predictions);
});

router.post('/', requireAuth, (req: Request, res: Response) => {
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

  if (episode.is_locked) {
    res.status(403).json({ error: 'Picks are locked for this episode' });
    return;
  }

  if (episode.deadline && new Date() > new Date(episode.deadline)) {
    res.status(403).json({ error: 'The deadline for this episode has passed' });
    return;
  }

  const contestant = db.prepare('SELECT id FROM contestants WHERE id = ?').get(contestant_id);
  if (!contestant) {
    res.status(404).json({ error: 'Contestant not found' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM predictions WHERE user_id = ? AND episode_id = ?')
    .get(req.user!.userId, episode_id) as Prediction | undefined;

  if (existing) {
    db.prepare('UPDATE predictions SET contestant_id = ? WHERE id = ?').run(
      contestant_id,
      existing.id
    );
    const updated = db
      .prepare(`
        SELECT p.*, c.name AS contestant_name, c.headshot_url
        FROM predictions p
        JOIN contestants c ON p.contestant_id = c.id
        WHERE p.id = ?
      `)
      .get(existing.id);
    res.json(updated);
  } else {
    const result = db
      .prepare('INSERT INTO predictions (user_id, episode_id, contestant_id) VALUES (?, ?, ?)')
      .run(req.user!.userId, episode_id, contestant_id);

    const prediction = db
      .prepare(`
        SELECT p.*, c.name AS contestant_name, c.headshot_url
        FROM predictions p
        JOIN contestants c ON p.contestant_id = c.id
        WHERE p.id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json(prediction);
  }
});

router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const prediction = db
    .prepare('SELECT * FROM predictions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.userId) as Prediction | undefined;

  if (!prediction) {
    res.status(404).json({ error: 'Prediction not found' });
    return;
  }

  const episode = db
    .prepare('SELECT * FROM episodes WHERE id = ?')
    .get(prediction.episode_id) as Episode;

  if (episode.is_locked || (episode.deadline && new Date() > new Date(episode.deadline))) {
    res.status(403).json({ error: 'Cannot delete a locked prediction' });
    return;
  }

  db.prepare('DELETE FROM predictions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
