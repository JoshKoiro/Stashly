import { Database } from 'sqlite3';
import { promisify } from 'util';

export interface Package {
  id: string;
  created: string;
  updated: string;
  display_id: string;
  location: string;
}

export interface Item {
  id: string;
  package_id: string;
  name: string;
  quantity: number;
  description?: string;
  category?: string;
  purchase_price?: number;
  purchase_date?: string;
}

export interface Image {
  id: string;
  package_id?: string;
  item_id?: string;
  file_path: string;
  caption?: string;
  is_primary: boolean;
  display_order: number;
}

export async function initializeDatabase(db: Database): Promise<void> {
  const run = promisify(db.run.bind(db));

  // Create packages table
  await run(`
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      display_id TEXT NOT NULL UNIQUE,
      location TEXT NOT NULL
    )
  `);

  // Create items table
  await run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      description TEXT,
      category TEXT,
      purchase_price REAL,
      purchase_date TEXT,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    )
  `);

  // Create images table
  await run(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      package_id TEXT,
      item_id TEXT,
      file_path TEXT NOT NULL,
      caption TEXT,
      is_primary BOOLEAN NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      CHECK (
        (package_id IS NOT NULL AND item_id IS NULL) OR
        (package_id IS NULL AND item_id IS NOT NULL)
      )
    )
  `);
} 