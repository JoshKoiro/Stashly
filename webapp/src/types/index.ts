// Package types
export interface PackageItem {
  name: string;
  quantity: number;
  description?: string;
  category?: string;
  purchase_price?: number;
  purchase_date?: string;
}

export interface PackageImage {
  file: string;
  caption?: string;
  is_primary: boolean;
  order: number;
}

export interface Package {
  id: string;
  created: string;
  updated: string;
  display_id: string;
  location: string;
  items: PackageItem[];
  images: PackageImage[];
  status: 'active' | 'archived' | 'deleted';
  created_by: string;
  last_modified_by: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  created: string;
  updated: string;
  description?: string;
  parent_category?: string;
}

// API types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

// Search types
export interface SearchParams {
  query?: string;
  location?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

// QR code types
export interface QRCodeParams {
  package_id: string;
}

export interface BulkQRCodeParams {
  package_ids: string[];
} 