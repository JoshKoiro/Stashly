import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Package } from '../../backend/db/schema';
import Modal from './Modal';
import './PackageList.css';

// Define the extended package type including the optional image path
interface PackageWithImage extends Package {
  primary_image_path?: string;
}

const ITEMS_PER_PAGE = 10;

const PackageList: React.FC = () => {
  const [packages, setPackages] = useState<PackageWithImage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Modal State ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPackageLocation, setNewPackageLocation] = useState('');
  const [newPackageImages, setNewPackageImages] = useState<FileList | null>(null);
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // --- End Modal State ---

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Memoize current parameters from URL to avoid unnecessary re-renders/fetches
  const currentParams = useMemo(() => ({
    search: searchParams.get('search') || '',
    location: searchParams.get('location') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Refactored fetch logic into a useCallback
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentParams.search) params.set('search', currentParams.search);
      if (currentParams.location) params.set('location', currentParams.location);
      params.set('page', currentParams.page.toString());
      params.set('limit', ITEMS_PER_PAGE.toString());

      const response = await fetch(`/api/packages?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch packages');
      }
      const data = await response.json();
      setPackages(data.packages || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching packages');
      setPackages([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentParams]);

  // Fetch packages on initial load and when params change
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // --- Modal Open/Close Handlers ---
  const openCreateModal = () => {
    setNewPackageLocation('');
    setNewPackageImages(null);
    setCreateError(null);
    setIsCreatingPackage(false);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };
  // --- End Modal Open/Close Handlers ---

  // --- New Submit Handler for Modal ---
  const handleCreatePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPackage(true);
    setCreateError(null);

    let createdPackage: Package | null = null;

    try {
      // Step 1: Create the package
      const packageResponse = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newPackageLocation }),
      });

      if (!packageResponse.ok) {
         const errorData = await packageResponse.json().catch(() => ({}));
         throw new Error(errorData.error || 'Failed to create package metadata');
      }
      createdPackage = await packageResponse.json();

      // Step 2: Upload images if any were selected AND package creation succeeded
      if (newPackageImages && newPackageImages.length > 0 && createdPackage) {
        const formData = new FormData();
        formData.append('package_id', createdPackage.id);
        for (let i = 0; i < newPackageImages.length; i++) {
          formData.append('images', newPackageImages[i]);
        }

        const imageResponse = await fetch('/api/images', {
            method: 'POST',
            body: formData
        });

        if (!imageResponse.ok) {
            // Log image upload error but don't block closing modal
            const imgErrorData = await imageResponse.json().catch(() => ({}));
            console.error("Failed to upload images:", imgErrorData.error || 'Unknown image upload error');
        }
      }

      // Step 3: Close modal and refetch list
      closeCreateModal();
      await fetchPackages();

    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create package');
    } finally {
      setIsCreatingPackage(false);
    }
  };
  // --- End New Submit Handler ---

  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    navigate(`/?${params.toString()}`);
  }, [navigate, searchParams]);

  if (loading) return <div className="loading">Loading packages...</div>;
  if (error && !loading && packages.length === 0) return <div className="error list-error">Error: {error}</div>;

  return (
    <div className="package-list">
      <div className="package-list-header">
        <div className="header-content">
          <h2>{currentParams.search ? `Search results for "${currentParams.search}"` : 'Your Packages'}</h2>
          {currentParams.location && (
            <div className="location-filter">
              <span className="filter-label">Location:</span>
              <span className="filter-value">{currentParams.location}</span>
            </div>
          )}
        </div>
        <button
          className="create-package-btn"
          onClick={openCreateModal}
        >
          Create New Package
        </button>
      </div>

      {error && !loading && packages.length > 0 && (
         <div className="error list-error">Error: {error}</div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create New Package"
      >
        <form onSubmit={handleCreatePackageSubmit} className="create-package-modal-form">
          {createError && (
            <div className="error modal-error">Error: {createError}</div>
          )}

          <div className="form-group">
            <label htmlFor="new-location">Location:</label>
            <input
              type="text"
              id="new-location"
              value={newPackageLocation}
              onChange={e => setNewPackageLocation(e.target.value)}
              required
              placeholder="Enter package location"
              disabled={isCreatingPackage}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-images">Add Images (Optional):</label>
            <input
              type="file"
              id="new-images"
              multiple
              accept="image/*"
              onChange={e => setNewPackageImages(e.target.files || null)}
              disabled={isCreatingPackage}
              className="file-btn"
            />
          </div>

          {newPackageImages && newPackageImages.length > 0 && (
            <div className="image-preview-grid">
              <p>{newPackageImages.length} image(s) selected:</p>
              {Array.from(newPackageImages).map((file, index) => (
                <img
                  key={index}
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="create-package-preview-item"
                />
              ))}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={isCreatingPackage || !newPackageLocation.trim()}
            >
              {isCreatingPackage ? 'Creating...' : 'Create Package'}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={closeCreateModal}
              disabled={isCreatingPackage}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {packages.length === 0 && !loading && (
         <div className="no-results">No packages found matching your criteria.</div>
      )}

      <div className="package-grid">
        {packages.map(pkg => (
          <div key={pkg.id} className="package-card">
            <Link to={`/packages/${pkg.id}`} className="package-image-link">
              <div className="package-card-image-container">
                {pkg.primary_image_path ? (
                  <img
                    src={`/${pkg.primary_image_path}`}
                    alt={`Primary image for ${pkg.display_id}`}
                    className="package-card-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="package-card-image-placeholder">
                    <i className="fas fa-box-open"></i>
                  </div>
                )}
              </div>
            </Link>
            <Link to={`/packages/${pkg.id}`} className="package-link">
              <div className="package-header">
                <h3>{pkg.display_id}</h3>
                <span className="package-location">{pkg.location}</span>
              </div>
              <div className="package-meta">
                <span className="created-date">
                  Created: {new Date(pkg.created).toLocaleDateString()}
                </span>
              </div>
            </Link>
            <div className="package-actions">
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentParams.page - 1)}
            disabled={currentParams.page <= 1 || loading}
          >
            Previous
          </button>
          <span>Page {currentParams.page} of {totalPages}</span>
          <button
            onClick={() => handlePageChange(currentParams.page + 1)}
            disabled={currentParams.page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PackageList; 