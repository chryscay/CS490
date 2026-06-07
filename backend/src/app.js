import express from 'express';

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Health check — used to verify backend is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
