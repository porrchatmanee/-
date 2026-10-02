import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// BARCODE KEYBOARD MAPPING FIX (Thai -> English Kedmanee)
(window as any).fixBarcodeThaiMistyping = (text: string) => {
  if (!text) return '';
  const mapping: { [key: string]: string } = {
    // Numbers row
    'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5', 'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0', 'ข': '-', 'ช': '=',
    // Numbers shifted
    '+': '!', '๑': '2', '๒': '3', '๓': '4', '๔': '5', 'ู': '6', '฿': '7', '๕': '8', '๖': '9', '๗': '0', '๘': '_', '๙': '+',
    // Row 1 (q-p)
    'ๆ': 'q', 'ไ': 'w', 'ำ': 'e', 'พ': 'r', 'ะ': 't', 'ั': 'y', 'ี': 'u', 'ร': 'i', 'น': 'o', 'ย': 'p', 'บ': '[', 'ล': ']', 'ฃ': '\\',
    '๐': 'Q', '"': 'W', 'ฎ': 'E', 'ฑ': 'R', 'ธ': 'T', 'ํ': 'Y', '๊': 'U', 'ณ': 'I', 'ฯ': 'O', 'ญ': 'P', 'ฐ': '{', '': '}', 'ฅ': '|',
    // Row 2 (a-l)
    'ฟ': 'a', 'ห': 's', 'ก': 'd', 'ด': 'f', 'เ': 'g', '้': 'h', '่': 'j', 'า': 'k', 'ส': 'l', 'ว': ';', 'ง': '\'',
    'ฤ': 'A', 'ฆ': 'S', 'ฏ': 'D', 'โ': 'F', 'ฌ': 'G', '็': 'H', '๋': 'J', 'ษ': 'K', 'ศ': 'L', 'ซ': ':', '.': '"',
    // Row 3 (z-m)
    'ผ': 'z', 'ป': 'x', 'แ': 'c', 'อ': 'v', 'ิ': 'b', 'ื': 'n', 'ท': 'm', 'ม': ',', 'ใ': '.', 'ฝ': '/',
    '(': 'Z', ')': 'X', 'ฉ': 'C', 'ฮ': 'V', 'ฺ': 'B', '์': 'N', '?': 'M', 'ฒ': '<', 'ฬ': '>', 'ฦ': '?'
  };
  return text.split('').map(char => mapping[char] || char).join('');
};

// EMERGENCY CACHE CLEARING FOR PERSISTENT "DISPENSE" ERRORS
(function() {
  const CURRENT_VER = '20261002_REV13';
  const savedVer = localStorage.getItem('app_version_cache');
  if (savedVer !== CURRENT_VER) {
    console.log('New version detected (main), clearing cache...');
    localStorage.clear();
    localStorage.setItem('app_version_cache', CURRENT_VER);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for(let reg of regs) reg.unregister();
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }
})();

createRoot(document.getElementById('app-v7')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
