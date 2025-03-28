import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPackages, searchPackages, generateBulkQR } from '../services/api.service';
import { Package, SearchParams } from '../types';
import './PackageListPage.css';

const PackageListPage: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    page: 1,
    perPage: 10
  });
  const [totalPages, setTotalPages] = useState<number>(1);

  // Load packages on component mount and when search params change
  useEffect(() => {
    const loadPackages = async () => {
      try {
        setLoading(true);
        
        const response = searchParams.query 
          ? await searchPackages(searchParams)
          : await getPackages(searchParams);
          
        setPackages(response.items);
        setTotalPages(response.totalPages);
        setError(null);
      } catch (err) {
        console.error('Error loading packages:', err);
        setError('Failed to load packages. Please try again.');
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    loadPackages();
  }, [searchParams]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      ...searchParams,
      page: 1 // Reset to first page
    });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({
      ...searchParams,
      query: e.target.value
    });
  };

  // Handle checkbox selection
  const handleCheckboxChange = (id: string) => {
    setSelectedPackages(prev => {
      if (prev.includes(id)) {
        return prev.filter(packageId => packageId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle bulk QR code generation
  const handleGenerateBulkQR = async () => {
    if (selectedPackages.length === 0) {
      alert('Please select at least one package');
      return;
    }

    try {
      const blob = await generateBulkQR(selectedPackages);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'qr-codes.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating QR codes:', err);
      alert('Failed to generate QR codes. Please try again.');
    }
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    setSearchParams({
      ...searchParams,
      page: newPage
    });
  };

  return (
    <div className="package-list-page">
      <div className="page-header">
        <h2>Package List</h2>
        <Link to="/packages/new" className="btn btn-primary">Add New Package</Link>
      </div>

      <div className="container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by item name or location..."
              value={searchParams.query}
              onChange={handleSearchChange}
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {selectedPackages.length > 0 && (
          <div className="bulk-actions">
            <button onClick={handleGenerateBulkQR} className="btn btn-secondary">
              Generate QR Codes ({selectedPackages.length})
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading packages...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <p>No packages found. Create your first package by clicking the "Add New Package" button.</p>
          </div>
        ) : (
          <>
            <table className="package-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}><input type="checkbox" /></th>
                  <th>Display ID</th>
                  <th>Location</th>
                  <th>Created</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pkg.id)}
                        onChange={() => handleCheckboxChange(pkg.id)}
                      />
                    </td>
                    <td>{pkg.display_id}</td>
                    <td>{pkg.location}</td>
                    <td>{new Date(pkg.created).toLocaleDateString()}</td>
                    <td>{new Date(pkg.updated).toLocaleDateString()}</td>
                    <td className="actions">
                      <Link to={`/packages/${pkg.id}`} className="btn btn-outlined">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button
                className="btn"
                onClick={() => handlePageChange(searchParams.page! - 1)}
                disabled={searchParams.page === 1}
              >
                Previous
              </button>
              <span>
                Page {searchParams.page} of {totalPages}
              </span>
              <button
                className="btn"
                onClick={() => handlePageChange(searchParams.page! + 1)}
                disabled={searchParams.page === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PackageListPage; 