import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory } from '../services/api.service';
import { Category } from '../types';
import './CategoryPage.css';

const CategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategories();
      setCategories(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined
      });
      setNewCategoryName('');
      setNewCategoryDescription('');
      loadCategories();
    } catch (err) {
      setError('Failed to create category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      loadCategories();
    } catch (err) {
      setError('Failed to delete category. Please try again.');
    }
  };

  return (
    <div className="category-page">
      <div className="page-header">
        <h2>Categories</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="category-container">
        <div className="category-form-container">
          <h3>Create New Category</h3>
          <form className="category-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name*</label>
              <input
                type="text"
                id="name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                rows={3}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting || !newCategoryName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>

        <div className="category-list-container">
          <h3>All Categories</h3>
          
          {loading ? (
            <div className="loading">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="empty-state">No categories found. Create one to get started.</div>
          ) : (
            <div className="category-list">
              {categories.map((category) => (
                <div key={category.id} className="category-item">
                  <div className="category-details">
                    <h4>{category.name}</h4>
                    {category.description && <p>{category.description}</p>}
                    <div className="category-meta">
                      <small>Created: {new Date(category.created).toLocaleDateString()}</small>
                    </div>
                  </div>
                  <div className="category-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPage; 