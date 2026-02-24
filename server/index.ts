import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import './db';

import authRoutes from './routes/auth';
import contestantsRoutes from './routes/contestants';
import episodesRoutes from './routes/episodes';
import eliminationsRoutes from './routes/eliminations';
import predictionsRoutes from './routes/predictions';
import preseasonPicksRoutes from './routes/preseasonPicks';
import leaderboardRoutes from './routes/leaderboard';
import showStatusRoutes from './routes/showStatus';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const headshotsDir = path.resolve(process.cwd(), 'public/headshots');
if (!fs.existsSync(headshotsDir)) {
  fs.mkdirSync(headshotsDir, { recursive: true });
}
app.use('/headshots', express.static(headshotsDir));

app.use('/api/auth', authRoutes);
app.use('/api/contestants', contestantsRoutes);
app.use('/api/episodes', episodesRoutes);
app.use('/api/eliminations', eliminationsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/preseason-picks', preseasonPicksRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/show-status', showStatusRoutes);

const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
