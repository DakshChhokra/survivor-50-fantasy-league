import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db, { Contestant, getCurrentSeason, resolveSeasonId } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const headshotsDir = path.resolve(process.cwd(), 'public/headshots');
if (!fs.existsSync(headshotsDir)) {
  fs.mkdirSync(headshotsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, headshotsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/', (req: Request, res: Response) => {
  const seasonId = resolveSeasonId(req.query.season_id as string | undefined);
  if (!seasonId) {
    res.json([]);
    return;
  }

  const contestants = db
    .prepare(
      `
      SELECT c.*,
        CASE WHEN EXISTS (
          SELECT 1 FROM eliminations el
          JOIN episodes e ON el.episode_id = e.id
          WHERE el.contestant_id = c.id AND e.season_id = c.season_id
        ) THEN 1 ELSE 0 END AS is_eliminated
      FROM contestants c
      WHERE c.season_id = ?
      ORDER BY c.display_order ASC, c.name ASC
    `
    )
    .all(seasonId) as Contestant[];
  res.json(contestants);
});

router.post('/', requireAdmin, upload.single('headshot'), (req: Request, res: Response) => {
  const { name, display_order, season_id } = req.body as {
    name?: string;
    display_order?: string;
    season_id?: string;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const seasonId = resolveSeasonId(season_id) ?? getCurrentSeason()?.id;
  if (!seasonId) {
    res.status(400).json({ error: 'No season selected' });
    return;
  }

  const headshotUrl = req.file ? `/headshots/${req.file.filename}` : null;
  const order = display_order ? parseInt(display_order, 10) : 0;

  const result = db
    .prepare(
      'INSERT INTO contestants (name, headshot_url, display_order, season_id) VALUES (?, ?, ?, ?)'
    )
    .run(name.trim(), headshotUrl, order, seasonId);

  const contestant = db
    .prepare('SELECT * FROM contestants WHERE id = ?')
    .get(result.lastInsertRowid) as Contestant;

  res.status(201).json(contestant);
});

router.patch('/:id', requireAdmin, upload.single('headshot'), (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM contestants WHERE id = ?')
    .get(id) as Contestant | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Contestant not found' });
    return;
  }

  const { name, display_order } = req.body as { name?: string; display_order?: string };
  const updatedName = name?.trim() || existing.name;
  const updatedOrder =
    display_order !== undefined ? parseInt(display_order, 10) : existing.display_order;

  let updatedHeadshotUrl = existing.headshot_url;
  if (req.file) {
    if (existing.headshot_url) {
      const oldFile = path.join(headshotsDir, path.basename(existing.headshot_url));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    updatedHeadshotUrl = `/headshots/${req.file.filename}`;
  }

  db.prepare(
    'UPDATE contestants SET name = ?, headshot_url = ?, display_order = ? WHERE id = ?'
  ).run(updatedName, updatedHeadshotUrl, updatedOrder, id);

  const updated = db
    .prepare('SELECT * FROM contestants WHERE id = ?')
    .get(id) as Contestant;

  res.json(updated);
});

router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const contestant = db
    .prepare('SELECT * FROM contestants WHERE id = ?')
    .get(id) as Contestant | undefined;

  if (!contestant) {
    res.status(404).json({ error: 'Contestant not found' });
    return;
  }

  if (contestant.headshot_url) {
    const filePath = path.join(headshotsDir, path.basename(contestant.headshot_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM contestants WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
