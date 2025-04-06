export interface Package {
  id: string;
  display_id: string;
  location: string;
  created: string;
  updated: string;
  items?: Item[];
  images?: Image[];
}

export interface Item {
  id: string;
  package_id: string;
  name: string;
  quantity: number;
  description: string;
  category: string;
  purchase_price: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  package_id: string;
  url: string;
  display_order: number;
  created_at: string;
  updated_at: string;
} 