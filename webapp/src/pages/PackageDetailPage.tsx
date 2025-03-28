import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPackage, updatePackage, deletePackage, getSingleQR } from '../services/api.service';
import { Package, PackageItem, PackageImage } from '../types';
import './PackageDetailPage.css';

const PackageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Package>>({});

  // Load package data
  useEffect(() => {
    const loadPackage = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await getPackage(id);
        setPackageData(response.data);
        setFormData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error loading package:', err);
        setError('Failed to load package details. Please try again.');
        setPackageData(null);
      } finally {
        setLoading(false);
      }
    };

    loadPackage();
  }, [id]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await updatePackage(id, formData);
      setPackageData(response.data);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error updating package:', err);
      setError('Failed to update package. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle package deletion
  const handleDelete = async () => {
    if (!id) return;
    
    if (!window.confirm('Are you sure you want to delete this package?')) {
      return;
    }
    
    try {
      setLoading(true);
      await deletePackage(id);
      navigate('/packages');
    } catch (err) {
      console.error('Error deleting package:', err);
      setError('Failed to delete package. Please try again.');
      setLoading(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    setFormData(packageData || {});
  };

  // Render loading state
  if (loading && !packageData) {
    return (
      <div className="package-detail-page">
        <div className="container">
          <div className="loading">Loading package details...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !packageData) {
    return (
      <div className="package-detail-page">
        <div className="container">
          <div className="error">{error}</div>
          <Link to="/packages" className="btn btn-primary">Back to List</Link>
        </div>
      </div>
    );
  }

  // Render not found state
  if (!packageData && !loading) {
    return (
      <div className="package-detail-page">
        <div className="container">
          <div className="not-found">Package not found</div>
          <Link to="/packages" className="btn btn-primary">Back to List</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="package-detail-page">
      <div className="page-header">
        <h2>{isEditing ? 'Edit Package' : `Package: ${packageData?.display_id}`}</h2>
        <div className="actions">
          {isEditing ? (
            <button className="btn btn-outlined" onClick={toggleEditMode}>Cancel</button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={toggleEditMode}>Edit</button>
              <button className="btn btn-secondary" onClick={handleDelete}>Delete</button>
              <a 
                href={id ? getSingleQR(id) : '#'} 
                className="btn btn-outlined"
                target="_blank"
                rel="noopener noreferrer"
                download={`qr-${packageData?.display_id}.png`}
              >
                Download QR
              </a>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="container">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-group">
              <label htmlFor="display_id" className="form-label">Display ID</label>
              <input
                type="text"
                id="display_id"
                name="display_id"
                className="form-control"
                value={formData.display_id || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="location" className="form-label">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                className="form-control"
                value={formData.location || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="package-details">
            <div className="grid grid-2">
              <div className="detail-section">
                <h3 className="section-title">Package Information</h3>
                <div className="detail-item">
                  <span className="detail-label">Display ID:</span>
                  <span className="detail-value">{packageData?.display_id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{packageData?.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">
                    {packageData?.created && new Date(packageData.created).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Updated:</span>
                  <span className="detail-value">
                    {packageData?.updated && new Date(packageData.updated).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value status-badge">{packageData?.status}</span>
                </div>
              </div>
              
              <div className="qr-code-section">
                <h3 className="section-title">QR Code</h3>
                {id && (
                  <div className="qr-code">
                    <img src={getSingleQR(id)} alt="QR Code" />
                    <p>Scan to view package details</p>
                  </div>
                )}
              </div>
            </div>

            <div className="items-section">
              <h3 className="section-title">Package Contents</h3>
              {packageData?.items && packageData.items.length > 0 ? (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Quantity</th>
                      <th>Description</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageData.items.map((item: PackageItem, index: number) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.description || '-'}</td>
                        <td>{item.category || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-message">No items added to this package.</p>
              )}
            </div>

            {packageData?.images && packageData.images.length > 0 && (
              <div className="images-section">
                <h3 className="section-title">Images</h3>
                <div className="image-gallery">
                  {packageData.images.map((image: PackageImage, index: number) => (
                    <div key={index} className="image-item">
                      <img src={image.file} alt={image.caption || `Package image ${index + 1}`} />
                      {image.caption && <p className="image-caption">{image.caption}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageDetailPage; 