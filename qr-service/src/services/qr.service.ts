import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';

export class QRService {
  private pdfStoragePath: string;
  private baseUrl: string;

  constructor() {
    // Default values, can be overridden by environment variables
    this.pdfStoragePath = process.env.PDF_STORAGE_PATH || '/tmp/qr-pdfs';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000/packages';
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  /**
   * Make sure the PDF storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.pdfStoragePath, { recursive: true });
    } catch (error) {
      console.error('Error creating storage directory:', error);
    }
  }

  /**
   * Generate a QR code for a single package
   */
  public async generateSingleQR(packageId: string): Promise<Buffer> {
    const url = `${this.baseUrl}/${packageId}`;
    return await QRCode.toBuffer(url);
  }

  /**
   * Generate a QR code preview label for a package
   */
  public async previewQRLabel(packageId: string): Promise<Buffer> {
    const url = `${this.baseUrl}/${packageId}`;
    
    // Generate QR code with larger size for preview
    return await QRCode.toBuffer(url, {
      width: 250,
      margin: 1
    });
  }

  /**
   * Generate a PDF with multiple QR codes
   */
  public async generateBulkQR(packageIds: string[]): Promise<Buffer> {
    // Create a PDF document
    const doc = new PDFDocument({
      size: [612, 792], // 8.5 x 11 inches
      margin: 36
    });
    
    // Buffer to store PDF data
    const buffers: Buffer[] = [];
    doc.on('data', (buffer: Buffer) => buffers.push(buffer));
    
    // Create date-based filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `qr-codes-${timestamp}.pdf`;
    const filePath = path.join(this.pdfStoragePath, filename);
    
    // Save to file
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const writeStream = createWriteStream(filePath);
    doc.pipe(writeStream);
    
    // Page settings
    const labelWidth = 2.625 * 72; // Convert inches to points (72 points per inch)
    const labelHeight = 1 * 72;
    const labelsPerRow = 3;
    const labelsPerColumn = 10;
    const marginX = 0.25 * 72;
    const marginY = 0.5 * 72;
    
    let row = 0;
    let col = 0;
    
    // Generate QR codes for each package ID
    for (let i = 0; i < packageIds.length; i++) {
      const packageId = packageIds[i];
      const url = `${this.baseUrl}/${packageId}`;
      
      // Calculate position
      const x = marginX + (col * labelWidth);
      const y = marginY + (row * labelHeight);
      
      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 100,
        margin: 0
      });
      
      // Add QR code to PDF
      doc.image(qrCodeDataURL, x + 10, y + 5, { width: 50 });
      
      // Add text next to QR code
      doc.font('Helvetica')
         .fontSize(10)
         .text(`ID: ${packageId}`, x + 70, y + 15)
         .text(`URL: ${url}`, x + 70, y + 30, { width: 120 });
      
      // Move to next position
      col++;
      if (col >= labelsPerRow) {
        col = 0;
        row++;
        if (row >= labelsPerColumn) {
          row = 0;
          doc.addPage();
        }
      }
    }
    
    // Finalize the PDF
    doc.end();
    
    // Return buffer when the document is complete
    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }
} 