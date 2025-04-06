import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { Database } from './db/index';
import QRCode from 'qrcode';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { Package } from './schema';
import { baseQrCodeOptions } from '../shared/qrCodeOptions';

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

// Modified Endpoint: Return data for QR Code Label Preview
app.get('/api/qr-labels-preview', async (req, res) => {
  try {
    const { packageIds: packageIdsQuery, copies: copiesQuery, offset: offsetQuery } = req.query;

    if (typeof packageIdsQuery !== 'string' || !packageIdsQuery) {
      // Return JSON error
      return res.status(400).json({ error: 'Missing or invalid packageIds query parameter.' });
    }

    const packageIds = packageIdsQuery.split(',').map(id => id.trim()).filter(id => id); // Trim and filter empty strings
    const copies = Math.max(1, parseInt(copiesQuery as string || '1', 10));
    const offset = Math.max(0, parseInt(offsetQuery as string || '0', 10));

    if (packageIds.length === 0) {
        return res.status(400).json({ error: 'No package IDs provided.' });
    }

    // Fetch package data
    // Use Promise.allSettled to handle cases where some packages might not be found
    const results = await Promise.allSettled(
        packageIds.map(id => db.getPackage(id))
    );

    const validPackages = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => (result as PromiseFulfilledResult<any>).value);

    if (validPackages.length === 0) {
        // If IDs were provided but none were found/valid
        return res.status(404).json({ error: 'No valid packages found for the provided IDs.' });
    }

    // Construct the base URL needed for QR codes on the client-side
    // Note: req.protocol might be http if behind a proxy, consider X-Forwarded-Proto header if applicable
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${protocol}://${req.get('host')}`;

    // Prepare data to be sent as JSON
    const responseData = {
        packages: validPackages,
        copies,
        offset,
        baseUrl,
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error serving QR label preview data:', error);
    res.status(500).json({ error: 'Failed to fetch QR code labels preview data' });
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

// --- ADDED: PDF Generation Endpoint ---
app.get('/api/generate-qr-labels-pdf', async (req, res) => {
  console.info('[/api/generate-qr-labels-pdf] Received request'); // Log start
  const { packageIds: packageIdsStr, copies: copiesStr, offset: offsetStr } = req.query;

  // 1. Validate Input
  if (!packageIdsStr || typeof packageIdsStr !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid packageIds query parameter.' });
  }
  const packageIds = packageIdsStr.split(',');
  if (packageIds.length === 0) {
    return res.status(400).json({ error: 'No package IDs provided.' });
  }

  const copies = parseInt(copiesStr as string || '1', 10);
  const offset = parseInt(offsetStr as string || '0', 10);
  if (isNaN(copies) || copies < 1 || isNaN(offset) || offset < 0) {
    return res.status(400).json({ error: 'Invalid copies or offset parameter.' });
  }

  let browser = null; // Define browser outside try block for finally cleanup
  try {
    console.info('Fetching package data...');
    // 2. Fetch Package Data
    const packages = [];
    for (const id of packageIds) {
      const pkg = await db.getPackage(id);
      if (pkg) {
        packages.push(pkg);
      } else {
        console.warn(`Package with ID ${id} not found, skipping.`);
        // Optionally return an error if any ID is not found:
        // return res.status(404).json({ error: `Package with ID ${id} not found.` });
      }
    }
    console.info(`Fetched ${packages.length} valid packages.`);

    if (packages.length === 0) {
        console.warn('No valid packages found, sending 404.');
        return res.status(404).json({ error: 'No valid packages found for the provided IDs.' });
    }

    // 3. Prepare Labels Data
    const labelsToRender: Package[] = [];
    packages.forEach(pkg => {
      for (let i = 0; i < copies; i++) {
        labelsToRender.push({ ...pkg }); // Add copies
      }
    });

    console.info('Reading CSS...');
    // 4. Read CSS File Content
    const cssPath = path.join(baseDir, 'src', 'frontend', 'components', 'QRCodeLabelPreview.css');
    let cssContent = '';
    try {
        cssContent = fs.readFileSync(cssPath, 'utf-8');
    } catch (err) {
        console.error("Error reading CSS file:", err);
        return res.status(500).json({ error: 'Could not load label styles.' });
    }
    console.info('CSS read successfully.');

    console.info('Generating HTML string...');
    // 5. Generate HTML Content
    const baseUrl = `${req.protocol}://${req.get('host')}`; // Get base URL for QR codes
    const offsetPlaceholders = Array(offset % 30).fill(null).map((_, i) =>
      `<div key="offset-${i}" class="label-cell placeholder"></div>`
    ).join('');

    const labelCellsHtml = labelsToRender.map((label, index) => {
      const url = `${baseUrl}/packages/${label.id}`; // Construct URL for QR code data
      return `
        <div key="${label.id}-${index}" class="label-cell">
          <div class="label-content">
            <div class="qr-code-placeholder" data-url="${url}"></div>
            <div class="label-text">
              <div class="label-id">${label.display_id}</div>
              <div class="label-location">${label.location || 'N/A'}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Convert the base options object to a JSON string to inject into the script
    // We only need the styling-related parts, not width/height/data which are set per-label
    const stylingOptionsJson = JSON.stringify({
        type: baseQrCodeOptions.type,
        margin: baseQrCodeOptions.margin,
        imageOptions: baseQrCodeOptions.imageOptions,
        qrOptions: baseQrCodeOptions.qrOptions,
        dotsOptions: baseQrCodeOptions.dotsOptions,
        cornersSquareOptions: baseQrCodeOptions.cornersSquareOptions,
        cornersDotOptions: baseQrCodeOptions.cornersDotOptions,
        backgroundOptions: baseQrCodeOptions.backgroundOptions,
    });

    const htmlString = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>QR Labels</title>
          <style>
              /* Inject CSS content here */
              ${cssContent}

              /* --- Moved Aggressive Reset Below --- */

              /* Ensure placeholders are sized correctly AND have NO top margin/padding */
              .label-cell.placeholder {
                 width: 2.625in;
                 height: 1in;
                 box-sizing: border-box;
                 margin-top: 0 !important;
                 padding-top: 0 !important;
                 /* background-color: #eee; */ /* Optional: for debugging */
              }
              /* Ensure QR placeholder has definite size for library */
               .qr-code-placeholder {
                   width: 80px; /* Match frontend */
                   height: 80px; /* Match frontend */
                   margin-left: 6pt;
                   margin-right: 8pt;
                   flex-shrink: 0;
                   display: flex;
                   align-items: center;
                   justify-content: center;
               }

               /* --- AGGRESSIVE RESET for Print PDF (MOVED TO END) --- */
               body, html, .labels-container {
                   margin-top: 0 !important;
                   padding-top: 0 !important;
               }
               /* --- End Aggressive Reset --- */

          </style>
          <!-- Include qr-code-styling library from CDN -->
           <script src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0/lib/qr-code-styling.js"></script>
      </head>
      <body>
          <div class="labels-container printable-area">
              ${offsetPlaceholders}
              ${labelCellsHtml}
          </div>

          <script>
              document.addEventListener('DOMContentLoaded', () => {
                  const placeholders = document.querySelectorAll('.qr-code-placeholder');
                  // Parse the shared styling options from the injected JSON string
                  const sharedStylingOptions = ${stylingOptionsJson};

                  placeholders.forEach(placeholder => {
                      const url = placeholder.getAttribute('data-url');
                      if (url) {
                           const qrCodeInstance = new QRCodeStyling({
                                // Spread the shared styling options
                                ...sharedStylingOptions,
                                // Override with per-label data and standard dimensions
                                width: 80,
                                height: 80,
                                data: url,
                           });
                           qrCodeInstance.append(placeholder);
                      }
                  });
                  document.body.setAttribute('data-qr-codes-rendered', 'true');
              });
          </script>
      </body>
      </html>
    `;
    console.info('HTML string generated.');

    console.info('Launching Puppeteer...');
    // 6. Launch Puppeteer and Generate PDF
    browser = await puppeteer.launch({
       headless: true, // Use new headless mode
       args: ['--no-sandbox', '--disable-setuid-sandbox'], // Common args for server environments
       executablePath: puppeteer.executablePath(), // ADDED: Explicitly set executable path
    });
    console.info('Puppeteer launched.');
    const page = await browser.newPage();
    console.info('Puppeteer page created.');

    // Emulate print media type *before* setting content
    await page.emulateMediaType('print');

    console.info('Setting page content...');
    await page.setContent(htmlString, { waitUntil: 'networkidle0' }); // Wait until network is idle
    console.info('Page content set.');

    // Optional: Wait specifically for QR codes to be rendered by our script
    console.info('Waiting for QR code SVGs to render...');
    try {
      await page.waitForSelector('.qr-code-placeholder svg', { timeout: 15000 }); // Wait for SVGs to appear
      console.info('QR code SVGs rendered.');
    } catch (waitError) {
        console.error("Timeout or error waiting for QR codes to render:", waitError);
        // Decide if you want to proceed anyway or return an error
        // return res.status(500).json({ error: 'Failed to render QR codes in time.' });
    }

    console.info('Generating PDF buffer...');
    let pdfBuffer: Buffer | null = null; // Initialize as null
    try {
        const pdfUint8Array = await page.pdf({
          format: 'Letter',
          printBackground: true, // Important for styles
          margin: {
            top: '0.5in',
            right: '0.1875in',
            bottom: '0.0in', // No bottom margin needed unless labels go right to the edge
            left: '0.1875in'
          },
          preferCSSPageSize: false // Use format/margin options above
        });
        // Convert Uint8Array to Buffer
        pdfBuffer = Buffer.from(pdfUint8Array);
        console.info(`PDF buffer generated. Size: ${pdfBuffer?.length || 0} bytes.`);
    } catch(pdfError) {
        console.error('Error occurred specifically during page.pdf():', pdfError);
        // Ensure browser is closed even if pdf generation fails
        if (browser) { await browser.close(); browser = null; }
        return res.status(500).json({ error: 'Failed during PDF generation step.' });
    }

    // Check if buffer is valid
    if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error('PDF buffer is empty or invalid after generation.');
        if (browser) { await browser.close(); browser = null; }
        return res.status(500).json({ error: 'Generated PDF buffer was empty.' });
    }

    // 7. Send PDF Response
    console.info('Setting PDF headers and sending response...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="qr-labels.pdf"'); // Display inline
    res.send(pdfBuffer);
    console.info('PDF response sent.');

  } catch (error) {
    console.error('Error generating PDF (outer catch block):', error);
    res.status(500).json({ error: 'Failed to generate PDF labels.' });
  } finally {
    // 8. Ensure Browser is Closed
    if (browser) {
      console.info('Closing Puppeteer browser...');
      await browser.close();
      console.info('Puppeteer browser closed.');
    }
  }
});
// --- END: PDF Generation Endpoint ---

// Start server
const host = isProduction ? '0.0.0.0' : 'localhost';
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});