import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from '../../backend/db/schema';

export default function QRCodePrinting() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

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
    if (selectedPackages.size === 0) {
      alert('Please select at least one package');
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
          packageIds: Array.from(selectedPackages),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate QR codes');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open the PDF in a new tab instead of forcing download
      window.open(url, '_blank');

      // Optional: Revoke the object URL after a delay or when the window closes
      // Revoking immediately might prevent the PDF from loading in the new tab.
      // For simplicity, we might omit immediate revocation here.
      // window.URL.revokeObjectURL(url); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print QR codes');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return <div className="loading">Loading packages...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="qr-printing">
      <div className="section-header">
        <h2>Print QR Codes</h2>
        <div className="header-actions">
          <button
            className="print-btn"
            onClick={handlePrint}
            disabled={selectedPackages.size === 0 || printing}
          >
            {printing ? 'Generating PDF...' : 'Print QR Codes'}
          </button>
          <Link to="/" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Back to Packages
          </Link>
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