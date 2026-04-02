import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import historyRoutes from './routes/history.routes.js';
import parcelsRoutes from './routes/parcels.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import usersRoutes from './routes/users.routes.js';

function createCorsOptions() {
  if (env.corsOrigins === '*') {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('This origin is not allowed by CORS.'));
    },
  };
}

const app = express();

app.use(cors(createCorsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    data: {
      name: 'PinPoint API',
      version: '1.0.0',
    },
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/parcels', parcelsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
