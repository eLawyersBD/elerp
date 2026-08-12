import { db, isFirebaseConfigured } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const routeToCollectionMap = {
  '/api/erp/products': 'products',
  '/api/erp/stock-movements': 'stock_movements',
  '/api/erp/purchase-invoices': 'purchase_invoices',
  '/api/erp/purchase-returns': 'purchase_returns',
  '/api/erp/sales-invoices': 'sales_invoices',
  '/api/erp/sales-returns': 'sales_returns',
  '/api/erp/payments': 'payments',
  '/api/erp/coa': 'chart_of_accounts',
  '/api/erp/journals': 'journal_entries',
  '/api/erp/customers': 'customers',
  '/api/erp/suppliers': 'suppliers',
  '/api/erp/quotations': 'quotations',
  '/api/erp/sales-orders': 'sales_orders',
  '/api/erp/leads': 'leads',
  '/api/erp/lcs': 'lcs',
  '/api/erp/procurement/plans': 'procurement_plans',
  '/api/erp/procurement/requisitions': 'purchase_requisitions',
  '/api/erp/procurement/orders': 'purchase_orders',
  '/api/erp/procurement/grns': 'goods_receive_notes',
  '/api/erp/services/assets': 'service_assets',
  '/api/erp/services/amc': 'amc_contracts',
  '/api/erp/services/tickets': 'service_tickets',
  '/api/erp/services/estimates': 'service_estimates',
  '/api/erp/services': 'services',
  '/api/erp/tasks/templates': 'task_templates',
  '/api/erp/tasks/rules': 'task_rules',
  '/api/erp/tasks': 'tasks',
  '/api/erp/audit-logs': 'audit_logs',
  '/api/user-credentials': 'users',
  '/api/erp/vat-rates': 'vat_rates',
  '/api/erp/settings': 'settings'
};

function getCollectionAndId(url) {
  const urlPath = url.split('?')[0];
  for (const [route, col] of Object.entries(routeToCollectionMap)) {
    if (urlPath === route) {
      return { collectionName: col, id: null };
    }
    if (urlPath.startsWith(route + '/')) {
      const id = urlPath.substring(route.length + 1);
      return { collectionName: col, id };
    }
  }
  return null;
}

export const setupFetchInterceptor = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options = {}) {
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
    
    // Parse route mapping
    const apiRoute = getCollectionAndId(urlStr);
    
    if (apiRoute && isFirebaseConfigured() && db) {
      const { collectionName, id } = apiRoute;
      const method = (options.method || 'GET').toUpperCase();
      
      console.log(`[Fetch Interceptor] ${method} ${urlStr} -> Firestore Collection: ${collectionName}`);
      
      try {
        if (method === 'GET') {
          // 1. Firebase FIRST: Read from Firestore
          let data;
          if (id) {
            const docRef = doc(db, collectionName, id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              data = { id: snap.id, ...snap.data() };
            } else {
              // Fallback to original fetch to MySQL backend as secondary option
              try {
                const mySqlRes = await originalFetch.apply(this, arguments);
                if (mySqlRes.ok) return mySqlRes;
              } catch (e) {
                console.warn('[Fetch Interceptor] MySQL secondary read failed:', e.message);
              }
              return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }
          } else {
            const colRef = collection(db, collectionName);
            const snap = await getDocs(colRef);
            data = [];
            snap.forEach(doc => {
              data.push({ id: doc.id, ...doc.data() });
            });
          }
          
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        } else if (method === 'POST' || method === 'PUT') {
          // 1. Firebase FIRST: Write to Firestore
          const bodyData = options.body ? JSON.parse(options.body) : {};
          const docId = id || bodyData.id || bodyData.uid || bodyData.employeeCode || bodyData.refNo || `doc-${Date.now()}`;
          
          const docRef = doc(db, collectionName, docId);
          await setDoc(docRef, bodyData, { merge: true });
          console.log(`[Fetch Interceptor] Successfully saved to Firestore: ${collectionName}/${docId}`);
          
          // 2. MySQL SECONDARY: Concurrently/sequentially try saving to MySQL
          try {
            const mySqlRes = await originalFetch.apply(this, arguments);
            if (mySqlRes.ok) return mySqlRes;
          } catch (e) {
            console.warn('[Fetch Interceptor] MySQL secondary write failed:', e.message);
          }
          
          return new Response(JSON.stringify({ success: true, id: docId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        } else if (method === 'DELETE') {
          // 1. Firebase FIRST: Delete from Firestore
          if (id) {
            const docRef = doc(db, collectionName, id);
            await deleteDoc(docRef);
            console.log(`[Fetch Interceptor] Successfully deleted from Firestore: ${collectionName}/${id}`);
          }
          
          // 2. MySQL SECONDARY: Try deleting from MySQL
          try {
            const mySqlRes = await originalFetch.apply(this, arguments);
            if (mySqlRes.ok) return mySqlRes;
          } catch (e) {
            console.warn('[Fetch Interceptor] MySQL secondary delete failed:', e.message);
          }
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (err) {
        // Silently fall through to MySQL when Firestore fails (expected in dev with mock auth)
      }
    }
    
    // Default fallback: Try MySQL backend — suppress 502 errors since MySQL is optional
    try {
      const response = await originalFetch.apply(this, arguments);
      // Suppress 502/503/504 gateway errors from optional MySQL backend
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        return response; // Return silently, callers handle non-ok responses
      }
      return response;
    } catch (err) {
      // Network error — MySQL backend is unreachable, silently let caller handle
      throw err;
    }
  };
};
