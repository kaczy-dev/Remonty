import { ExpenseCategory, Expense } from '@/types/renovation';

export interface ParsedReceiptData {
  storeName?: string;
  totalAmount?: number;
  date?: string; // YYYY-MM-DD
  receiptNumber?: string;
  category?: ExpenseCategory;
  paymentMethod?: Expense['paymentMethod'];
  rawText?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface StoreRule {
  name: string;
  keywords: string[];
  defaultCategory: ExpenseCategory;
}

const KNOWN_STORES: StoreRule[] = [
  {
    name: 'Castorama',
    keywords: ['castorama', 'casto'],
    defaultCategory: 'Materiały budowlane',
  },
  {
    name: 'Leroy Merlin',
    keywords: ['leroy', 'merlin', 'leroy merlin', 'leroymerlin'],
    defaultCategory: 'Materiały budowlane',
  },
  {
    name: 'OBI',
    keywords: ['obi polska', 'obi market', 'obi'],
    defaultCategory: 'Materiały budowlane',
  },
  {
    name: 'Bricoman',
    keywords: ['bricoman'],
    defaultCategory: 'Materiały budowlane',
  },
  {
    name: 'PSB Mrówka',
    keywords: ['mrówka', 'mrowka', 'grupa psb', 'psb'],
    defaultCategory: 'Materiały budowlane',
  },
  {
    name: 'Brico Marché',
    keywords: ['brico marche', 'bricomarche'],
    defaultCategory: 'Materiały budowlane',
  },
  {
    name: 'Jula',
    keywords: ['jula'],
    defaultCategory: 'Narzędzia i sprzęt',
  },
  {
    name: 'Würth',
    keywords: ['wurth', 'würth'],
    defaultCategory: 'Narzędzia i sprzęt',
  },
  {
    name: 'IKEA',
    keywords: ['ikea'],
    defaultCategory: 'Wykończenie i dekoracje',
  },
  {
    name: 'Komfort',
    keywords: ['komfort', 'sklepy komfort'],
    defaultCategory: 'Wykończenie i dekoracje',
  },
  {
    name: 'Bel-Pol',
    keywords: ['bel-pol', 'belpol'],
    defaultCategory: 'Wykończenie i dekoracje',
  },
  {
    name: 'Agata Meble',
    keywords: ['agata meble', 'salony agata'],
    defaultCategory: 'Wykończenie i dekoracje',
  },
  {
    name: 'Praktiker / OBI / Inne',
    keywords: ['praktiker', 'majster'],
    defaultCategory: 'Materiały budowlane',
  },
];

/**
 * Normalizes Polish currency strings into a float number.
 * e.g. "1 450,99" -> 1450.99
 * e.g. "1.450,99" -> 1450.99
 * e.g. "1,450.99" -> 1450.99
 */
export function normalizePrice(raw: string): number | null {
  if (!raw) return null;
  let cleaned = raw.trim().replace(/\s+/g, '').replace(/(?:pln|zł|zl)$/i, '');
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // e.g. "1.450,99" -> dot is thousand separator, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. "1,450.99" -> comma is thousand separator, dot is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only comma present, e.g. "1450,99"
    cleaned = cleaned.replace(',', '.');
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? null : Math.round(val * 100) / 100;
}

/**
 * Extracts total gross amount from receipt text (PLN).
 */
export function extractTotalAmount(text: string): number | null {
  const lines = text.split('\n');

  // Priority 1: Direct matches with SUMA / RAZEM / DO ZAPŁATY / TOTAL
  const priorityPatterns = [
    /(?:suma\s*pln|suma\s*zł|suma)\s*[:=]?\s*(\d{1,4}(?:[\s.]\d{3})*[,.]\d{2})/i,
    /(?:razem\s*pln|razem\s*zł|razem)\s*[:=]?\s*(\d{1,4}(?:[\s.]\d{3})*[,.]\d{2})/i,
    /(?:do\s*zapłaty|do\s*zaplaty|płatność|platnosc)\s*[:=]?\s*(\d{1,4}(?:[\s.]\d{3})*[,.]\d{2})/i,
    /(?:wartość\s*brutto|wartosc\s*brutto|brutto)\s*[:=]?\s*(\d{1,4}(?:[\s.]\d{3})*[,.]\d{2})/i,
    /(?:kwota|total)\s*[:=]?\s*(\d{1,4}(?:[\s.]\d{3})*[,.]\d{2})/i,
  ];

  for (const line of lines) {
    for (const pattern of priorityPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const val = normalizePrice(match[1]);
        if (val && val > 0) return val;
      }
    }
  }

  // Priority 2: Scan whole text if lines didn't catch multiline wrapping
  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = normalizePrice(match[1]);
      if (val && val > 0) return val;
    }
  }

  // Priority 3: Check for lines ending with PLN / ZŁ
  const plnMatches = text.matchAll(/(\d{1,4}(?:[\s.]\d{3})*[,.]\d{2})\s*(?:pln|zł)/gi);
  const foundPrices: number[] = [];
  for (const m of plnMatches) {
    const val = normalizePrice(m[1]);
    if (val && val > 0) foundPrices.push(val);
  }

  if (foundPrices.length > 0) {
    // Usually the total is the maximum or last price mentioned on the receipt
    return Math.max(...foundPrices);
  }

  return null;
}

