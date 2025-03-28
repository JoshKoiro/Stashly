import axios from 'axios';
import { 
  Package, 
  Category, 
  ApiResponse, 
  PaginatedResponse, 
  SearchParams 
} from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const QR_SERVICE_URL = process.env.REACT_APP_QR_SERVICE_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Package API calls
export const getPackages = async (params?: SearchParams): Promise<PaginatedResponse<Package>> => {
  const response = await api.get('/packages', { params });
  return response.data;
};

export const getPackage = async (id: string): Promise<ApiResponse<Package>> => {
  const response = await api.get(`/packages/${id}`);
  return response.data;
};

export const createPackage = async (packageData: Partial<Package>): Promise<ApiResponse<Package>> => {
  const response = await api.post('/packages', packageData);
  return response.data;
};

export const updatePackage = async (id: string, packageData: Partial<Package>): Promise<ApiResponse<Package>> => {
  const response = await api.patch(`/packages/${id}`, packageData);
  return response.data;
};

export const deletePackage = async (id: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/packages/${id}`);
  return response.data;
};

export const searchPackages = async (params: SearchParams): Promise<PaginatedResponse<Package>> => {
  const response = await api.get('/packages/search', { params });
  return response.data;
};

// Category API calls
export const getCategories = async (): Promise<ApiResponse<Category[]>> => {
  const response = await api.get('/categories');
  return response.data;
};

export const createCategory = async (categoryData: Partial<Category>): Promise<ApiResponse<Category>> => {
  const response = await api.post('/categories', categoryData);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
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