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

export interface ParsedGS1Barcode {
  gtin?: string;        // 14 or 13-digit product barcode (e.g. 8858996005581)
  expiryDate?: string;  // YYYY-MM-DD
  lotNumber?: string;   // Lot/Batch number
  serialNumber?: string;
  isGS1: boolean;
}

/**
 * Parses GS1-128 / GS1 DataMatrix strings
 * Examples:
 * "(01)08858996005581(17)270401(10)0105"
 * "010885899600558117270401100105"
 * "018858996005581770400100105"
 */
export function parseGS1Barcode(text: string): ParsedGS1Barcode {
  if (!text) return { isGS1: false };
  const raw = extractBarcodeDigits(text) || text.trim();
  
  const result: ParsedGS1Barcode = { isGS1: false };

  // Case 1: Bracketed format like (01)0885...(17)261231(10)LOT1
  if (text.includes('(') && text.includes(')')) {
    const gtinMatch = text.match(/\(01\)(\d{14}|\d{13}|\d{12})/);
    if (gtinMatch) {
      result.gtin = gtinMatch[1].startsWith('0') && gtinMatch[1].length === 14 ? gtinMatch[1].slice(1) : gtinMatch[1];
      result.isGS1 = true;
    }
    const expMatch = text.match(/\(17\)(\d{6})/);
    if (expMatch) {
      const yy = expMatch[1].slice(0, 2);
      const mm = expMatch[1].slice(2, 4);
      const dd = expMatch[1].slice(4, 6);
      const year = 2000 + parseInt(yy, 10);
      result.expiryDate = `${year}-${mm}-${dd}`;
      result.isGS1 = true;
    }
    const lotMatch = text.match(/\(10\)([^\(\)]+)/);
    if (lotMatch) {
      result.lotNumber = lotMatch[1].trim();
      result.isGS1 = true;
    }
    return result;
  }

  // Case 2: Continuous numeric stream starting with 01
  if (raw.startsWith('01') && raw.length >= 15) {
    if (raw.startsWith('01885') && raw.length >= 15) {
      // 13-digit Thai EAN immediately after 01 (without leading 0)
      const candidate13 = raw.substring(2, 15);
      result.gtin = candidate13;
      result.isGS1 = true;
      const rest = raw.substring(15);
      if (rest.startsWith('17') && rest.length >= 8) {
        const yy = rest.substring(2, 4);
        const mm = rest.substring(4, 6);
        const dd = rest.substring(6, 8);
        result.expiryDate = `20${yy}-${mm}-${dd}`;
        const lotRest = rest.substring(8);
        if (lotRest.startsWith('10') && lotRest.length > 2) {
          result.lotNumber = lotRest.substring(2);
        } else if (lotRest) {
          result.lotNumber = lotRest;
        }
      } else if (rest.startsWith('10')) {
        result.lotNumber = rest.substring(2);
      }
    } else {
      // Standard 14-digit GTIN (e.g. 0885... or other country prefix)
      const candidate14 = raw.substring(2, 16);
      if (/^\d{14}$/.test(candidate14)) {
        result.gtin = candidate14.startsWith('0') ? candidate14.slice(1) : candidate14;
        result.isGS1 = true;

        const rest = raw.substring(16);
        if (rest.startsWith('17') && rest.length >= 8) {
          const yy = rest.substring(2, 4);
          const mm = rest.substring(4, 6);
          const dd = rest.substring(6, 8);
          const yNum = parseInt(yy, 10);
          if (yNum >= 20 && yNum <= 45 && parseInt(mm, 10) >= 1 && parseInt(mm, 10) <= 12) {
            result.expiryDate = `20${yy}-${mm}-${dd}`;
          }
          const lotRest = rest.substring(8);
          if (lotRest.startsWith('10') && lotRest.length > 2) {
            result.lotNumber = lotRest.substring(2);
          } else if (lotRest) {
            result.lotNumber = lotRest;
          }
        } else if (rest.startsWith('10')) {
          result.lotNumber = rest.substring(2);
        }
      } else {
        // Try 13-digit EAN immediately following 01
        const candidate13 = raw.substring(2, 15);
        if (/^885\d{10}$/.test(candidate13)) {
          result.gtin = candidate13;
          result.isGS1 = true;
        }
      }
    }
  }

  // Case 3: Embedded Thai EAN-13 in string (starts with 885 and has 13 digits)
  const thaiEanMatch = raw.match(/(885\d{10})/);
  if (thaiEanMatch && !result.gtin) {
    result.gtin = thaiEanMatch[1];
    if (raw.length > 13) {
      result.isGS1 = true;
    }
  }

  return result;
}

