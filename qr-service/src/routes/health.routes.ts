import express, { Request, Response } from 'express';

const router = express.Router();

// Simple health check endpoint
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'qr-service',
    timestamp: new Date().toISOString()
  });
});

export const healthRoutes = router; 