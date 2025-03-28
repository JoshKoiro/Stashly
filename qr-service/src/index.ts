import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { qrRoutes } from './routes/qr.routes';
import { healthRoutes } from './routes/health.routes';

// Load environment variables
const PORT = process.env.QR_SERVICE_PORT || 3001;

// Create Express app
const app = express();

// Apply middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Register routes
app.use('/api/qr', qrRoutes);
app.use('/health', healthRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`QR Service running on port ${PORT}`);
});

export default app; 