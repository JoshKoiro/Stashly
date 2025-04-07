import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Package, Item, Image } from '../../backend/db/schema';
import Modal from './Modal';
import ItemForm from './ItemForm';
import './QRCodeLabelPreview.css'; // <-- Import the label CSS
import './PackageDetail.css'; // <-- Import the new CSS file
import QRCodeStyling from 'qr-code-styling'; // <-- Import qr-code-styling
import { baseQrCodeOptions } from '../../shared/qrCodeOptions'; // <-- Import shared options

// Interface for the data structure used within the form
interface ItemFormData {
  id?: string; // Add optional id for editing
  name: string;
  quantity: number | undefined;
  description?: string;
  category?: string;
  purchase_price?: number | undefined;
  purchase_date?: string;
}

export default function PackageDetail() {
  const { id: packageId } = useParams<{ id: string }>(); // Rename id to avoid conflict
  const [package_, setPackage] = useState<Package | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditPackageForm, setShowEditPackageForm] = useState(false);

  // --- Item Modal State ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  // State to hold the data for the item form (can be partial during input)
  const [currentItemData, setCurrentItemData] = useState<Partial<ItemFormData>>({});

  // Initial state for a new item form
  const initialNewItemState: ItemFormData = {
    name: '',
    quantity: 1,
    description: '',
    category: '',
    purchase_price: undefined,
    purchase_date: new Date().toISOString().split('T')[0]
  };
  // --- End Item Modal State ---

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null); // <-- Add state for QR data URL

  useEffect(() => {
    const fetchPackageData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/packages/${packageId}`);
        if (!response.ok) throw new Error('Failed to fetch package');
        const data = await response.json();
        setPackage(data);

        // Fetch items
        const itemsResponse = await fetch(`/api/packages/${packageId}/items`);
        if (!itemsResponse.ok) throw new Error('Failed to fetch items');
        const itemsData = await itemsResponse.json();
        setItems(itemsData);

        // Fetch images
        const imagesResponse = await fetch(`/api/packages/${packageId}/images`);
        if (!imagesResponse.ok) throw new Error('Failed to fetch images');
        const imagesData = await imagesResponse.json();
        setImages(imagesData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch package data');
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
        fetchPackageData();
    }

  }, [packageId]);

  // --- Updated useEffect for Client-Side QR Code Generation (Data URL Method) ---
  useEffect(() => {
    let isMounted = true; // Flag to prevent state update on unmounted component

    const generateQrCodeDataUrl = async () => {
      if (!package_) return;

      const url = `${window.location.origin}/packages/${package_.id}`;

      // Create QR code instance using shared options, overriding size for preview
      const qrCodeInstance = new QRCodeStyling({
          ...baseQrCodeOptions, // Spread the base options
          width: 120, // Override width for preview
          height: 120, // Override height for preview
          data: url, // Set the specific data URL
          // No need to repeat other options like type, dotsOptions, etc.
      });

      try {
        // Get SVG data as Blob
        const blob = await qrCodeInstance.getRawData('svg');
        if (!blob) throw new Error('Failed to get QR code raw data.');

        // Ensure we have a Blob before proceeding with FileReader
        if (blob instanceof Blob) {
            // Convert Blob to Data URL
            const reader = new FileReader();
            reader.onloadend = () => {
              if (isMounted) { // Check if component is still mounted
                  setPreviewQrDataUrl(reader.result as string);
              }
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                 if (isMounted) {
                    setPreviewQrDataUrl(null); // Clear on error
                }
            };
            reader.readAsDataURL(blob); // Now we know blob is a Blob
        } else {
            // This case is unlikely in the browser with 'svg' but good to handle
            throw new Error('QR code raw data was not in the expected Blob format.');
        }

      } catch (error) {
        console.error('Error generating QR code data URL:', error);
         if (isMounted) {
             setPreviewQrDataUrl(null); // Clear on error
         }
      }
    };

    generateQrCodeDataUrl();

    // Cleanup function
    return () => {
      isMounted = false; // Set flag on unmount
      setPreviewQrDataUrl(null); // Clear QR code on cleanup
    };
  }, [package_]); // Re-run when package data changes

  // --- Modal Control Functions ---
  const openAddItemModal = () => {
    setCurrentItemData(initialNewItemState); // Use the fully defined initial state
    setIsEditingItem(false);
    setError(null); // Clear errors when opening modal
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: Item) => {
    // Convert the Item to ItemFormData format
    const formData: ItemFormData = {
      ...item,
      quantity: item.quantity ?? undefined,
      purchase_price: item.purchase_price === null ? undefined : item.purchase_price, // Handle null from DB
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : ''
    };
    setCurrentItemData(formData);
    setIsEditingItem(true);
    setError(null); // Clear errors when opening modal
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setCurrentItemData({}); // Clear data on close
    setError(null); // Also clear any errors specific to the modal
  };
  // --- End Modal Control Functions ---

  // --- Form Data Handler (Matches ItemForm's onDataChange) ---
  const handleItemFormChange = (field: keyof ItemFormData, value: string | number | undefined) => {
      setCurrentItemData(prev => ({ ...prev, [field]: value }));
  };
  // --- End Form Data Handler ---


  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!package_) return;
    setError(null);

    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: package_.location
        })
      });
      if (!response.ok) throw new Error('Failed to update package');
      const updatedPackage = await response.json();
      setPackage(updatedPackage);
      setShowEditPackageForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package');
    }
  };

  // Add Item Handler
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation (ensure quantity is a number >= 1)
    const quantity = currentItemData.quantity;
    if (!currentItemData.name || quantity === undefined || quantity < 1) {
        setError("Item name and a valid quantity (at least 1) are required.");
        return;
    }
    setError(null);

    // Prepare data for API (convert undefined price to null)
    const dataToSend = {
        ...currentItemData,
        quantity: quantity, // Already validated as number >= 1
        purchase_price: currentItemData.purchase_price === undefined ? null : currentItemData.purchase_price
    };
    // Remove id if present (it shouldn't be for new items, but belt-and-suspenders)
    delete dataToSend.id;

    try {
      const response = await fetch(`/api/packages/${packageId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to add item (${response.status})`);
      }
      const newItemData = await response.json();
      setItems([...items, newItemData]);
      closeItemModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      // Keep modal open on error
    }
  };

  // Update Item Handler
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation (ensure id exists and quantity is valid)
    const itemId = currentItemData.id;
    const quantity = currentItemData.quantity;
    if (!itemId || !currentItemData.name || quantity === undefined || quantity < 1) {
        setError("Item ID, name, and a valid quantity (at least 1) are required for update.");
        return;
    }
    setError(null);

    // Prepare data for API (convert undefined price to null)
    const dataToSend = {
        ...currentItemData,
        quantity: quantity, // Already validated as number >= 1
        purchase_price: currentItemData.purchase_price === undefined ? null : currentItemData.purchase_price
    };

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
       if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update item (${response.status})`);
      }
      const updatedItem = await response.json();
      setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
      closeItemModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
       // Keep modal open on error
    }
  };

  const handleDeleteItem = async (itemId: string) => {
     if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete item');
      }
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (err) {
      // Display error outside the modal if it's closed
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !packageId) return;
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('package_id', packageId);

    setUploading(true);
    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      setImages(prev => [...prev, data]);
      setSelectedImage(null); // Clear file input
      // Clear any potential error message related to file input
      const fileInput = document.getElementById('image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!package_) return;
    setError(null);

    const currentImage = images.find(img => img.id === imageId);
    const isCurrentlyPrimary = currentImage?.is_primary;

    try {
      let response;
      if (isCurrentlyPrimary) {
        response = await fetch(`/api/packages/${package_.id}/primary-image`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to unset primary image');
        }
        setImages(prevImages =>
          prevImages.map(img => ({ ...img, is_primary: false }))
        );
      } else {
        response = await fetch(`/api/packages/${package_.id}/images/${imageId}/primary`, {
          method: 'PUT',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to set primary image');
        }
        setImages(prevImages =>
          prevImages.map(img => ({ ...img, is_primary: img.id === imageId }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update primary image status');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete image');
      }
      setImages(prevImages => prevImages.filter(image => image.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const openLightbox = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImage(null);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error && !package_ && !isItemModalOpen) return <div className="error package-detail-error"><strong>Error:</strong> {error}</div>;
  if (!package_) return <div className="error">Package not found (ID: {packageId})</div>;

  return (
    <div className="package-detail">
      {error && !isItemModalOpen && (
        <div className="error package-detail-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="package-header">
         <Link to="/" className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Packages
        </Link>
        <div className="header-content package-header-content">
          <h1>{package_.display_id}</h1>
           <span className="location-badge location-badge-detail">
            <i className="fas fa-map-marker-alt"></i>
            {package_.location}
          </span>
          <button
            className="edit-btn edit-package-button"
            onClick={() => setShowEditPackageForm(!showEditPackageForm)}
          >
             <i className={`fas ${showEditPackageForm ? 'fa-times' : 'fa-pencil-alt'}`}></i>
          </button>
        </div>
      </div>

      {showEditPackageForm && (
        <form onSubmit={handleUpdatePackage} className="edit-package-form edit-package-form-container">
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              value={package_.location}
              onChange={e => setPackage(prev => prev ? { ...prev, location: e.target.value } : null)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">Save Changes</button>
            <button
              type="button"
              className="cancel-btn"
              onClick={() => setShowEditPackageForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="package-info package-info-container">

        {/* --- Images Section --- */}
        <div className="package-images">
          <h2>Images</h2>
          <div className="image-grid">
            {images.map(image => (
              <div key={image.id} className="image-card">
                <img
                  src={`/${image.file_path}`}
                  alt={image.caption || `Package ${package_?.display_id || 'image'}`}
                  onClick={() => openLightbox(`/${image.file_path}`)}
                />
                <div className="image-controls">
                  <label title="Set as primary" className="primary-image-toggle">
                    <input
                      type="checkbox"
                      checked={!!image.is_primary}
                      onChange={() => handleSetPrimaryImage(image.id)}
                    />
                    <i className="fas fa-star"></i>
                  </label>
                  <button
                    className="delete-image-btn"
                    onClick={() => handleDeleteImage(image.id)}
                    title="Delete Image"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            ))}
             {images.length === 0 && (
                <div className="no-images-placeholder">
                    <i className="fas fa-camera"></i>
                    <p>No images added yet.</p>
                </div>
            )}
          </div>

          <div className="image-actions-container">
              <form onSubmit={handleImageUpload} className="upload-form upload-image-form">
                  <div className="form-group">
                    <label htmlFor="image">Add New Image</label>
                    <input
                      type="file"
                      id="image"
                      className="file-btn"
                      accept="image/*"
                      onChange={e => setSelectedImage(e.target.files?.[0] || null)}
                    />
                  </div>
                  <button type="submit" disabled={!selectedImage || uploading} className="submit-btn">
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
              </form>

              {package_ && (
                <div className="qr-code-preview-container">
                  <div className="label-cell qr-code-preview-label-cell">
                    <div className="label-content qr-code-preview-label-content">
                      <div className="qr-code-container">
                        {previewQrDataUrl ? (
                          <img
                            src={previewQrDataUrl}
                            alt={`QR Code for Package ${package_.display_id}`}
                            className="qr-code-preview-image"
                          />
                        ) : (
                          <div className="qr-code-loading-placeholder">Loading...</div>
                        )}
                      </div>
                      <div className="label-text">
                        <div className="label-id">{package_.display_id}</div>
                        <div className="label-location">{package_.location || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

        </div>
        {/* --- End Images Section --- */}


        {/* --- Items Section --- */}
        <div className="items-section">
          <div className="section-header">
            <h2>Items ({items.length})</h2>
            <button
              className="add-item-btn"
              onClick={openAddItemModal}
            >
              <i className="fas fa-plus"></i> Add Item
            </button>
          </div>

          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} onClick={() => openEditItemModal(item)} className="item-row">
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.category || '-'}</td>
                    <td>{item.purchase_price != null ? `$${Number(item.purchase_price).toFixed(2)}` : '-'}</td>
                    <td>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}</td>
                    <td className="item-description-cell">{item.description || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()} className="item-delete-cell">
                      <button
                        className="delete-item-btn"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Delete Item"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                    <tr>
                        <td colSpan={7} className="no-items-row">
                            No items added to this package yet.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
         {/* --- End Items Section --- */}
      </div>


      {/* --- Item Add/Edit Modal --- */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={closeItemModal}
        title={isEditingItem ? 'Edit Item' : 'Add New Item'}
      >
          {error && isItemModalOpen && (
              <div className="error item-modal-error">
                 <strong>Error:</strong> {error}
             </div>
         )}
        <ItemForm
          initialData={currentItemData as Partial<ItemFormData>}
          onSubmit={isEditingItem ? handleUpdateItem : handleAddItem}
          onCancel={closeItemModal}
          onDataChange={handleItemFormChange}
          isEditing={isEditingItem}
        />
      </Modal>
      {/* --- End Item Add/Edit Modal --- */}

      {/* --- Lightbox --- */}
      {lightboxOpen && lightboxImage && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <img
            src={lightboxImage}
            alt="Enlarged view"
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* --- End Lightbox --- */}
    </div>
  );
} 