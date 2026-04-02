import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    data: {
      status: 'ok',
      service: 'pinpoint-api',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
