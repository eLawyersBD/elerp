import { useState } from 'react';

function InventoryList({ 
  products, 
  categories, 
  suppliers, 
  onEditProduct, 
  onDeleteProduct, 
  onAdjustStock,
  onOpenAddModal 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  
  // Quick Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('in'); // 'in' or 'out'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Format Currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.location.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
    
    let matchesStatus = true;
    if (stockStatusFilter === 'out') {
      matchesStatus = product.qty === 0;
    } else if (stockStatusFilter === 'low') {
      matchesStatus = product.qty > 0 && product.qty <= product.minStock;
    } else if (stockStatusFilter === 'normal') {
      matchesStatus = product.qty > product.minStock;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStockStatus = (product) => {
    if (product.qty === 0) return { label: 'Out of Stock', class: 'outstock' };
    if (product.qty <= product.minStock) return { label: 'Low Stock', class: 'lowstock' };
    return { label: 'In Stock', class: 'instock' };
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  // Quick adjust handlers
  const handleOpenAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustType('in');
    setAdjustQty('');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleCloseAdjustModal = () => {
    setIsAdjustModalOpen(false);
    setSelectedProduct(null);
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || isNaN(adjustQty) || Number(adjustQty) <= 0) return;

    const qtyNumber = Number(adjustQty);
    const finalQty = adjustType === 'in' ? qtyNumber : -qtyNumber;

    // Out of stock guard
    if (adjustType === 'out' && selectedProduct.qty < qtyNumber) {
      alert(`Insufficient stock! Current stock: ${selectedProduct.qty} ${selectedProduct.unit}.`);
      return;
    }

    onAdjustStock(selectedProduct.id, finalQty, adjustReason || `${adjustType === 'in' ? 'Restocked' : 'Issued'} quantity adjustment`);
    handleCloseAdjustModal();
  };

  return (
    <div>
      {/* Controls Row */}
      <div className="controls-row">
        <div className="search-filter-group">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by product name, SKU, or shelf location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Category Filter */}
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select-filter"
          >
            <option value="">All Categories</option>
            {categories.map(cat => {
              const catId = typeof cat === 'object' ? cat.id : cat;
              const catName = typeof cat === 'object' ? cat.name : cat;
              return <option key={catId} value={catName}>{catName}</option>;
            })}
          </select>

          {/* Stock Status Filter */}
          <select 
            value={stockStatusFilter} 
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="select-filter"
          >
            <option value="">All Stock Statuses</option>
            <option value="normal">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Add Product Trigger */}
        <button className="btn btn-primary" onClick={onOpenAddModal}>
          ➕ Add New Product
        </button>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Min Stock</th>
              <th>Unit Price</th>
              <th>Location</th>
              <th>Supplier</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const status = getStockStatus(product);
              return (
                <tr key={product.id}>
                  <td>
                    <span className="sku-badge">{product.sku}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {product.name}
                    {product.description && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {product.description}
                      </div>
                    )}
                  </td>
                  <td>{product.category}</td>
                  <td>
                    <span style={{ marginRight: '0.5rem', fontWeight: 700 }}>
                      {product.qty} {product.unit}
                    </span>
                    <span className={`status-pill ${status.class}`}>
                      {status.label}
                    </span>
                  </td>
                  <td>{product.minStock} {product.unit}</td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(product.price)}</td>
                  <td>
                    <span style={{ fontSize: 'var(--font-size-sm)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                      📍 {product.location}
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    {getSupplierName(product.supplierId)}
                  </td>
                  <td>
                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleOpenAdjustModal(product)}
                        title="Adjust Stock Qty"
                      >
                        ⚡ Adjust
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => onEditProduct(product)}
                        title="Edit Details"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
                            onDeleteProduct(product.id);
                          }
                        }}
                        title="Delete Product"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  🔍 No products match your search/filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Adjust Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock Level</h3>
              <button className="modal-close" onClick={handleCloseAdjustModal}>&times;</button>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className="modal-form-content">
              <div className="quick-adjust-info">
                <strong>Product:</strong> {selectedProduct.name} <br />
                <strong>Current Stock:</strong> {selectedProduct.qty} {selectedProduct.unit} <br />
                <strong>SKU:</strong> <span className="sku-badge">{selectedProduct.sku}</span>
              </div>

              {/* Adjust Type Selection */}
              <div>
                <label className="form-label">Adjustment Type</label>
                <div className="tx-type-toggle">
                  <button 
                    type="button" 
                    className={`tx-type-btn ${adjustType === 'in' ? 'active in' : ''}`}
                    onClick={() => setAdjustType('in')}
                  >
                    📈 Stock In (Restock / Add)
                  </button>
                  <button 
                    type="button" 
                    className={`tx-type-btn ${adjustType === 'out' ? 'active out' : ''}`}
                    onClick={() => setAdjustType('out')}
                  >
                    📉 Stock Out (Issue / Consume)
                  </button>
                </div>
              </div>

              {/* Adjust Qty */}
              <div className="form-group">
                <label className="form-label" htmlFor="adjust-qty">
                  Quantity ({selectedProduct.unit})
                </label>
                <input 
                  type="number" 
                  id="adjust-qty"
                  min="1" 
                  required
                  placeholder={`E.g., 5`}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="form-control"
                />
              </div>

              {/* Reason / Reference */}
              <div className="form-group">
                <label className="form-label" htmlFor="adjust-reason">
                  Reason / Reference Note
                </label>
                <input 
                  type="text" 
                  id="adjust-reason"
                  placeholder="E.g., Stock intake PO-102, issued to Maintenance, etc."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseAdjustModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryList;
