import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from '../../backend/db/schema';

export default function QRCodePrinting() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [numCopies, setNumCopies] = useState(1);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/packages');
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

  const handlePrint = async () => {
    // Determine which packages to print
    const packageIdsToPrint = selectedPackages.size > 0
      ? Array.from(selectedPackages)
      : packages.map(pkg => pkg.id); // Print all if none selected

    if (packageIdsToPrint.length === 0 && packages.length > 0) {
       // This case should ideally not be hit if packages exist,
       // but adding a safeguard.
       alert('No packages available to print.');
       return;
    } else if (packageIdsToPrint.length === 0) {
       // Handles the case where fetch returned 0 packages initially.
       alert('No packages found.');
       return;
    }

    setPrinting(true);
    try {
      const response = await fetch('/api/qr-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use the determined list of package IDs
          packageIds: packageIdsToPrint,
          // Pass the number of copies
          copies: numCopies,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate QR codes');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      window.open(url, '_blank');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print QR codes');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return <div className="loading">Loading packages...</div>;
  if (error) return <div className="error">{error}</div>;

  // Determine button label based on selection
  const printButtonLabel = selectedPackages.size > 0
    ? 'Print Selected QR Codes'
    : 'Print All QR Codes';

  return (
    <div className="qr-printing">
      {/* Move Back link to the left */}
      <div className="page-header-controls">
         <Link to="/" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Back to Packages
         </Link>
      </div>

      {/* Restructured header */}
      <div className="section-header">
        <div className="header-content">
           {/* Heading moved next to the button */}
           <h2>Print QR Codes</h2>
        </div>
        <div className="header-actions">
          {/* Add number input for copies */}
          <div className="copies-selector">
            <label htmlFor="numCopies">Copies:</label>
            <input
              type="number"
              id="numCopies"
              name="numCopies"
              min="1"
              value={numCopies}
              onChange={(e) => setNumCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={printing}
              style={{ width: '60px', marginLeft: '5px', marginRight: '10px', padding: '5px' }}
            />
          </div>
          <button
            className="print-btn"
            onClick={handlePrint}
            // Button is disabled only when printing is in progress
            disabled={printing}
          >
            {printing ? 'Generating PDF...' : printButtonLabel}
          </button>
          {/* Back link removed from here */}
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