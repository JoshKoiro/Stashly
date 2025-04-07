import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Package } from '../../backend/db/schema';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPackage, setNewPackage] = useState({ location: '' });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Memoize current parameters from URL to avoid unnecessary re-renders/fetches
  const currentParams = useMemo(() => ({
    search: searchParams.get('search') || '',
    location: searchParams.get('location') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch packages whenever searchParams change
  useEffect(() => {
    const fetchPackages = async () => {
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
        setError(err instanceof Error ? err.message : 'An error occurred');
        setPackages([]); // Clear packages on error
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [currentParams]); // Depend on memoized params

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    // Keep existing error handling, but refetch might be needed
    // if the new package should appear in the current view/page
    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackage),
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || 'Failed to create package');
      }
      const createdPackage = await response.json();
      // Instead of just adding, navigate to the new package or refetch page 1?
      // For simplicity, just clear form and maybe show a success message
      // To see the new package, the user might need to navigate/refresh
      // Or, more complex: refetch the current page if it matches filters
      setShowCreateForm(false);
      setNewPackage({ location: '' });
      // Optional: force refetch by changing searchParams slightly or using a state trigger
      // navigate(location.pathname + location.search + '&refetch=' + Date.now()); // Example hacky refetch

      // Let's simply add to the list if on page 1 and no filters are active
      if (currentParams.page === 1 && !currentParams.search && !currentParams.location) {
         setPackages(prev => [createdPackage, ...prev].slice(0, ITEMS_PER_PAGE));
         setTotalCount(prev => prev + 1);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package');
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    navigate(`/?${params.toString()}`);
  }, [navigate, searchParams]);

  // Client-side filtering is no longer needed as it's handled by the backend
  // const filteredPackages = ...

  if (loading) return <div className="loading">Loading packages...</div>;
  // Keep the main error display, maybe make it more prominent
  if (error && !loading) return <div className="error">Error: {error}</div>;

  return (
    <div className="package-list">
      <div className="package-list-header">
        <div className="header-content">
          {/* Show search term if present */}
          <h2>{currentParams.search ? `Search results for "${currentParams.search}"` : 'Your Packages'}</h2>
          {/* Show location filter if present */}
          {currentParams.location && (
            <div className="location-filter">
              <span className="filter-label">Location:</span>
              <span className="filter-value">{currentParams.location}</span>
            </div>
          )}
        </div>
        <button
          className="create-package-btn"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Package
        </button>
      </div>

      {/* Create form remains the same */}
      {showCreateForm && (
         <form onSubmit={handleCreatePackage} className="create-package-form"> 
          {/* ... form inputs ... */}
            <div className="form-group">
              <label htmlFor="location">Location:</label>
              <input
                type="text"
                id="location"
                value={newPackage.location}
                onChange={e => setNewPackage(prev => ({ ...prev, location: e.target.value }))}
                required
                placeholder="Enter package location"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn">Create Package</button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPackage({ location: '' });
                }}
              >
                Cancel
              </button>
            </div>
         </form>
      )}
      
      {/* Display error related to package creation specifically? */}
      {/* Or rely on the main error display */} 

      {packages.length === 0 && !loading && (
         <div className="no-results">No packages found.</div>
      )}

      <div className="package-grid">
        {/* Render packages fetched for the current page */}
        {packages.map(pkg => (
          <div key={pkg.id} className="package-card">

            {/* Link 1: Wraps the image */}
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
                  // Placeholder element when no image exists
                  <div className="package-card-image-placeholder">
                    <i className="fas fa-box-open"></i>
                  </div>
                )}
              </div>
            </Link>

            {/* Link 2: Wraps the text details */}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(currentParams.page - 1)}
            disabled={currentParams.page <= 1}
          >
            Previous
          </button>
          <span>Page {currentParams.page} of {totalPages}</span>
          <button
            onClick={() => handlePageChange(currentParams.page + 1)}
            disabled={currentParams.page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PackageList; 