/**
 * Extracts receipt / invoice date into standard YYYY-MM-DD.
 */
export function extractReceiptDate(text: string): string | null {
  // Pattern 1: YYYY-MM-DD or YYYY.MM.DD
  const ymdMatch = text.match(/\b(202\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  // Pattern 2: DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](202\d)\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  return null;
}

/**
 * Detects home improvement store from receipt header.
 */
export function detectStore(text: string): { name: string; defaultCategory: ExpenseCategory } | null {
  const lower = text.toLowerCase();
  for (const store of KNOWN_STORES) {
    for (const kw of store.keywords) {
      if (kw.length <= 3) {
        const regex = new RegExp(`(?:^|[^a-ząćęłńóśźż0-9])${kw}(?:[^a-ząćęłńóśźż0-9]|$)`, 'i');
        if (regex.test(text)) {
          return { name: store.name, defaultCategory: store.defaultCategory };
        }
      } else if (lower.includes(kw.toLowerCase())) {
        return { name: store.name, defaultCategory: store.defaultCategory };
      }
    }
  }
  return null;
}

/**
 * Detects invoice or receipt number.
 */
export function extractReceiptNumber(text: string): string | null {
  // e.g. "Faktura VAT 123/2026", "Nr paragonu 000452", "F-RA: FS/01/2026"
  const patterns = [
    /(?:faktura\s*vat|faktura|f-ra)\s*[:#№]?\s*([A-Za-z0-9\/-]+)/i,
    /(?:paragon\s*fiskalny|paragon|par)\s*(?:nr|numer)?\s*[:#№]?\s*([A-Za-z0-9\/-]+)/i,
    /(?:nr\s*wydruku|wydruk\s*nr)\s*[:#№]?\s*([0-9\/-]+)/i,
    /\b(FS\s*[\d]+\/[\d]+\/[\d]+)\b/i,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match && match[1] && match[1].trim().length >= 3) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Detects payment method mentioned in receipt.
 */
export function detectPaymentMethod(text: string): Expense['paymentMethod'] {
  const lower = text.toLowerCase();
  if (lower.includes('blik')) return 'BLIK';
  if (lower.includes('karta') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('karty płatniczej')) {
    return 'Karta / Przelew';
  }
  if (lower.includes('gotówka') || lower.includes('gotowka') || lower.includes('reszta')) {
    return 'Gotówka';
  }
  if (lower.includes('przelew') || lower.includes('faktura terminowa')) {
    return 'Faktura terminowa';
  }
  return 'Karta / Przelew';
}

/**
 * Comprehensive parser of receipt text (e.g. pasted, OCR, or scanned).
 */
export function parseReceiptText(text: string): ParsedReceiptData {
  if (!text || !text.trim()) {
    return { confidence: 'low' };
  }

  const storeInfo = detectStore(text);
  const totalAmount = extractTotalAmount(text);
  const date = extractReceiptDate(text);
  const receiptNumber = extractReceiptNumber(text);
  const paymentMethod = detectPaymentMethod(text);

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (totalAmount && date && storeInfo) {
    confidence = 'high';
  } else if (totalAmount || (date && storeInfo)) {
    confidence = 'medium';
  }

  let defaultCategory: ExpenseCategory = 'Materiały budowlane';
  if (storeInfo?.defaultCategory) {
    defaultCategory = storeInfo.defaultCategory;
  } else if (text.toLowerCase().includes('narzędz') || text.toLowerCase().includes('wiertark')) {
    defaultCategory = 'Narzędzia i sprzęt';
  } else if (text.toLowerCase().includes('farb') || text.toLowerCase().includes('panele') || text.toLowerCase().includes('lampa')) {
    defaultCategory = 'Wykończenie i dekoracje';
  }

  return {
    storeName: storeInfo?.name,
    totalAmount: totalAmount ?? undefined,
    date: date ?? undefined,
    receiptNumber: receiptNumber ?? undefined,
    category: defaultCategory,
    paymentMethod,
    rawText: text.trim(),
    confidence,
  };
}

/**
 * Helper to scan an image via browser BarcodeDetector if available (e.g. Polish fiscal QR code).
 * MF QR Code standard contains comma-delimited: NIP, Date, Time, Number, Gross Amount, etc.
 */
export async function tryScanFiscalQRCode(fileOrBlob: Blob | File): Promise<ParsedReceiptData | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }

  try {
    const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: ImageBitmap) => Promise<{ rawValue?: string }[]> } }).BarcodeDetector;
    const detector = new BarcodeDetectorClass({ formats: ['qr_code', 'data_matrix'] });

    const img = await createImageBitmap(fileOrBlob);
    const barcodes = await detector.detect(img);

    if (barcodes && barcodes.length > 0) {
      for (const barcode of barcodes) {
        const raw = barcode.rawValue;
        if (raw) {
          const parsed = parseReceiptText(raw);
          if (parsed.totalAmount || parsed.date) {
            return {
              ...parsed,
              confidence: 'high',
            };
          }
        }
      }
    }
  } catch (err) {
    console.debug('BarcodeDetector attempt non-critical error:', err);
  }

  return null;
}
