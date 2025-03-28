import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createPackage } from '../services/api.service';
import { Package, Category } from '../types';
import './CreatePackagePage.css';

const CreatePackagePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<Package>>({
    display_id: '',
    location: '',
    status: 'active',
    items: [],
    images: []
  });
  // Additional form state for fields not in Package type
  const [categoryId, setCategoryId] = useState<string>('');
  const [contents, setContents] = useState<string>('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getCategories();
        setCategories(response.data);
      } catch (err) {
        setError('Failed to load categories. Please try again later.');
      }
    };

    loadCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle special fields separately
    if (name === 'category_id') {
      setCategoryId(value);
      return;
    }
    
    if (name === 'contents') {
      setContents(value);
      return;
    }
    
    // Handle remaining fields that are part of Package type
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.display_id || !formData.location) {
        throw new Error('Display ID and Location are required fields');
      }

      // Create a package with the required fields
      const packageToCreate: Partial<Package> = {
        ...formData,
        // Ensure items and images are arrays
        items: formData.items || [],
        images: formData.images || []
      };

      const response = await createPackage(packageToCreate as Package);
      navigate(`/packages/${response.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create package. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-package-page">
      <div className="page-header">
        <h2>Create New Package</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="create-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="display_id">Display ID*</label>
          <input
            type="text"
            id="display_id"
            name="display_id"
            value={formData.display_id}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location*</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category_id">Category</label>
          <select
            id="category_id"
            name="category_id"
            value={categoryId}
            onChange={handleInputChange}
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="contents">Contents</label>
          <textarea
            id="contents"
            name="contents"
            value={contents}
            onChange={handleInputChange}
            rows={5}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status || 'active'}
            onChange={handleInputChange}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/packages')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Package'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePackagePage; 