import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { normalizeBarcode, extractBarcodeDigits, containsThai, thaiKedmaneeToEnglish } from './lib/barcode';

// Bind robust barcode utilities to window for legacy / global accessibility
(window as any).normalizeBarcode = normalizeBarcode;
(window as any).extractBarcodeDigits = extractBarcodeDigits;
(window as any).containsThai = containsThai;
(window as any).thaiKedmaneeToEnglish = thaiKedmaneeToEnglish;

// GLOBAL EMERGENCY UPDATE
(window as any).forceAppUpdate = () => {
  localStorage.clear();
  sessionStorage.clear();
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    });
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      for(let reg of regs) reg.unregister();
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
};

// EMERGENCY CACHE CLEARING
(function() {
  const CURRENT_VER = '20261002_BARCODE_FIX_V3';
  const savedVer = localStorage.getItem('app_version_cache');
  if (savedVer !== CURRENT_VER) {
    console.log('New version detected (main), clearing cache and updating to BARCODE_FIX_V3...');
    localStorage.setItem('app_version_cache', CURRENT_VER);
    // Hard reload
    window.location.reload();
  }
})();

createRoot(document.getElementById('app-v7')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

