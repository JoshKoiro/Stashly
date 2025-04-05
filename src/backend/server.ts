import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { Database } from './db/index';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const app = express();
// Ensure port is a number
const port = parseInt(process.env.PORT || '3000', 10);

// Determine the correct base directory depending on execution context
const isProduction = process.env.NODE_ENV === 'production';
// Always point baseDir to the project root
const baseDir = isProduction ? path.join(__dirname, '..', '..') : process.cwd();

// Create uploads directory relative to the project root
const uploadsDir = path.join(baseDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files in production
if (isProduction) {
  const frontendBuildPath = path.join(__dirname, '..', 'public'); // Path is relative to dist/backend
  app.use(express.static(frontendBuildPath));

  // Serve index.html for any route not handled by API or static files (for SPA routing)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next(); // Skip API and upload routes
    }
    res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
  });
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Use the dynamically determined uploadsDir
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Database instance
const db = new Database();

// Package routes
app.post('/api/packages', async (req, res) => {
  try {
    const package_ = await db.createPackage(req.body);
    res.status(201).json(package_);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.get('/api/packages', async (req, res) => {
  try {
    // Extract query parameters
    const searchQuery = req.query.search as string | undefined;
    const location = req.query.location as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);

    const result = await db.listPackages({
      searchQuery,
      location,
      page,
      limit
    });
    // Return the object containing packages and totalCount
    res.json(result);
  } catch (error) {
    console.error('Error listing packages:', error);
    // Return error object instead of empty array
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const package_ = await db.getPackage(req.params.id);
    if (!package_) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    res.json(package_);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get package' });
  }
});

app.put('/api/packages/:id', async (req, res) => {
  try {
    const package_ = await db.updatePackage(req.params.id, req.body);
    if (!package_) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }
    res.json(package_);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update package' });
  }
});

app.delete('/api/packages/:id', async (req, res) => {
  try {
    await db.deletePackage(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Item routes
app.post('/api/packages/:packageId/items', async (req, res) => {
  try {
    const item = await db.createItem({
      ...req.body,
      package_id: req.params.packageId
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.get('/api/packages/:packageId/items', async (req, res) => {
  try {
    const items = await db.listItems(req.params.packageId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list items' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await db.getItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const item = await db.updateItem(req.params.id, req.body);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await db.deleteItem(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Image routes
app.post('/api/images', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Store the relative path from the base directory
    const relativeFilePath = path.relative(baseDir, req.file.path);

    const image = await db.createImage({
      package_id: req.body.package_id,
      item_id: req.body.item_id,
      // Use the correct relative file path
      file_path: relativeFilePath.replace(/\\/g, '/'), // Ensure forward slashes
      caption: req.body.caption,
      is_primary: req.body.is_primary === 'true',
      display_order: parseInt(req.body.display_order || '0', 10)
    });

    res.status(201).json(image);
  } catch (error) {
    console.error('Error creating image:', error);
    // Cleanup uploaded file if DB insertion failed
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting orphaned upload:', err);
      });
    }
    res.status(500).json({ error: 'Failed to create image' });
  }
});

app.get('/api/packages/:packageId/images', async (req, res) => {
  try {
    const images = await db.listImages(req.params.packageId);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list images' });
  }
});

app.get('/api/items/:itemId/images', async (req, res) => {
  try {
    const images = await db.listImages(undefined, req.params.itemId);
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list images' });
  }
});

app.delete('/api/images/:id', async (req, res) => {
  try {
    const image = await db.getImage(req.params.id);
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    // Construct the absolute file path using the baseDir
    const filePath = path.join(baseDir, image.file_path);

    // Use asynchronous unlink and the imported fs module
    try {
        await fs.promises.unlink(filePath);
    } catch (unlinkError: any) { // Catch specific error type if known
        // Log the error but proceed with deleting the DB record
        // The file might already be deleted or permissions issue
        if (unlinkError.code !== 'ENOENT') { // Don't log if file simply doesn't exist
          console.error(`Failed to delete image file ${filePath}:`, unlinkError);
        }
    }

    await db.deleteImage(req.params.id);
    res.status(204).send();
  } catch (error) {
    // It's good practice to check the type of error if possible
    if (error instanceof Error) {
        console.error('Error deleting image:', error.message);
    } else {
        console.error('An unknown error occurred during image deletion');
    }
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// QR Code generation
app.get('/api/packages/:id/qr', async (req, res) => {
  try {
    const package_ = await db.getPackage(req.params.id);
    if (!package_) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    const url = `${req.protocol}://${req.get('host')}/packages/${package_.id}`;
    const qrCode = await QRCode.toDataURL(url);
    res.json({ qrCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// QR Code label PDF generation
app.post('/api/qr-labels', async (req, res) => {
  try {
    const { packageIds, copies: requestedCopies, offset: requestedOffset } = req.body;
    const copies = Math.max(1, parseInt(requestedCopies, 10) || 1); // Default to 1 copy
    const offset = Math.max(0, parseInt(requestedOffset, 10) || 0); // Default to 0 offset, ensure non-negative

    if (!Array.isArray(packageIds) || packageIds.length === 0) {
      res.status(400).json({ error: 'Invalid package IDs' });
      return;
    }

    const packages = await Promise.all(
      packageIds.map(id => db.getPackage(id))
    );

    // Create a list of labels to print, duplicating packages based on 'copies'
    const labelsToPrint = packages.flatMap(pkg =>
      pkg ? Array(copies).fill(pkg) : [] // Repeat valid packages 'copies' times
    );

    if (labelsToPrint.length === 0) {
      // Handle case where no valid packages were found or provided
      res.status(400).json({ error: 'No valid packages found to generate labels.' });
      return;
    }

    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 0,
      autoFirstPage: false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=qr-labels.pdf');
    doc.pipe(res);

    // Avery 5160 Label Layout Constants (in points)
    const labelWidth = 2.625 * 72;
    const labelHeight = 1 * 72;
    const marginTop = 0.5 * 72;       // Top margin
    const marginLeft = 0.1875 * 72;   // Left margin
    const horizontalGutter = 0.125 * 72; // Horizontal space between labels
    const verticalGutter = 0;         // No vertical space between labels in this format
    const labelsPerRow = 3;
    const labelsPerColumn = 10;
    const labelsPerPage = labelsPerRow * labelsPerColumn;
    const labelPadding = 5; // Internal padding within the label

    // Font settings
    const baseFont = 'Helvetica';
    const idFontSize = 14;
    const locationFontSize = 10; // Increased font size

    let currentPage = -1; // Initialize to -1 to handle first page creation correctly
    // doc.addPage(); // Remove initial page add, let the loop handle it

    // Iterate through the potentially duplicated list of labels
    for (let i = 0; i < labelsToPrint.length; i++) {
      const package_ = labelsToPrint[i]; // Get the package data for the current label
      // No need to check if package_ is null here as flatMap filtered them

      // Calculate the effective index considering the offset
      const effectiveIndex = i + offset;

      // Calculate page and position based on the effective index
      const totalLabelsPerPage = labelsPerRow * labelsPerColumn;
      const pageIndex = Math.floor(effectiveIndex / totalLabelsPerPage);
      const labelIndexOnPage = effectiveIndex % totalLabelsPerPage;
      const row = Math.floor(labelIndexOnPage / labelsPerRow);
      const col = labelIndexOnPage % labelsPerRow;

      // Add a new page if necessary
      if (pageIndex > currentPage) {
        doc.addPage(); // Add page only when needed
        currentPage = pageIndex;
      }

      // Calculate top-left corner of the current label
      const x = marginLeft + col * (labelWidth + horizontalGutter);
      const y = marginTop + row * (labelHeight + verticalGutter);

      // --- Draw Label Content ---
      const contentX = x + labelPadding;
      const contentY = y + labelPadding;
      const contentWidth = labelWidth - 2 * labelPadding;
      const contentHeight = labelHeight - 2 * labelPadding;

      // QR Code Generation and Placement
      const qrSize = contentHeight * 0.9; // Slightly smaller QR code for padding
      const qrCodeX = contentX;
      // Center QR code vertically within the content height
      const qrCodeY = contentY + (contentHeight - qrSize) / 2;
      const url = `${req.protocol}://${req.get('host')}/packages/${package_.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: qrSize,
        margin: 1, // Small internal margin for the QR code itself
        errorCorrectionLevel: 'M'
      });

      // Add QR Code Image (ensure width and height are the same to prevent stretching)
      doc.image(qrCodeDataUrl, qrCodeX, qrCodeY, {
        width: qrSize,
        height: qrSize
      });

      // Text Area Calculation
      const textX = qrCodeX + qrSize + labelPadding; // Start text after QR code + padding
      const textWidth = contentWidth - qrSize - labelPadding; // Remaining width for text

      // Calculate text heights for vertical centering
      doc.font(baseFont + '-Bold').fontSize(idFontSize);
      // Use lineBreak: false for ID height calculation as we want it on one line if possible
      const idHeight = doc.heightOfString(package_.display_id, { width: textWidth, lineBreak: false });

      doc.font(baseFont).fontSize(locationFontSize);
      // Use lineBreak: true for location height calculation as we want it to wrap
      const locationText = package_.location || 'N/A';
      const locationHeight = doc.heightOfString(locationText, { width: textWidth, lineBreak: true });

      const totalTextHeight = idHeight + locationHeight + 2; // +2 for the gap
      const textStartY = contentY + (contentHeight - totalTextHeight) / 2; // Center the text block vertically

      // Add Display ID (Large Font)
      doc.font(baseFont + '-Bold').fontSize(idFontSize);
      doc.text(package_.display_id, textX, textStartY, {
        width: textWidth,
        align: 'left',
        lineBreak: false, // Keep ID on one line if possible
        ellipsis: true      // Use ellipsis if ID is too long
      });

      // Add Location (Slightly Larger Font, Wrapped)
      doc.font(baseFont).fontSize(locationFontSize);
      const locationY = textStartY + idHeight + 2; // Position location below the ID
      doc.text(locationText, textX, locationY, {
        width: textWidth,
        align: 'left',
        lineBreak: true // Allow location to wrap
        // No ellipsis needed if we allow wrapping
      });

      // // Optional: Draw border around label for debugging layout
      // doc.rect(x, y, labelWidth, labelHeight).stroke();
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code labels' });
  }
});

// New endpoint for fetching unique locations
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await db.getUniqueLocations();
    res.json(locations || []);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// New endpoint to set primary image for a package
app.put('/api/packages/:packageId/images/:imageId/primary', async (req, res) => {
  const { packageId, imageId } = req.params;
  try {
    await db.setPrimaryImage(imageId, packageId);
    res.status(200).json({ message: 'Primary image updated successfully.' });
  } catch (error) {
    // Log the error from setPrimaryImage
    if (error instanceof Error) {
      console.error('Error setting primary image:', error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error('An unknown error occurred setting primary image');
      res.status(500).json({ error: 'Failed to set primary image' });
    }
  }
});

// New endpoint to UNSET primary image for a package
app.delete('/api/packages/:packageId/primary-image', async (req, res) => {
  const { packageId } = req.params;
  try {
    await db.unsetPrimaryImageForPackage(packageId);
    res.status(200).json({ message: 'Primary image unset successfully.' });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error unsetting primary image:', error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error('An unknown error occurred unsetting primary image');
      res.status(500).json({ error: 'Failed to unset primary image' });
    }
  }
});

// Start server
const host = isProduction ? '0.0.0.0' : 'localhost';
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
}); 