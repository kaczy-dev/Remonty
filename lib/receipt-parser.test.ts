import { describe, it, expect } from 'vitest';
import {
  normalizePrice,
  extractTotalAmount,
  extractReceiptDate,
  detectStore,
  extractReceiptNumber,
  detectPaymentMethod,
  parseReceiptText,
} from './receipt-parser';

describe('receipt-parser', () => {
  describe('normalizePrice', () => {
    it('handles commas and spaces', () => {
      expect(normalizePrice('1 450,99')).toBe(1450.99);
      expect(normalizePrice('1.450,99')).toBe(1450.99);
      expect(normalizePrice('1,450.99')).toBe(1450.99);
      expect(normalizePrice('12.350,50 zł')).toBe(12350.50);
      expect(normalizePrice('35,50')).toBe(35.50);
      expect(normalizePrice('100')).toBe(100);
      expect(normalizePrice('invalid')).toBeNull();
    });
  });

  describe('extractTotalAmount', () => {
    it('extracts SUMA PLN pattern', () => {
      const sample = `
        CASTORAMA POLSKA SP. Z O.O.
        Klej Atlas Plus 25kg  2x 54.90 = 109.80
        Fuga epoksydowa 2kg   1x 89.00 = 89.00
        SUMA PLN 198,80
        ROZLICZENIE PŁATNOŚCI KARTĄ
      `;
      expect(extractTotalAmount(sample)).toBe(198.80);
    });

    it('extracts RAZEM and DO ZAPŁATY pattern', () => {
      const sample = `
        LEROY MERLIN POLSKA
        Grunt głęboko penetrujący 5L 45.00
        DO ZAPŁATY: 45,00 PLN
      `;
      expect(extractTotalAmount(sample)).toBe(45.00);
    });

    it('extracts large sum with thousands separator', () => {
      const sample = `
        OBI MARKET
        Panele podłogowe AC5 Dąb 40m2
        SUMA: 3 850,50 ZŁ
      `;
      expect(extractTotalAmount(sample)).toBe(3850.50);
    });
  });

  describe('extractReceiptDate', () => {
    it('extracts YYYY-MM-DD', () => {
      const text = 'Data sprzedaży: 2026-03-14 14:22 Nr kasy: 04';
      expect(extractReceiptDate(text)).toBe('2026-03-14');
    });

    it('extracts DD.MM.YYYY and converts to ISO YYYY-MM-DD', () => {
      const text = 'Data: 05.02.2026 Paragon fiskalny';
      expect(extractReceiptDate(text)).toBe('2026-02-05');
    });

    it('extracts DD-MM-YYYY', () => {
      const text = 'Dnia 28-01-2026 godzina 11:30';
      expect(extractReceiptDate(text)).toBe('2026-01-28');
    });
  });

  describe('detectStore and categories', () => {
    it('detects Castorama as building materials', () => {
      const text = 'Witamy w Castorama Warszawa Targówek';
      const store = detectStore(text);
      expect(store?.name).toBe('Castorama');
      expect(store?.defaultCategory).toBe('Materiały budowlane');
    });

    it('detects Jula as tools and equipment', () => {
      const text = 'Jula Poland Sp. z o.o.';
      const store = detectStore(text);
      expect(store?.name).toBe('Jula');
      expect(store?.defaultCategory).toBe('Narzędzia i sprzęt');
    });

    it('detects IKEA as finishing and decor', () => {
      const text = 'IKEA Retail Sp. z o.o.';
      const store = detectStore(text);
      expect(store?.name).toBe('IKEA');
      expect(store?.defaultCategory).toBe('Wykończenie i dekoracje');
    });

    it('detects OBI store and does not match unrelated words', () => {
      const textObi = 'OBI SP. Z O.O. WARSZAWA';
      const store = detectStore(textObi);
      expect(store?.name).toBe('OBI');
      expect(store?.defaultCategory).toBe('Materiały budowlane');

      const falsePositive = 'Kobieta kupiła farby';
      expect(detectStore(falsePositive)).toBeNull();
    });
  });

  describe('extractReceiptNumber', () => {
    it('extracts VAT invoice number', () => {
      const text = 'Faktura VAT 1284/03/2026 Data wystawienia: 2026-03-12';
      expect(extractReceiptNumber(text)).toBe('1284/03/2026');
    });

    it('extracts fiscal receipt number', () => {
      const text = 'Paragon fiskalny nr 003921 Kasjer: 12';
      expect(extractReceiptNumber(text)).toBe('003921');
    });
  });

  describe('detectPaymentMethod', () => {
    it('detects BLIK', () => {
      expect(detectPaymentMethod('Płatność kodem BLIK zaakceptowana')).toBe('BLIK');
    });

    it('detects card payments', () => {
      expect(detectPaymentMethod('Płatność kartą VISA zbliżeniowo')).toBe('Karta / Przelew');
    });

    it('detects cash', () => {
      expect(detectPaymentMethod('Płatność gotówką. Wydana reszta: 10,00')).toBe('Gotówka');
    });
  });

  describe('parseReceiptText end-to-end', () => {
    it('parses realistic Castorama fiscal receipt text', () => {
      const receipt = `
        CASTORAMA POLSKA SP. Z O.O.
        Al. Krakowska 75, Warszawa
        NIP: 526-10-09-524
        2026-03-18 16:42
        PARAGON FISKALNY NR 004921
        Profil CD60 3mb 10szt x 18.50 = 185.00
        Wkręty do g-k 1op = 29.90
        SUMA PLN 214,90
        PŁATNOŚĆ KARTĄ
        DZIĘKUJEMY I ZAPRASZAMY PONOWNIE
      `;

      const res = parseReceiptText(receipt);
      expect(res.storeName).toBe('Castorama');
      expect(res.totalAmount).toBe(214.90);
      expect(res.date).toBe('2026-03-18');
      expect(res.receiptNumber).toBe('004921');
      expect(res.category).toBe('Materiały budowlane');
      expect(res.paymentMethod).toBe('Karta / Przelew');
      expect(res.confidence).toBe('high');
    });
  });
});
