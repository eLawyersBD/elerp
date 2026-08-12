import { useState } from 'react';

function TransactionHistory({ transactions }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Format Date
  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = typeFilter === '' || tx.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getTxTypeBadge = (type) => {
    switch (type) {
      case 'in':
        return { label: 'Stock In', class: 'instock' };
      case 'out':
        return { label: 'Stock Out', class: 'outstock' };
      default:
        return { label: 'Adjustment', class: 'lowstock' };
    }
  };

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
              placeholder="Search by product name, SKU, or transaction details..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Type Filter */}
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select-filter"
          >
            <option value="">All Transactions</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="adjust">Stock Adjustments</option>
          </select>
        </div>
        
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
          Showing {filteredTransactions.length} transaction entries
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Action Type</th>
              <th style={{ textAlign: 'right' }}>Qty Shift</th>
              <th>Reference Reason / Notes</th>
            </tr>
          </thead>
          <tbody>
            {[...filteredTransactions]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(tx => {
                const badge = getTxTypeBadge(tx.type);
                const isPositive = tx.qty > 0;
                
                return (
                  <tr key={tx.id}>
                    <td>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        🕒 {formatDate(tx.date)}
                      </span>
                    </td>
                    <td>
                      <span className="sku-badge">{tx.sku}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.itemName}</td>
                    <td>
                      <span className={`status-pill ${badge.class}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: 700, 
                      color: tx.type === 'in' ? 'var(--success)' : tx.type === 'out' ? 'var(--danger)' : 'var(--accent-color)'
                    }}>
                      {isPositive ? `+${tx.qty}` : tx.qty}
                    </td>
                    <td style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      {tx.description}
                    </td>
                  </tr>
                );
              })}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  🕒 No transaction records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionHistory;
