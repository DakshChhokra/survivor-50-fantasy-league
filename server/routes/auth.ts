import { Router, Request, Response } from 'express';
import db, { User } from '../db';
import { signToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  if (username.trim().length < 2) {
    res.status(400).json({ error: 'Username must be at least 2 characters' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  const result = stmt.run(username.trim(), password);
  const userId = result.lastInsertRowid as number;
  const token = signToken(userId, username.trim());

  res.status(201).json({ token, username: username.trim(), isAdmin: false });
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username.trim()) as User | undefined;

  if (!user || user.password !== password) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const isAdmin = user.username === ADMIN_USERNAME;
  const token = signToken(user.id, user.username);

  res.json({ token, username: user.username, isAdmin });
});

router.get('/users', requireAdmin, (_req: Request, res: Response) => {
  const users = db
    .prepare('SELECT id, username, created_at FROM users ORDER BY created_at ASC')
    .all();
  res.json(users);
});

export default router;
