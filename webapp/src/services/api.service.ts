import axios from 'axios';
import { 
  Package, 
  Category, 
  ApiResponse, 
  PaginatedResponse, 
  SearchParams 
} from '../types';

// Access runtime environment variables
declare global {
  interface Window {
    _env_?: {
      REACT_APP_API_URL?: string;
      REACT_APP_QR_SERVICE_URL?: string;
    };
  }
}

// Use runtime environment variables if available, fall back to process.env, then defaults
const API_URL = window._env_?.REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8090';
const QR_SERVICE_URL = window._env_?.REACT_APP_QR_SERVICE_URL || process.env.REACT_APP_QR_SERVICE_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Check if PocketBase is initialized
export const checkPocketBaseStatus = async (): Promise<boolean> => {
  try {
    console.log('API URL being used:', API_URL);
    const response = await api.get('/api/health');
    console.log('PocketBase health:', response.data);
    return response.data.code === 200;
  } catch (error) {
    console.error('Error checking PocketBase status:', error);
    return false;
  }
};

// Package API calls - using PocketBase public API format
export const getPackages = async (params?: SearchParams): Promise<PaginatedResponse<Package>> => {
  try {
    // For demo/dev, if API is not set up yet, return mock data
    const isApiReady = await checkPocketBaseStatus();
    if (!isApiReady) {
      console.log('API not ready, returning mock data');
      return {
        page: 1,
        perPage: 10,
        totalItems: 2,
        totalPages: 1,
        items: [
          { 
            id: '1', 
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            display_id: 'PKG-001',
            location: 'A1',
            items: [{ name: 'Mock Item 1', quantity: 5, category: 'Electronics' }],
            images: [],
            status: 'active' as const,
            created_by: 'system',
            last_modified_by: 'system'
          },
          { 
            id: '2', 
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            display_id: 'PKG-002',
            location: 'B2',
            items: [{ name: 'Mock Item 2', quantity: 10, category: 'Office' }],
            images: [],
            status: 'active' as const,
            created_by: 'system',
            last_modified_by: 'system'
          }
        ]
      };
    }
    
    // Otherwise try to get data from API
    const response = await api.get('/api/collections/packages/records', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching packages:', error);
    // Return mock data on error for demo purposes
    return {
      page: 1,
      perPage: 10,
      totalItems: 2,
      totalPages: 1,
      items: [
        { 
          id: '1', 
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          display_id: 'PKG-001',
          location: 'A1',
          items: [{ name: 'Mock Item 1', quantity: 5, category: 'Electronics' }],
          images: [],
          status: 'active' as const,
          created_by: 'system',
          last_modified_by: 'system'
        },
        { 
          id: '2', 
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          display_id: 'PKG-002',
          location: 'B2',
          items: [{ name: 'Mock Item 2', quantity: 10, category: 'Office' }],
          images: [],
          status: 'active' as const,
          created_by: 'system',
          last_modified_by: 'system'
        }
      ]
    };
  }
};

export const getPackage = async (id: string): Promise<ApiResponse<Package>> => {
  try {
    const response = await api.get(`/api/collections/packages/records/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching package ${id}:`, error);
    throw error;
  }
};

export const createPackage = async (packageData: Partial<Package>): Promise<ApiResponse<Package>> => {
  try {
    const response = await api.post('/api/collections/packages/records', packageData);
    return response.data;
  } catch (error) {
    console.error('Error creating package:', error);
    throw error;
  }
};

export const updatePackage = async (id: string, packageData: Partial<Package>): Promise<ApiResponse<Package>> => {
  try {
    const response = await api.patch(`/api/collections/packages/records/${id}`, packageData);
    return response.data;
  } catch (error) {
    console.error(`Error updating package ${id}:`, error);
    throw error;
  }
};

export const deletePackage = async (id: string): Promise<ApiResponse<null>> => {
  try {
    const response = await api.delete(`/api/collections/packages/records/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting package ${id}:`, error);
    throw error;
  }
};

export const searchPackages = async (params: SearchParams): Promise<PaginatedResponse<Package>> => {
  try {
    const response = await api.get('/api/collections/packages/records', { 
      params: { 
        filter: params.query ? `name~"${params.query}"` : undefined,
        ...params 
      } 
    });
    return response.data;
  } catch (error) {
    console.error('Error searching packages:', error);
    throw error;
  }
};

// Category API calls
export const getCategories = async (): Promise<ApiResponse<Category[]>> => {
  try {
    const response = await api.get('/api/collections/categories/records');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const createCategory = async (categoryData: Partial<Category>): Promise<ApiResponse<Category>> => {
  try {
    const response = await api.post('/api/collections/categories/records', categoryData);
    return response.data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<ApiResponse<null>> => {
  try {
    const response = await api.delete(`/api/collections/categories/records/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting category ${id}:`, error);
    throw error;
  }
};

// QR Code API calls
export const getSingleQR = (id: string): string => {
  return `${QR_SERVICE_URL}/api/qr/single/${id}`;
};

export const getPreviewQR = (id: string): string => {
  return `${QR_SERVICE_URL}/api/qr/preview/${id}`;
};

export const generateBulkQR = async (packageIds: string[]): Promise<Blob> => {
  const response = await axios({
    url: `${QR_SERVICE_URL}/api/qr/bulk`,
    method: 'POST',
    data: { package_ids: packageIds },
    responseType: 'blob'
  });
  
  return response.data;
}; 