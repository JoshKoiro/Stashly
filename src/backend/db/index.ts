import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { initializeDatabase, Package, Item, Image } from './schema';
import path from 'path';
import fs from 'fs';

// Determine project root based on execution context
const isProduction = process.env.NODE_ENV === 'production';
// Note: __dirname in db/index.ts will be different from server.ts
// If running from dist/backend/db/index.js -> ../../.. to root
// If running from src/backend/db/index.ts (ts-node-dev) -> ../../.. to root? Check ts-node-dev behavior.
// Let's assume ts-node-dev runs from project root context for simplicity, matching server.ts logic.
const projectRoot = isProduction ? path.resolve(__dirname, '..', '..', '..') : process.cwd();

// Define data directory and ensure it exists
const dataDir = path.join(projectRoot, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'stashly.db');

export class Database {
  private db: sqlite3.Database;
  private run: (sql: string, params?: any[]) => Promise<void>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
    this.initialize();
  }

  private async initialize() {
    await initializeDatabase(this.db);
  }

  // Package operations
  async createPackage(package_: Omit<Package, 'id' | 'created' | 'updated' | 'display_id'>): Promise<Package> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // Generate a display ID in the format PKG-XXXX where XXXX is a random number
    const displayId = `PKG-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    await this.run(
      'INSERT INTO packages (id, created, updated, display_id, location) VALUES (?, ?, ?, ?, ?)',
      [id, now, now, displayId, package_.location]
    );

    return this.get('SELECT * FROM packages WHERE id = ?', [id]) as Promise<Package>;
  }

  async getPackage(id: string): Promise<Package | null> {
    return this.get('SELECT * FROM packages WHERE id = ?', [id]) as Promise<Package | null>;
  }

  async listPackages(options: {
    searchQuery?: string;
    location?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ packages: (Package & { primary_image_path?: string })[]; totalCount: number }> {
    const { searchQuery, location, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // Select package columns and the primary image path
    // Use a subquery or LEFT JOIN to get the primary image
    let baseSelect = `
      SELECT p.*, (
        SELECT im.file_path
        FROM images im
        WHERE im.package_id = p.id AND im.is_primary = 1
        LIMIT 1
      ) as primary_image_path
      FROM packages p
    `;
    // The count query remains the same as it counts packages, not images
    let countSelect = 'SELECT COUNT(p.id) as count FROM packages p';

    const whereClauses: string[] = [];
    const params: any[] = [];
    const countParams: any[] = [];

    if (searchQuery) {
      // Search package display_id OR existence of matching item name
      whereClauses.push('(p.display_id LIKE ? OR EXISTS (SELECT 1 FROM items i WHERE i.package_id = p.id AND i.name LIKE ?))');
      const searchTerm = `%${searchQuery}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    if (location) {
      whereClauses.push('p.location = ?');
      params.push(location);
      countParams.push(location);
    }

    let whereString = '';
    if (whereClauses.length > 0) {
      whereString = ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const baseQuery = `${baseSelect}${whereString} ORDER BY p.created DESC LIMIT ? OFFSET ?`;
    const countQuery = `${countSelect}${whereString}`;

    const queryParams = [...params, limit, offset];

    const countResult = await this.get(countQuery, countParams);
    const totalCount = countResult?.count || 0;

    // The result type needs to match the promise return type
    const packages = await this.all(baseQuery, queryParams) as (Package & { primary_image_path?: string })[];

    return { packages: packages || [], totalCount };
  }

  async updatePackage(id: string, updates: Partial<Package>): Promise<Package | null> {
    // Define allowed columns for update to prevent SQL injection
    const allowedColumns = ['location']; // Add other updatable columns if needed

    const updateKeys = Object.keys(updates).filter(key =>
      allowedColumns.includes(key)
    );

    if (updateKeys.length === 0) {
      // No valid columns to update, return current package or handle as error
      return this.getPackage(id);
    }

    const setClause = updateKeys
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...updateKeys.map(key => (updates as any)[key]), new Date().toISOString(), id];

    await this.run(
      `UPDATE packages SET ${setClause}, updated = ? WHERE id = ?`,
      values
    );

    return this.get('SELECT * FROM packages WHERE id = ?', [id]) as Promise<Package | null>;
  }

  async deletePackage(id: string): Promise<void> {
    // Wrap operations in a transaction
    await promisify(this.db.exec.bind(this.db))('BEGIN TRANSACTION');

    try {
      // 1. Find items associated with the package
      const items = await this.listItems(id);

      // 2. For each item, find and delete its images (DB record + file)
      for (const item of items) {
        const itemImages = await this.listImages(undefined, item.id);
        for (const image of itemImages) {
          // Delete the image file first
          try {
            // Construct absolute path using projectRoot
            const filePath = path.join(projectRoot, image.file_path);
            await fs.promises.unlink(filePath);
            console.log(`Deleted item image file: ${filePath}`);
          } catch (unlinkError: any) {
            if (unlinkError.code !== 'ENOENT') { // Don't error if file already gone
              console.error(`Failed to delete item image file ${image.file_path}:`, unlinkError);
              // Optionally throw or handle more gracefully depending on requirements
            }
          }
          // Delete the image record from DB
          await this.deleteImage(image.id); // Assumes deleteImage only removes DB record now
        }
      }

      // 3. Delete items associated with the package
      await this.run('DELETE FROM items WHERE package_id = ?', [id]);

      // 4. Find and delete images associated directly with the package (DB record + file)
      const packageImages = await this.listImages(id);
      for (const image of packageImages) {
         // Delete the image file first
         try {
           // Construct absolute path using projectRoot
           const filePath = path.join(projectRoot, image.file_path);
           await fs.promises.unlink(filePath);
           console.log(`Deleted package image file: ${filePath}`);
         } catch (unlinkError: any) {
           if (unlinkError.code !== 'ENOENT') {
             console.error(`Failed to delete package image file ${image.file_path}:`, unlinkError);
             // Optionally throw or handle
           }
         }
         // Delete the image record from DB
         await this.deleteImage(image.id); // Assumes deleteImage only removes DB record now
      }

      // 5. Delete the package itself
      await this.run('DELETE FROM packages WHERE id = ?', [id]);

      // Commit the transaction
      await promisify(this.db.exec.bind(this.db))('COMMIT');
      console.log(`Successfully deleted package ${id} and associated data.`);

    } catch (error) {
      // Rollback transaction on error
      await promisify(this.db.exec.bind(this.db))('ROLLBACK');
      console.error(`Error deleting package ${id}:`, error);
      // Re-throw the error to be caught by the calling function (in server.ts)
      throw new Error(`Failed to delete package ${id}: ${error}`);
    }
  }

  async getUniqueLocations(): Promise<string[]> {
    const rows = await this.all('SELECT DISTINCT location FROM packages ORDER BY location');
    // Ensure rows exist and map to string array
    return rows ? rows.map(row => row.location) : [];
  }

  // Item operations
  async createItem(item: Omit<Item, 'id'>): Promise<Item> {
    const id = crypto.randomUUID();

    await this.run(
      'INSERT INTO items (id, package_id, name, quantity, description, category, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, item.package_id, item.name, item.quantity, item.description, item.category, item.purchase_price, item.purchase_date]
    );

    return this.get('SELECT * FROM items WHERE id = ?', [id]) as Promise<Item>;
  }

  async getItem(id: string): Promise<Item | null> {
    return this.get('SELECT * FROM items WHERE id = ?', [id]) as Promise<Item | null>;
  }

  async listItems(packageId: string): Promise<Item[]> {
    return this.all('SELECT * FROM items WHERE package_id = ? ORDER BY name', [packageId]) as Promise<Item[]>;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | null> {
    // Define allowed columns for update
    const allowedColumns = [
      'package_id', 'name', 'quantity', 'description',
      'category', 'purchase_price', 'purchase_date'
    ];

    const updateKeys = Object.keys(updates).filter(key =>
      allowedColumns.includes(key)
    );

    if (updateKeys.length === 0) {
      return this.getItem(id);
    }

    const setClause = updateKeys
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...updateKeys.map(key => (updates as any)[key]), id];

    await this.run(
      `UPDATE items SET ${setClause} WHERE id = ?`,
      values
    );

    return this.get('SELECT * FROM items WHERE id = ?', [id]) as Promise<Item | null>;
  }

  async deleteItem(id: string): Promise<void> {
    await this.run('DELETE FROM items WHERE id = ?', [id]);
  }

  // Image operations
  async createImage(image: Omit<Image, 'id'>): Promise<Image> {
    const id = crypto.randomUUID();
    await this.run(
      'INSERT INTO images (id, package_id, item_id, file_path, caption, is_primary, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, image.package_id, image.item_id, image.file_path, image.caption, image.is_primary, image.display_order]
    );
    return this.get('SELECT * FROM images WHERE id = ?', [id]) as Promise<Image>;
  }

  async getImage(id: string): Promise<Image | null> {
    return this.get('SELECT * FROM images WHERE id = ?', [id]) as Promise<Image | null>;
  }

  async listImages(packageId?: string, itemId?: string): Promise<Image[]> {
    if (packageId) {
      return this.all('SELECT * FROM images WHERE package_id = ? ORDER BY display_order', [packageId]) as Promise<Image[]>;
    }
    if (itemId) {
      return this.all('SELECT * FROM images WHERE item_id = ? ORDER BY display_order', [itemId]) as Promise<Image[]>;
    }
    return this.all('SELECT * FROM images ORDER BY display_order') as Promise<Image[]>;
  }

  async updateImage(id: string, updates: Partial<Image>): Promise<Image | null> {
    // Define allowed columns for update
    const allowedColumns = [
      'package_id', 'item_id', 'file_path', 'caption',
      'is_primary', 'display_order'
    ];

    const updateKeys = Object.keys(updates).filter(key =>
      allowedColumns.includes(key)
    );

    if (updateKeys.length === 0) {
      return this.getImage(id);
    }

    const setClause = updateKeys
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...updateKeys.map(key => (updates as any)[key]), id];

    await this.run(
      `UPDATE images SET ${setClause} WHERE id = ?`,
      values
    );

    return this.get('SELECT * FROM images WHERE id = ?', [id]) as Promise<Image | null>;
  }

  async deleteImage(id: string): Promise<void> {
    // Note: File deletion logic is removed from here and should be handled
    // by the calling context (e.g., deletePackage or the API endpoint for direct image delete)
    // to ensure atomicity within transactions or specific flows.
    await this.run('DELETE FROM images WHERE id = ?', [id]);
  }

  // Set an image as the primary for a package
  async setPrimaryImage(imageId: string, packageId: string): Promise<void> {
    // Use a transaction to ensure atomicity
    await this.run('BEGIN TRANSACTION');
    try {
      // First, unset any existing primary image for this package
      await this.run(
        'UPDATE images SET is_primary = 0 WHERE package_id = ? AND is_primary = 1',
        [packageId]
      );
      // Then, set the new primary image
      await this.run(
        'UPDATE images SET is_primary = 1 WHERE id = ? AND package_id = ?',
        [imageId, packageId]
      );
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK');
      console.error('Failed to set primary image:', error);
      // Re-throw the error to be handled by the caller
      throw new Error('Failed to update primary image status.');
    }
  }

  // Unset the primary image for a package (sets all is_primary to 0)
  async unsetPrimaryImageForPackage(packageId: string): Promise<void> {
    try {
      await this.run(
        'UPDATE images SET is_primary = 0 WHERE package_id = ? AND is_primary = 1',
        [packageId]
      );
    } catch (error) {
      console.error('Failed to unset primary image for package:', error);
      // Re-throw the error to be handled by the caller
      throw new Error('Failed to unset primary image status.');
    }
  }

  async close(): Promise<void> {
    const close = promisify(this.db.close.bind(this.db));
    await close();
  }
} 