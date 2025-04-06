import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from '../../backend/db/schema';

export default function QRCodePrinting() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numCopies, setNumCopies] = useState(1);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/packages?limit=1000');
        if (!response.ok) throw new Error('Failed to fetch packages');
        const data = await response.json();

        if (data && typeof data === 'object' && Array.isArray(data.packages)) {
          setPackages(data.packages);
        } else {
          console.error('API response for /api/packages did not have the expected structure:', data);
          setError('Received invalid data format for packages.');
          setPackages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(packageId)) {
        newSet.delete(packageId);
      } else {
        newSet.add(packageId);
      }
      return newSet;
    });
  };

  const handleDownloadPdf = () => {
    const packageIdsToPrint = selectedPackages.size > 0
      ? Array.from(selectedPackages)
      : packages.map(pkg => pkg.id);

    if (packageIdsToPrint.length === 0) {
      alert(packages.length > 0 ? 'Select packages or ensure packages exist to generate PDF.' : 'No packages found to generate PDF.');
      return;
    }

    const params = new URLSearchParams({
      packageIds: packageIdsToPrint.join(','),
      copies: numCopies.toString(),
      offset: offset.toString(),
    });

    window.location.href = `/api/generate-qr-labels-pdf?${params.toString()}`;
  };

  if (loading) return <div className="loading">Loading packages...</div>;
  if (error) return <div className="error">{error}</div>;

  const previewButtonLabel = selectedPackages.size > 0
    ? 'Generate PDF with Selected Packages'
    : 'Generate PDF with All Packages';

  return (
    <div className="qr-printing">
      <div className="page-header-controls">
         <Link to="/" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Back to Packages
         </Link>
      </div>

      <div className="section-header">
        <div className="header-content">
           <h2>Print QR Codes</h2>
        </div>
        <div className="header-actions">
          <div className="offset-selector">
             <label className="offset-label" htmlFor="offset">Offset:</label>
             <input
                type="number"
                className="offset-input"
                id="offset"
                name="offset"
                min="0"
                value={offset}
                onChange={(e) => setOffset(Math.max(0, parseInt(e.target.value, 10) || 0))}
                style={{ width: '60px', marginLeft: '5px', marginRight: '10px', padding: '5px' }}
             />
          </div>
          <div className="copies-selector">
            <label className="copies-label" htmlFor="numCopies">Copies:</label>
            <input
              type="number"
              className="copy-input"
              id="numCopies"
              name="numCopies"
              min="1"
              value={numCopies}
              onChange={(e) => setNumCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ width: '60px', marginLeft: '5px', marginRight: '10px', padding: '5px' }}
            />
          </div>
          <button
            className="print-btn"
            onClick={handleDownloadPdf}
          >
             <i className="fas fa-file-pdf"></i>
            {previewButtonLabel}
          </button>
        </div>
      </div>

      <div className="package-grid">
        {packages.map(package_ => (
          <div
            key={package_.id}
            className={`package-card ${selectedPackages.has(package_.id) ? 'selected' : ''}`}
            onClick={() => handlePackageSelect(package_.id)}
          >
            <div className="package-header">
              <h3>{package_.display_id}</h3>
              <div className="location-badge">
                <i className="fas fa-map-marker-alt"></i>
                {package_.location}
              </div>
            </div>
            <div className="package-meta">
              <span>Created: {new Date(package_.created).toLocaleDateString()}</span>
            </div>
            <div className="selection-indicator">
              <i className={`fas fa-${selectedPackages.has(package_.id) ? 'check-circle' : 'circle'}`}></i>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 