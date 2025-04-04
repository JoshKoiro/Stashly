import React from 'react';
import { Item } from '../../backend/db/schema';

interface ItemFormData {
  name: string;
  quantity: number | undefined; // Allow undefined during input
  description?: string;
  category?: string;
  purchase_price?: number | undefined; // Allow undefined during input
  purchase_date?: string;
}

interface ItemFormProps {
  initialData: Partial<ItemFormData> | Partial<Item>; // Adjusted type
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  onDataChange: (field: keyof ItemFormData, value: string | number | undefined) => void; // Allow undefined
  isEditing: boolean;
}

const ItemForm: React.FC<ItemFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onDataChange,
  isEditing
}) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    // Use a type assertion for the field name
    const field = id.replace(isEditing ? 'edit-' : '', '') as keyof ItemFormData;
    let processedValue: string | number | undefined = value;

    if (type === 'number') {
      processedValue = value === '' ? undefined : parseFloat(value); // Set to undefined if empty
      if (field === 'quantity' && !isNaN(Number(processedValue))) {
          processedValue = Math.max(1, Number(processedValue));
      }
       else if (field === 'purchase_price' && !isNaN(Number(processedValue))) {
          processedValue = Math.max(0, Number(processedValue));
      }
      // Keep undefined if parseFloat results in NaN and field is numeric
      else if (isNaN(Number(processedValue)) && (field === 'quantity' || field === 'purchase_price')) {
          processedValue = undefined;
      }
    }

    onDataChange(field, processedValue);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDataChange('purchase_date', e.target.value);
  };

  const formIdPrefix = isEditing ? 'edit-' : '';

  // Helper to safely access potentially undefined numeric values for the input value prop
  const getNumericValue = (field: 'quantity' | 'purchase_price') => {
      const value = initialData[field];
      return value === undefined || value === null ? '' : String(value);
  };

  return (
    <form onSubmit={onSubmit} className="item-form">
      <div className="form-group">
        <label htmlFor={`${formIdPrefix}name`}>Name</label>
        <input
          type="text"
          id={`${formIdPrefix}name`}
          value={initialData.name || ''}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${formIdPrefix}quantity`}>Quantity</label>
        <input
          type="number"
          id={`${formIdPrefix}quantity`}
          value={getNumericValue('quantity')} // Use helper
          onChange={handleInputChange}
          min="1"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${formIdPrefix}description`}>Description</label>
        <textarea
          id={`${formIdPrefix}description`}
          value={initialData.description || ''}
          onChange={handleInputChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${formIdPrefix}category`}>Category</label>
        <input
          type="text"
          id={`${formIdPrefix}category`}
          value={initialData.category || ''}
          onChange={handleInputChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${formIdPrefix}purchase_price`}>Purchase Price</label>
        <input
          type="number"
          id={`${formIdPrefix}purchase_price`}
          value={getNumericValue('purchase_price')} // Use helper
          onChange={handleInputChange}
          min="0"
          step="0.01"
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${formIdPrefix}purchase_date`}>Purchase Date</label>
        <input
          type="date"
          id={`${formIdPrefix}purchase_date`}
          value={initialData.purchase_date || ''} // Use ISO date string part
          onChange={handleDateChange}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="submit-btn">
          {isEditing ? 'Save Changes' : 'Add Item'}
        </button>
        <button
          type="button"
          className="cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ItemForm; 