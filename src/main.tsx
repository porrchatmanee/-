import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// GLOBAL BARCODE NORMALIZER (The Ultimate Fix - REV17)
(window as any).normalizeBarcode = (text: string, forceNumeric: boolean = false) => {
  if (!text) return '';
  
  // 1. Comprehensive Thai to English Kedmanee Mapping
  const mapping: { [key: string]: string } = {
    'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5', 'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0', 'ข': '-', 'ช': '=',
    '+': '!', '๑': '2', '๒': '3', '๓': '4', '๔': '5', 'ู': '6', '฿': '7', '๕': '8', '๖': '9', '๗': '0', '๘': '_', '๙': '+',
    'ๆ': 'q', 'ไ': 'w', 'ำ': 'e', 'พ': 'r', 'ะ': 't', 'ั': 'y', 'ี': 'u', 'ร': 'i', 'น': 'o', 'ย': 'p', 'บ': '[', 'ล': ']', 'ฃ': '\\',
    '๐': 'Q', '"': 'W', 'ฎ': 'E', 'ฑ': 'R', 'ธ': 'T', 'ํ': 'Y', '๊': 'U', 'ณ': 'I', 'ฯ': 'O', 'ญ': 'P', 'ฐ': '{', '': '}', 'ฅ': '|',
    'ฟ': 'a', 'ห': 's', 'ก': 'd', 'ด': 'f', 'เ': 'g', '้': 'h', '่': 'j', 'า': 'k', 'ส': 'l', 'ว': ';', 'ง': '\'',
    'ฤ': 'A', 'ฆ': 'S', 'ฏ': 'D', 'โ': 'F', 'ฌ': 'G', '็': 'H', '๋': 'J', 'ษ': 'K', 'ศ': 'L', 'ซ': ':', '.': '"',
    'ผ': 'z', 'ป': 'x', 'แ': 'c', 'อ': 'v', 'ิ': 'b', 'ื': 'n', 'ท': 'm', 'ม': ',', 'ใ': '.', 'ฝ': '/',
    '(': 'Z', ')': 'X', 'ฉ': 'C', 'ฮ': 'V', 'ฺ': 'B', '์': 'N', '?': 'M', 'ฒ': '<', 'ฬ': '>', 'ฦ': '?'
  };
  
  // Check if we should even try to map (contains Thai characters)
  const hasThai = /[ก-ฮๅ/ภถุึคตจขชๆไำพะัีรนยบฟหกดเ้่สวผปแอิืทมใฝ]/.test(text);
  
  let result = '';
  if (hasThai) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      result += mapping[char] || char;
    }
  } else {
    result = text;
  }
  
  // 2. Filter logic
  if (forceNumeric) {
    result = result.replace(/[^0-9]/g, '');
  }
  
  // 3. Final cleanup (Remove spaces and uppercase)
  return result.replace(/\s+/g, '').trim().toUpperCase();
};

// EMERGENCY CACHE CLEARING
(function() {
  const CURRENT_VER = '20261002_REV17';
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
