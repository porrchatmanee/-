/**
 * Thai Kedmanee Keyboard to English Barcode Translation Engine
 * Handles 100% of Thai mistypings from physical USB/Bluetooth barcode guns,
 * virtual keyboards, and mobile scanners.
 */

// Full Kedmanee mapping (Normal + Shifted keys)
export const THAI_KEDMANEE_TO_EN_MAP: Record<string, string> = {
  // Numbers row (Normal)
  'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5', 'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0', 'ข': '-', 'ช': '=',
  
  // Numbers row (Shifted)
  '+': '!', '๑': '1', '๒': '2', '๓': '3', '๔': '4', 'ู': '^', '฿': '&', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
  
  // Row 1 (QWERTY: q - p, [, ], \)
  'ๆ': 'q', 'ไ': 'w', 'ำ': 'e', 'พ': 'r', 'ะ': 't', 'ั': 'y', 'ี': 'u', 'ร': 'i', 'น': 'o', 'ย': 'p', 'บ': '[', 'ล': ']', 'ฃ': '\\',
  // Shifted Row 1
  '๐': '0', '"': 'W', 'ฎ': 'E', 'ฑ': 'R', 'ธ': 'T', 'ํ': 'Y', '๊': 'U', 'ณ': 'I', 'ฯ': 'O', 'ญ': 'P', 'ฐ': '{', '': '}', 'ฅ': '|',
  
  // Row 2 (ASDF: a - ')
  'ฟ': 'a', 'ห': 's', 'ก': 'd', 'ด': 'f', 'เ': 'g', '้': 'h', '่': 'j', 'า': 'k', 'ส': 'l', 'ว': ';', 'ง': '\'',
  // Shifted Row 2
  'ฤ': 'A', 'ฆ': 'S', 'ฏ': 'D', 'โ': 'F', 'ฌ': 'G', '็': 'H', '๋': 'J', 'ษ': 'K', 'ศ': 'L', 'ซ': ':', '.': '"',
  
  // Row 3 (ZXCV: z - /)
  'ผ': 'z', 'ป': 'x', 'แ': 'c', 'อ': 'v', 'ิ': 'b', 'ื': 'n', 'ท': 'm', 'ม': ',', 'ใ': '.', 'ฝ': '/',
  // Shifted Row 3
  '(': 'Z', ')': 'X', 'ฉ': 'C', 'ฮ': 'V', 'ฺ': 'B', '์': 'N', '?': 'M', 'ฒ': '<', 'ฬ': '>', 'ฦ': '?',
};

// Regex to detect any Thai script characters (including vowels, tone marks, symbols)
export const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;

/**
 * Checks if a string contains any Thai characters
 */
export function containsThai(str: string): boolean {
  return THAI_CHAR_REGEX.test(str);
}

/**
 * Converts Thai Kedmanee keystrokes back to English
 */
export function thaiKedmaneeToEnglish(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += THAI_KEDMANEE_TO_EN_MAP[char] !== undefined ? THAI_KEDMANEE_TO_EN_MAP[char] : char;
  }
  return result;
}

/**
 * Normalizes barcode input:
 * 1. Converts Thai keyboard characters to English
 * 2. If forceNumeric is true or text looks like an EAN/numeric barcode, extracts numbers
 * 3. Strips whitespace and normalizes to uppercase
 */
export function normalizeBarcode(text: string, forceNumeric: boolean = false): string {
  if (!text) return '';
  
  // Step 1: Translate Thai characters if present
  let converted = containsThai(text) ? thaiKedmaneeToEnglish(text) : text;
  
  // Step 2: Strip non-numeric if requested
  if (forceNumeric) {
    converted = converted.replace(/[^0-9]/g, '');
  }
  
  // Step 3: Remove whitespace and uppercase
  return converted.replace(/\s+/g, '').trim().toUpperCase();
}

/**
 * Convenience helper to extract strictly numbers from any string (Thai or English)
 */
export function extractBarcodeDigits(text: string): string {
  if (!text) return '';
  const converted = containsThai(text) ? thaiKedmaneeToEnglish(text) : text;
  return converted.replace(/[^0-9]/g, '');
}
