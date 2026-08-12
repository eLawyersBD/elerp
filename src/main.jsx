import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { setupFetchInterceptor } from './config/firebaseFetchInterceptor'

setupFetchInterceptor();

window.formatDate = (dateVal) => {
  if (!dateVal) return '—';
  try {
    // If it starts with standard YYYY-MM-DD pattern (to avoid timezone shifts)
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = match[1].slice(-2);
        const monthIdx = parseInt(match[2], 10) - 1;
        const day = match[3];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day}-${months[monthIdx]}-${year}`;
      }
    }
    // Fallback to Date object parsing
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${months[d.getMonth()]}-${year}`;
    }
    return dateVal;
  } catch {
    return dateVal;
  }
};


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
