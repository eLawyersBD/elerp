import { useState } from 'react';

function SuppliersList({ suppliers, onAddSupplier, onEditSupplier, onDeleteSupplier }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    customFields: []
  });

  const generateNextSupplierId = () => {
    let maxNum = 1000;
    suppliers.forEach(s => {
      if (s.id) {
        const match = s.id.match(/^sup-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `sup-${maxNum + 1}`;
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      id: generateNextSupplierId(),
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      customFields: []
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      ...sup,
      customFields: sup.customFields || []
    });
    setIsModalOpen(true);
  };

  const handleAddCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', value: '' }]
    }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.customFields || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customFields: updated };
    });
  };

  const handleRemoveCustomField = (index) => {
    setFormData(prev => ({
      ...prev,
      customFields: (prev.customFields || []).filter((_, i) => i !== index)
    }));
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Supplier name is required!');
      return;
    }

    if (editingSupplier) {
      onEditSupplier({
        ...formData
      });
    } else {
      onAddSupplier({
        ...formData
      });
    }

    handleClose();
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(sup => 
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sup.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sup.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Controls Row */}
      <div className="controls-row">
        <div className="search-filter-group">
          {/* Search Box */}
          <div className="search-input-wrapper" style={{ flexGrow: 2 }}>
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by supplier name, contact person, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd}>
          ➕ Add New Supplier
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier ID</th>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Custom Details</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map(sup => (
              <tr key={sup.id}>
                <td style={{ fontWeight: 800 }}><span className="sku-badge">{sup.id}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  🏢 {sup.name}
                </td>
                <td>👤 {sup.contact}</td>
                <td>📞 {sup.phone}</td>
                <td>✉️ <a href={`mailto:${sup.email}`}>{sup.email}</a></td>
                <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  🏠 {sup.address}
                </td>
                <td>
                  {sup.customFields && sup.customFields.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem' }}>
                      {sup.customFields.map((cf, idx) => (
                        <span key={idx} style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          <strong>{cf.label}</strong>: {cf.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontStyle: 'italic' }}>— None —</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons" style={{ justifyContent: 'center' }}>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={() => handleOpenEdit(sup)}
                      title="Edit Supplier"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${sup.name}"? This will not delete products linked to it, but they will show "Unknown Supplier".`)) {
                          onDeleteSupplier(sup.id);
                        }
                      }}
                      title="Delete Supplier"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  🏢 No suppliers found matching your query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier Company'}
              </h3>
              <button className="modal-close" onClick={handleClose}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form-content" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              {/* Supplier ID */}
              <div className="form-group">
                <label className="form-label">Supplier ID</label>
                <input 
                  type="text" 
                  readOnly 
                  value={formData.id} 
                  className="form-control" 
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                />
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="sup-name">Company Name *</label>
                <input 
                  type="text" 
                  id="sup-name"
                  name="name"
                  required
                  placeholder="E.g., ABC Tech Supply Ltd."
                  value={formData.name}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              {/* Contact Person */}
              <div className="form-group">
                <label className="form-label" htmlFor="sup-contact">Contact Person Name</label>
                <input 
                  type="text" 
                  id="sup-contact"
                  name="contact"
                  placeholder="E.g., John Doe"
                  value={formData.contact}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              {/* Phone & Email Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="sup-phone">Phone Number</label>
                  <input 
                    type="text" 
                    id="sup-phone"
                    name="phone"
                    placeholder="E.g., +880 1711..."
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sup-email">Email Address</label>
                  <input 
                    type="email" 
                    id="sup-email"
                    name="email"
                    placeholder="E.g., sales@abctech.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="sup-address">Office Address</label>
                <textarea 
                  id="sup-address"
                  name="address"
                  rows="3"
                  placeholder="E.g., Flat 4B, Tower A, Dhaka, Bangladesh"
                  value={formData.address}
                  onChange={handleChange}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Custom Metadata Fields */}
              <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Additional Metadata Fields</label>
                  <button 
                    type="button" 
                    onClick={handleAddCustomField} 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem' }}
                  >
                    ➕ Add New Field
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {formData.customFields && formData.customFields.map((field, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        required
                        placeholder="Heading (e.g. TIN No)" 
                        value={field.label}
                        onChange={e => handleCustomFieldChange(idx, 'label', e.target.value)}
                        className="form-control"
                        style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                      />
                      <input 
                        type="text" 
                        required
                        placeholder="Value Information" 
                        value={field.value}
                        onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)}
                        className="form-control"
                        style={{ flex: 2, padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCustomField(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.25rem', cursor: 'pointer', padding: '0 4px' }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {(!formData.customFields || formData.customFields.length === 0) && (
                    <div style={{ fontStyle: 'italic', fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                      No custom metadata fields added yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Save Changes' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuppliersList;
