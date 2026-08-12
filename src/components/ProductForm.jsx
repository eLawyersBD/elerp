import { useState } from 'react';

function ProductForm({ 
  product, 
  categories, 
  suppliers, 
  onSave, 
  onClose 
}) {
  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        ...product,
        price: product.price.toString(),
        qty: product.qty,
        minStock: product.minStock
      };
    }
    return {
      name: '',
      sku: '',
      category: (typeof categories[0] === 'object' ? categories[0]?.name : categories[0]) || '',
      qty: 0,
      unit: 'pcs',
      price: '',
      minStock: 5,
      location: '',
      supplierId: suppliers[0]?.id || '',
      description: ''
    };
  });

  const isEditing = !!product;


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validations
    if (!formData.name.trim() || !formData.sku.trim()) {
      alert("Name and SKU are required!");
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid price!");
      return;
    }

    const minStockNum = parseInt(formData.minStock);
    if (isNaN(minStockNum) || minStockNum < 0) {
      alert("Minimum stock must be a non-negative number!");
      return;
    }

    const qtyNum = parseInt(formData.qty);
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert("Quantity must be a non-negative number!");
      return;
    }

    onSave({
      ...formData,
      qty: qtyNum,
      price: priceNum,
      minStock: minStockNum
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditing ? `Edit Product: ${product.name}` : 'Add New Inventory Item'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-content">
          {/* Name & SKU Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Product Name *</label>
              <input 
                type="text" 
                id="name"
                name="name"
                required
                placeholder="E.g., HP Display 24f"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sku">SKU Code *</label>
              <input 
                type="text" 
                id="sku"
                name="sku"
                required
                placeholder="E.g., EL-HP-24F"
                disabled={isEditing} // SKU shouldn't be edited once created
                value={formData.sku}
                onChange={handleChange}
                className="form-control"
                style={{ textTransform: 'uppercase' }}
              />
              {isEditing && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>SKU cannot be changed</span>}
            </div>
          </div>

          {/* Category & Supplier Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <select 
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-control"
              >
                {categories.map(cat => {
                  const catId = typeof cat === 'object' ? cat.id : cat;
                  const catName = typeof cat === 'object' ? cat.name : cat;
                  return <option key={catId} value={catName}>{catName}</option>;
                })}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supplierId">Primary Supplier</label>
              <select 
                id="supplierId"
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity, Unit & Min Stock */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="qty">Initial Quantity</label>
              <input 
                type="number" 
                id="qty"
                name="qty"
                min="0"
                required
                disabled={isEditing} // In editing mode, force usage of adjustments
                value={formData.qty}
                onChange={handleChange}
                className="form-control"
              />
              {isEditing && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Use the 'Adjust' button on the table to change stock.
                </span>
              )}
            </div>
            <div className="form-row" style={{ gap: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="unit">Unit</label>
                <input 
                  type="text" 
                  id="unit"
                  name="unit"
                  required
                  placeholder="E.g., pcs, reams, box"
                  value={formData.unit}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="minStock">Min Stock Limit</label>
                <input 
                  type="number" 
                  id="minStock"
                  name="minStock"
                  min="0"
                  required
                  value={formData.minStock}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* Unit Price & Shelf Location */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="price">Unit Price (BDT) *</label>
              <input 
                type="number" 
                id="price"
                name="price"
                min="0"
                step="any"
                required
                placeholder="E.g., 12000"
                value={formData.price}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="location">Shelf / Warehouse Location</label>
              <input 
                type="text" 
                id="location"
                name="location"
                placeholder="E.g., Rack C-4"
                value={formData.location}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Item Description</label>
            <textarea 
              id="description"
              name="description"
              rows="3"
              placeholder="Provide technical specs, sizes, colors, or usage guidelines..."
              value={formData.description}
              onChange={handleChange}
              className="form-control"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Changes' : 'Register Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;
