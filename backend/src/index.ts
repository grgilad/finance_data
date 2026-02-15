import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import seriesRouter from './routes/series';
import dataRouter from './routes/data';
import { startScheduler } from './scheduler';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());
app.use('/api', seriesRouter);
app.use('/api', dataRouter);

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  startScheduler();
});
