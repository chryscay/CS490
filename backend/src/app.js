import cors from 'cors';
import express from 'express';
import auth from './routes/auth/auth.route.js';
import jobs from './routes/jobs/jobs.route.js';
import profile from './routes/profile/profile.route.js';

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());
app.use(cors());
app.use('/api/profile', profile);

// Health check — used to verify backend is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', auth);
app.use('/api/jobs', jobs);

export default app;
