import { initialProducts } from '../utils/mockData';
import { accountingService } from './accountingService';
import { auditService } from './auditService';
import { isFirebaseConfigured } from '../config/firebase';
import { saveToFirestore, fetchCollectionFromFirestore } from '../utils/hrmsFirebase';

const BACKEND_URL = '/api';

// Local storage helpers
const getLocalProducts = () => {
  const local = localStorage.getItem('erp_products');
  if (local) {
    const parsed = JSON.parse(local);
    if (parsed.length > 0 && parsed.some(p => p.id && p.id.startsWith('SRV-'))) {
      localStorage.setItem('erp_products', JSON.stringify(initialProducts));
      return initialProducts;
    }
    return parsed;
  }
  localStorage.setItem('erp_products', JSON.stringify(initialProducts));
  return initialProducts;
};

const saveLocalProducts = (products) => {
  localStorage.setItem('erp_products', JSON.stringify(products));
};

const getLocalMovements = () => {
  const local = localStorage.getItem('erp_movements');
  return local ? JSON.parse(local) : [];
};

const saveLocalMovements = (movements) => {
  localStorage.setItem('erp_movements', JSON.stringify(movements));
};

export const inventoryService = {
  // Get products list
  getProducts: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/products`);
      if (res.ok) {
        const data = await res.json();
        saveLocalProducts(data);
        return data;
      }
    } catch (err) {
      console.warn('[inventoryService] MySQL getProducts failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('products');
        if (data && data.length > 0) {
          saveLocalProducts(data);
          return data;
        }
      }
    }
    return getLocalProducts();
  },

  // Update stock level and recalculate AVCO (Weighted Average Cost)
  purchaseStockIn: async (productId, variantId, qtyIn, unitPrice, refNo) => {
    if (qtyIn <= 0) return;

    let isUpdated = false;

    // Try updating MySQL backend first
    try {
      const prodRes = await fetch(`${BACKEND_URL}/erp/products`);
      if (prodRes.ok) {
        const productsList = await prodRes.json();
        const product = productsList.find(p => p.id === productId);
        if (product) {
          const currentQty = Number(product.qty || 0);
          const currentCost = Number(product.price || 0);

          const totalQty = currentQty + qtyIn;
          const newAvgCost = totalQty > 0 ? ((currentQty * currentCost) + (qtyIn * unitPrice)) / totalQty : 0;

          // Update product in MySQL
          await fetch(`${BACKEND_URL}/erp/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              qty: totalQty,
              price: Number(newAvgCost.toFixed(2))
            })
          });

          // Log stock movement in MySQL
          await fetch(`${BACKEND_URL}/erp/stock-movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `move-${Date.now()}`,
              productId,
              variantId: variantId || null,
              qty: qtyIn,
              unitPrice,
              type: 'purchase',
              refNo,
              date: new Date().toISOString()
            })
          });
          isUpdated = true;
        }
      }
    } catch (error) {
      console.warn('[inventoryService] MySQL purchaseStockIn failed, trying Firestore', error.message);
    }

    if (!isUpdated && isFirebaseConfigured()) {
      try {
        const productsList = await fetchCollectionFromFirestore('products');
        const product = productsList.find(p => p.id === productId);
        if (product) {
          const currentQty = Number(product.qty || 0);
          const currentCost = Number(product.price || 0);

          const totalQty = currentQty + qtyIn;
          const newAvgCost = totalQty > 0 ? ((currentQty * currentCost) + (qtyIn * unitPrice)) / totalQty : 0;

          const updatedProduct = {
            ...product,
            qty: totalQty,
            price: Number(newAvgCost.toFixed(2))
          };

          await saveToFirestore('products', productId, updatedProduct);

          const moveId = `move-${Date.now()}`;
          await saveToFirestore('stock_movements', moveId, {
            id: moveId,
            productId,
            variantId: variantId || null,
            qty: qtyIn,
            unitPrice,
            type: 'purchase',
            refNo,
            date: new Date().toISOString()
          });
          isUpdated = true;
        }
      } catch (fbErr) {
        console.warn('[inventoryService] Firestore purchaseStockIn failed', fbErr.message);
      }
    }

    // Offline LocalStorage Mode
    const products = getLocalProducts();
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const currentQty = Number(p.qty || 0);
        const currentCost = Number(p.price || 0);

        const totalQty = currentQty + qtyIn;
        const newAvgCost = totalQty > 0 ? ((currentQty * currentCost) + (qtyIn * unitPrice)) / totalQty : 0;

        return {
          ...p,
          qty: totalQty,
          price: Number(newAvgCost.toFixed(2)) // update unit cost
        };
      }
      return p;
    });

    saveLocalProducts(updatedProducts);

    const movements = getLocalMovements();
    const newMovement = {
      id: `move-${Date.now()}`,
      productId,
      variantId: variantId || null,
      qty: qtyIn,
      unitPrice,
      type: 'purchase',
      refNo,
      date: new Date().toISOString()
    };
    saveLocalMovements([newMovement, ...movements]);
  },

  // Sales Stock Out (dispatches stock, logs movement)
  salesStockOut: async (productId, variantId, qtyOut, refNo) => {
    if (qtyOut <= 0) return 0;

    let costValue = 0;
    let isUpdated = false;

    // Try updating MySQL backend
    try {
      const prodRes = await fetch(`${BACKEND_URL}/erp/products`);
      if (prodRes.ok) {
        const productsList = await prodRes.json();
        const product = productsList.find(p => p.id === productId);
        if (product) {
          if (product.qty < qtyOut) {
            throw new Error(`Insufficient stock for product "${product.name}"! Available: ${product.qty}`);
          }
          costValue = Number(product.price || 0);

          // Update product in MySQL
          await fetch(`${BACKEND_URL}/erp/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              qty: product.qty - qtyOut
            })
          });

          // Log stock movement in MySQL
          await fetch(`${BACKEND_URL}/erp/stock-movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `move-${Date.now()}`,
              productId,
              variantId: variantId || null,
              qty: -qtyOut,
              unitPrice: costValue,
              type: 'sale',
              refNo,
              date: new Date().toISOString()
            })
          });
          isUpdated = true;
        }
      }
    } catch (error) {
      console.warn('[inventoryService] MySQL salesStockOut failed, trying Firestore', error.message);
    }

    if (!isUpdated && isFirebaseConfigured()) {
      try {
        const productsList = await fetchCollectionFromFirestore('products');
        const product = productsList.find(p => p.id === productId);
        if (product) {
          if (product.qty < qtyOut) {
            throw new Error(`Insufficient stock for product "${product.name}"! Available: ${product.qty}`);
          }
          costValue = Number(product.price || 0);

          const updatedProduct = {
            ...product,
            qty: product.qty - qtyOut
          };

          await saveToFirestore('products', productId, updatedProduct);

          const moveId = `move-${Date.now()}`;
          await saveToFirestore('stock_movements', moveId, {
            id: moveId,
            productId,
            variantId: variantId || null,
            qty: -qtyOut,
            unitPrice: costValue,
            type: 'sale',
            refNo,
            date: new Date().toISOString()
          });
          isUpdated = true;
        }
      } catch (fbErr) {
        console.warn('[inventoryService] Firestore salesStockOut failed', fbErr.message);
      }
    }

    // Always run LocalStorage updates for offline sync mirror
    const products = getLocalProducts();
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        if (p.qty < qtyOut) {
          throw new Error(`Insufficient stock for product "${p.name}"! Available: ${p.qty}`);
        }
        costValue = Number(p.price || 0);
        return {
          ...p,
          qty: p.qty - qtyOut
        };
      }
      return p;
    });

    saveLocalProducts(updatedProducts);

    const movements = getLocalMovements();
    const newMovement = {
      id: `move-${Date.now()}`,
      productId,
      variantId: variantId || null,
      qty: -qtyOut,
      unitPrice: costValue,
      type: 'sale',
      refNo,
      date: new Date().toISOString()
    };
    saveLocalMovements([newMovement, ...movements]);

    return costValue;
  },

  adjustStock: async (productId, deltaQty, reason, currentUser) => {
    if (deltaQty === 0) return;

    let costBasis = 0;
    let pName = '';
    let isUpdated = false;

    // Try updating MySQL backend
    try {
      const prodRes = await fetch(`${BACKEND_URL}/erp/products`);
      if (prodRes.ok) {
        const productsList = await prodRes.json();
        const product = productsList.find(p => p.id === productId);
        if (product) {
          if (product.qty + deltaQty < 0) {
            throw new Error(`Negative stock not allowed. Adjusting by ${deltaQty} is impossible.`);
          }
          costBasis = Number(product.price || 0);
          pName = product.name;

          const currentMap = product.warehouseQtyMap || { 'wh-1': product.qty, 'wh-2': 0, 'wh-3': 0 };
          const newMap = {
            ...currentMap,
            'wh-1': Math.max(0, (currentMap['wh-1'] || 0) + deltaQty)
          };

          // Update product in MySQL
          await fetch(`${BACKEND_URL}/erp/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              qty: product.qty + deltaQty,
              warehouseQtyMap: newMap
            })
          });

          // Log stock movement in MySQL
          await fetch(`${BACKEND_URL}/erp/stock-movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `move-${Date.now()}`,
              productId,
              qty: deltaQty,
              unitPrice: costBasis,
              type: 'adjustment',
              refNo: `ADJ-${Date.now().toString().slice(-6)}`,
              date: new Date().toISOString()
            })
          });
          isUpdated = true;
        }
      }
    } catch (error) {
      console.warn('[inventoryService] MySQL adjustStock failed, trying Firestore', error.message);
    }

    if (!isUpdated && isFirebaseConfigured()) {
      try {
        const productsList = await fetchCollectionFromFirestore('products');
        const product = productsList.find(p => p.id === productId);
        if (product) {
          if (product.qty + deltaQty < 0) {
            throw new Error(`Negative stock not allowed. Adjusting by ${deltaQty} is impossible.`);
          }
          costBasis = Number(product.price || 0);
          pName = product.name;

          const currentMap = product.warehouseQtyMap || { 'wh-1': product.qty, 'wh-2': 0, 'wh-3': 0 };
          const newMap = {
            ...currentMap,
            'wh-1': Math.max(0, (currentMap['wh-1'] || 0) + deltaQty)
          };

          const updatedProduct = {
            ...product,
            qty: product.qty + deltaQty,
            warehouseQtyMap: newMap
          };

          await saveToFirestore('products', productId, updatedProduct);

          const moveId = `move-${Date.now()}`;
          await saveToFirestore('stock_movements', moveId, {
            id: moveId,
            productId,
            qty: deltaQty,
            unitPrice: costBasis,
            type: 'adjustment',
            refNo: `ADJ-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString()
          });
          isUpdated = true;
        }
      } catch (fbErr) {
        console.warn('[inventoryService] Firestore adjustStock failed', fbErr.message);
      }
    }

    // Offline LocalStorage Mode
    const products = getLocalProducts();
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        if (p.qty + deltaQty < 0) {
          throw new Error(`Negative stock not allowed. Adjusting by ${deltaQty} is impossible.`);
        }
        costBasis = Number(p.price || 0);
        pName = p.name;
        const currentMap = p.warehouseQtyMap || { 'wh-1': p.qty, 'wh-2': 0, 'wh-3': 0 };
        const newMap = {
          ...currentMap,
          'wh-1': Math.max(0, (currentMap['wh-1'] || 0) + deltaQty)
        };
        return {
          ...p,
          qty: p.qty + deltaQty,
          warehouseQtyMap: newMap
        };
      }
      return p;
    });

    saveLocalProducts(updatedProducts);

    const movements = getLocalMovements();
    const newMovement = {
      id: `move-${Date.now()}`,
      productId,
      qty: deltaQty,
      unitPrice: costBasis,
      type: 'adjustment',
      refNo: `ADJ-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString()
    };
    saveLocalMovements([newMovement, ...movements]);

    // Audit log
    await auditService.logCreate(currentUser, 'inventory', productId, `ADJ-${Date.now().toString().slice(-6)}`,
      `Stock adjustment: ${deltaQty > 0 ? '+' : ''}${deltaQty} units of ${pName} — ${reason || 'Manual adjustment'}`);

    // Journal posting for stock adjustments
    if (deltaQty < 0) {
      // Write-off: DR Stock Adjustment Expense / CR Inventory Asset
      const adjustmentValue = Math.abs(deltaQty) * costBasis;
      if (adjustmentValue > 0) {
        await accountingService.postJournalEntry({
          date: new Date().toISOString(),
          refNo: `ADJ-EXP-${Date.now().toString().slice(-6)}`,
          narration: `Inventory write-off: ${reason || 'Damaged goods'} (${Math.abs(deltaQty)} units of ${pName})`,
          lines: [
            { accountId: 'acc-6090', type: 'debit',  amount: adjustmentValue }, // Stock Adjustment Expense
            { accountId: 'acc-1200', type: 'credit', amount: adjustmentValue }  // Inventory Asset
          ],
          sourceModule: 'adjustment',
          sourceRefId: productId
        });
      }
    } else if (deltaQty > 0) {
      // Surplus found: DR Inventory Asset / CR Other Income (acc-4040)
      const surplusValue = deltaQty * costBasis;
      if (surplusValue > 0) {
        await accountingService.postJournalEntry({
          date: new Date().toISOString(),
          refNo: `ADJ-SURP-${Date.now().toString().slice(-6)}`,
          narration: `Inventory surplus found: ${reason || 'Stock count gain'} (+${deltaQty} units of ${pName})`,
          lines: [
            { accountId: 'acc-1200', type: 'debit',  amount: surplusValue }, // Inventory Asset
            { accountId: 'acc-4040', type: 'credit', amount: surplusValue }  // Other Income
          ],
          sourceModule: 'adjustment',
          sourceRefId: productId
        });
      }
    }
  },

  /* ── Sell Stock Out (reduces qty, logs movement) ── */
  sellStockOut: async (productId, variantId, qtySold, refNo) => {
    if (qtySold <= 0) return;

    let isUpdated = false;

    // Try updating MySQL backend
    try {
      const prodRes = await fetch(`${BACKEND_URL}/erp/products`);
      if (prodRes.ok) {
        const productsList = await prodRes.json();
        const product = productsList.find(p => p.id === productId);
        if (product) {
          // Update product in MySQL
          await fetch(`${BACKEND_URL}/erp/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              qty: Number(product.qty || 0) - qtySold
            })
          });

          // Log stock movement in MySQL
          await fetch(`${BACKEND_URL}/erp/stock-movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `move-${Date.now()}`,
              productId,
              variantId: variantId || null,
              qty: -qtySold,
              unitPrice: product.price || 0,
              type: 'sale',
              refNo,
              date: new Date().toISOString()
            })
          });
          isUpdated = true;
        }
      }
    } catch (error) {
      console.warn('[inventoryService] MySQL sellStockOut failed, trying Firestore', error.message);
    }

    if (!isUpdated && isFirebaseConfigured()) {
      try {
        const productsList = await fetchCollectionFromFirestore('products');
        const product = productsList.find(p => p.id === productId);
        if (product) {
          const updatedProduct = {
            ...product,
            qty: Number(product.qty || 0) - qtySold
          };

          await saveToFirestore('products', productId, updatedProduct);

          const moveId = `move-${Date.now()}`;
          await saveToFirestore('stock_movements', moveId, {
            id: moveId,
            productId,
            variantId: variantId || null,
            qty: -qtySold,
            unitPrice: product.price || 0,
            type: 'sale',
            refNo,
            date: new Date().toISOString()
          });
          isUpdated = true;
        }
      } catch (fbErr) {
        console.warn('[inventoryService] Firestore sellStockOut failed', fbErr.message);
      }
    }

    // Offline LocalStorage Mirror
    const products = getLocalProducts();
    const product = products.find(p => p.id === productId);
    const unitPrice = product ? Number(product.price || 0) : 0;
    saveLocalProducts(products.map(p => {
      if (p.id === productId) return { ...p, qty: Number(p.qty || 0) - qtySold };
      return p;
    }));

    const movements = getLocalMovements();
    saveLocalMovements([{
      id: `move-${Date.now()}`,
      productId, variantId: variantId || null,
      qty: -qtySold, type: 'sale',
      unitPrice,
      refNo, date: new Date().toISOString()
    }, ...movements]);
  },

  // Get stock movements
  getStockMovements: async () => {
    try {
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('stock_movements');
        if (data && data.length > 0) {
          saveLocalMovements(data);
          return data;
        }
      }
    } catch (err) {
      console.warn('[inventoryService] Firestore getStockMovements failed, using LocalStorage', err.message);
    }
    return getLocalMovements();
  },

  // Get all reorder requests
  getReorderRequests: async () => {
    try {
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('reorder_requests');
        if (data && data.length > 0) {
          localStorage.setItem('erp_reorder_requests', JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn('[inventoryService] Firestore getReorderRequests failed, using LocalStorage', err.message);
    }
    try {
      const local = localStorage.getItem('erp_reorder_requests');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  },

  // Post a new reorder request
  postReorderRequest: async (request, currentUser) => {
    const newReq = {
      id: `req-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      status: 'pending',
      requestedBy: currentUser?.email || 'system',
      ...request
    };

    if (isFirebaseConfigured()) {
      try {
        await saveToFirestore('reorder_requests', newReq.id, newReq);
      } catch (err) {
        console.warn('[inventoryService] Firestore postReorderRequest failed', err.message);
      }
    }

    try {
      const local = localStorage.getItem('erp_reorder_requests');
      const list = local ? JSON.parse(local) : [];
      localStorage.setItem('erp_reorder_requests', JSON.stringify([newReq, ...list]));
    } catch (err) {
      console.warn('[inventoryService] LocalStorage save reorder request failed', err.message);
    }

    await auditService.logCreate(currentUser, 'inventory', newReq.id, newReq.id, 
      `Reorder request created for ${newReq.productName} — Qty: ${newReq.qty} ${newReq.unit}`);

    return newReq;
  },
};


