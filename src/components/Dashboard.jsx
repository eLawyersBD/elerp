
function Dashboard({ products, categories, transactions }) {
  // Calculations
  const totalSKUs = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.qty, 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.qty * p.price), 0);
  
  const lowStockItems = products.filter(p => p.qty > 0 && p.qty <= p.minStock);
  const outOfStockItems = products.filter(p => p.qty === 0);
  
  const lowStockCount = lowStockItems.length;
  const outOfStockCount = outOfStockItems.length;

  // Group by category for visualization
  const categoryStats = categories.map(cat => {
    const catName = typeof cat === 'object' ? cat.name : cat;
    const catProducts = products.filter(p => p.category === catName);
    const count = catProducts.length;
    const value = catProducts.reduce((acc, p) => acc + (p.qty * p.price), 0);
    const stock = catProducts.reduce((acc, p) => acc + p.qty, 0);
    return { name: catName, count, value, stock };
  });

  const maxCategoryValue = Math.max(...categoryStats.map(c => c.value), 1);


  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard-container">
      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Products (SKUs)</span>
            <div className="stat-icon">📦</div>
          </div>
          <div className="stat-value">{totalSKUs}</div>
          <div className="stat-desc">Distinct items registered</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Quantity</span>
            <div className="stat-icon">🔢</div>
          </div>
          <div className="stat-value">{totalStock.toLocaleString()}</div>
          <div className="stat-desc">Units currently in warehouse</div>
        </div>

        <div className="stat-card success-card">
          <div className="stat-header">
            <span className="stat-title">Total Valuation</span>
            <div className="stat-icon">৳</div>
          </div>
          <div className="stat-value">{formatCurrency(totalValuation)}</div>
          <div className="stat-desc">Asset value based on purchase prices</div>
        </div>

        <div className="stat-card alert-card">
          <div className="stat-header">
            <span className="stat-title">Low Stock Alert</span>
            <div className="stat-icon">⚠️</div>
          </div>
          <div className="stat-value">{lowStockCount}</div>
          <div className="stat-desc">Items at or below restock limit</div>
        </div>

        <div className="stat-card danger-card">
          <div className="stat-header">
            <span className="stat-title">Out of Stock</span>
            <div className="stat-icon">🚨</div>
          </div>
          <div className="stat-value">{outOfStockCount}</div>
          <div className="stat-desc">Items depleted (0 quantity)</div>
        </div>
      </div>

      {/* Visualizations Panel */}
      <div className="visuals-panel">
        {/* Category Valuation Chart */}
        <div className="visual-card">
          <div className="visual-card-title">💵 Category Valuations (BDT)</div>
          <div className="chart-placeholder">
            {categoryStats.map(cat => {
              const heightPercent = (cat.value / maxCategoryValue) * 80; // Scale to max 80% height
              return (
                <div key={cat.name} className="chart-bar-container">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  >
                    <span className="chart-bar-value">
                      {cat.value > 1000 ? `${(cat.value / 1000).toFixed(1)}k` : cat.value}
                    </span>
                  </div>
                  <span className="chart-bar-label" title={cat.name}>{cat.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Share gauge */}
        <div className="visual-card">
          <div className="visual-card-title">📊 Category Stock Distribution</div>
          <div className="category-gauge-list">
            {categoryStats.map(cat => {
              const sharePercent = totalStock > 0 ? (cat.stock / totalStock) * 100 : 0;
              return (
                <div key={cat.name} className="category-gauge-item">
                  <div className="category-gauge-header">
                    <span>{cat.name}</span>
                    <span>{cat.stock} units ({sharePercent.toFixed(1)}%)</span>
                  </div>
                  <div className="category-gauge-bar-bg">
                    <div 
                      className="category-gauge-bar-fill"
                      style={{ width: `${sharePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Low Stock & Recent Activity Grid */}
      <div className="visuals-panel">
        {/* Critical Alerts List */}
        <div className="visual-card">
          <div className="visual-card-title">🚨 Action Required (Out & Low Stock)</div>
          <div className="alert-list">
            {outOfStockItems.map(item => (
              <div key={item.id} className="alert-item out-of-stock">
                <div className="alert-item-details">
                  <span className="alert-item-name">{item.name}</span>
                  <span className="alert-item-meta">SKU: {item.sku} | Location: {item.location}</span>
                </div>
                <span className="alert-badge danger">Out of Stock</span>
              </div>
            ))}
            {lowStockItems.map(item => (
              <div key={item.id} className="alert-item">
                <div className="alert-item-details">
                  <span className="alert-item-name">{item.name}</span>
                  <span className="alert-item-meta">Qty: {item.qty} {item.unit} (Min: {item.minStock} {item.unit})</span>
                </div>
                <span className="alert-badge warning">Low Stock</span>
              </div>
            ))}
            {lowStockCount === 0 && outOfStockCount === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                ✅ All inventory levels are healthy!
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="visual-card">
          <div className="visual-card-title">🕒 Recent Stock Actions</div>
          <div className="alert-list">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="alert-item" style={{ borderLeftColor: tx.type === 'in' ? 'var(--success)' : tx.type === 'out' ? 'var(--danger)' : 'var(--accent-color)' }}>
                <div className="alert-item-details">
                  <span className="alert-item-name" style={{ fontSize: '0.9rem' }}>{tx.itemName}</span>
                  <span className="alert-item-meta">
                    {tx.type === 'in' ? 'Added' : tx.type === 'out' ? 'Issued' : 'Adjusted'}: {Math.abs(tx.qty)} | {formatDate(tx.date)}
                  </span>
                </div>
                <span className="alert-item-meta" style={{ fontSize: '0.8rem', fontStyle: 'italic', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                  {tx.description}
                </span>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No recent transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
