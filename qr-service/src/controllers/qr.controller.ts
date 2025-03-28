import { Request, Response } from 'express';
import { QRService } from '../services/qr.service';

const qrService = new QRService();

/**
 * Generate a single QR code for a package
 */
export const generateSingleQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ 
        error: 'Missing required parameter: id' 
      });
      return;
    }
    
    const qrCode = await qrService.generateSingleQR(id);
    
    res.setHeader('Content-Type', 'image/png');
    res.send(qrCode);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      error: 'Failed to generate QR code' 
    });
  }
};

/**
 * Generate bulk QR codes as a PDF
 */
export const generateBulkQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { package_ids } = req.body;
    
    if (!package_ids || !Array.isArray(package_ids) || package_ids.length === 0) {
      res.status(400).json({ 
        error: 'Missing or invalid package_ids. Must be an array of package IDs.' 
      });
      return;
    }
    
    const pdfBuffer = await qrService.generateBulkQR(package_ids);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="qr-codes.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating bulk QR codes:', error);
    res.status(500).json({ 
      error: 'Failed to generate bulk QR codes' 
    });
  }
};

/**
 * Preview a QR code label
 */
export const previewQRLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ 
        error: 'Missing required parameter: id' 
      });
      return;
    }
    
    const previewImage = await qrService.previewQRLabel(id);
    
    res.setHeader('Content-Type', 'image/png');
    res.send(previewImage);
  } catch (error) {
    console.error('Error generating QR preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate QR preview' 
    });
  }
}; 