/**
 * Intelligent barcode matcher:
 * Compares scannedCode vs targetItemCode (e.g. in inventory item id)
 * Supports:
 * - Exact match
 * - Normalized match (case-insensitive, Thai Kedmanee auto-translated)
 * - Digit-only match
 * - Leading zero stripped match (e.g. 0885... vs 885...)
 * - GS1 extracted GTIN comparison without recursion
 * - Substring containment (e.g. full GS1 018858996005581770400100105 vs EAN-13 8858996005581)
 */
export function areBarcodesMatching(scanned: string, target: string): boolean {
  if (!scanned || !target) return false;
  const sTrim = scanned.trim();
  const tTrim = target.trim();
  if (!sTrim || !tTrim) return false;
  if (sTrim === tTrim) return true;

  const sNorm = normalizeBarcode(sTrim);
  const tNorm = normalizeBarcode(tTrim);
  if (sNorm && tNorm && sNorm.toLowerCase() === tNorm.toLowerCase()) return true;

  const sDigits = extractBarcodeDigits(sTrim);
  const tDigits = extractBarcodeDigits(tTrim);
  if (sDigits && tDigits) {
    if (sDigits === tDigits) return true;
    
    // Strip leading zeroes (e.g. 08858996005581 vs 8858996005581)
    const sNoZero = sDigits.replace(/^0+/, '');
    const tNoZero = tDigits.replace(/^0+/, '');
    if (sNoZero.length >= 6 && sNoZero === tNoZero) return true;

    // Substring containment (e.g. 018858996005581770400100105 contains 8858996005581)
    if (tNoZero.length >= 8 && sDigits.includes(tNoZero)) return true;
    if (sNoZero.length >= 8 && tDigits.includes(sNoZero)) return true;
  }

  // Check GS1 parsed GTINs (Non-recursive check)
  const gs1Scanned = parseGS1Barcode(sTrim);
  const gs1Target = parseGS1Barcode(tTrim);

  const candidateScannedGTINs: string[] = [];
  if (gs1Scanned.gtin) candidateScannedGTINs.push(gs1Scanned.gtin);

  const candidateTargetGTINs: string[] = [];
  if (gs1Target.gtin) candidateTargetGTINs.push(gs1Target.gtin);

  for (const sGtin of candidateScannedGTINs) {
    const sGtinDigits = extractBarcodeDigits(sGtin);
    const sGtinNoZero = sGtinDigits.replace(/^0+/, '');
    
    if (tDigits && (sGtinDigits === tDigits || (sGtinNoZero.length >= 6 && sGtinNoZero === tDigits.replace(/^0+/, '')))) {
      return true;
    }
    if (tTrim.toLowerCase() === sGtin.toLowerCase()) return true;
    if (tDigits && tDigits.length >= 8 && sGtinDigits.includes(tDigits)) return true;
    if (sGtinNoZero.length >= 8 && tDigits && tDigits.includes(sGtinNoZero)) return true;
  }

  for (const tGtin of candidateTargetGTINs) {
    const tGtinDigits = extractBarcodeDigits(tGtin);
    const tGtinNoZero = tGtinDigits.replace(/^0+/, '');
    
    if (sDigits && (sDigits === tGtinDigits || (sDigits.replace(/^0+/, '') === tGtinNoZero && tGtinNoZero.length >= 6))) {
      return true;
    }
    if (sTrim.toLowerCase() === tGtin.toLowerCase()) return true;
    if (sDigits && sDigits.length >= 8 && tGtinDigits.includes(sDigits)) return true;
    if (tGtinNoZero.length >= 8 && sDigits && sDigits.includes(tGtinNoZero)) return true;
  }

  // Cross compare parsed GTINs if both have them
  if (gs1Scanned.gtin && gs1Target.gtin) {
    const sG = extractBarcodeDigits(gs1Scanned.gtin).replace(/^0+/, '');
    const tG = extractBarcodeDigits(gs1Target.gtin).replace(/^0+/, '');
    if (sG && tG && sG === tG) return true;
  }

  return false;
}
