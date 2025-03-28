import express from 'express';
import { generateSingleQR, generateBulkQR, previewQRLabel } from '../controllers/qr.controller';

const router = express.Router();

// QR Code routes
router.get('/single/:id', generateSingleQR);
router.post('/bulk', generateBulkQR);
router.get('/preview/:id', previewQRLabel);

export const qrRoutes = router; 