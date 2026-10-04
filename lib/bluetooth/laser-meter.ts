/**
 * Web Bluetooth API - Obsługa Dalmierzy Laserowych (Laser Distance Meters)
 * Wspiera protokoły: Leica DISTO, Bosch Professional GLM/PLR, Nordic UART (MiLESEEY, SNDWAY)
 * oraz uniwersalny parser ASCII/Float.
 */

// UUID serwisów dla popularnych dalmierzy BLE
export const BLE_SERVICES = {
  // Leica DISTO (D1, D2, D110, X3, X4)
  LEICA_DISTO_SERVICE: '3ab10100-f831-4395-b29d-570977d5bf94',
  LEICA_DISTO_CHAR_DISTANCE: '3ab10101-f831-4395-b29d-570977d5bf94',

  // Bosch Professional & Home (GLM 50 C, GLM 100 C, GLM 120 C, PLR 30 C, PLR 50 C)
  BOSCH_GLM_SERVICE: '00000001-0000-1000-8000-00805f9b34fb',
  BOSCH_GLM_CHAR_DATA: '00000002-0000-1000-8000-00805f9b34fb',

  // Nordic UART Service (Popularne w MiLESEEY, SNDWAY, Parkside BLE)
  NORDIC_UART_SERVICE: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  NORDIC_UART_CHAR_TX: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  NORDIC_UART_CHAR_RX: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',

  // Standardowe serwisy BLE
  GENERIC_ACCESS: 0x1800,
  DEVICE_INFORMATION: 0x180a,
} as const;

export type LaserMeterBrand = 'leica' | 'bosch' | 'nordic_uart' | 'generic' | 'simulator';

export interface LaserMeasurementEvent {
  distanceMeters: number;
  rawBytes?: Uint8Array;
  timestamp: number;
  deviceName?: string;
  brand?: LaserMeterBrand;
}

/**
 * Sprawdza czy bieżąca przeglądarka wspiera Web Bluetooth API.
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Odtwarza charakterystyczny podwójny dźwięk potwierdzenia pomiaru (880Hz -> 1760Hz)
 * przydatny na budowie, gdy telefon leży na skrzynce z narzędziami.
 */
export function playMeasurementBeep(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now + 0.09);
    gain2.gain.setValueAtTime(0.2, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.22);
  } catch {
    // Ignoruj błędy audio kontekstu (np. brak interakcji użytkownika)
  }
}

/**
 * Wywołuje wibrację haptyczną potwierdzającą odbiór pomiaru.
 */
export function triggerHapticFeedback(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 30, 60]);
    } catch {
      // Ignoruj
    }
  }
}

/**
 * Dekoder pakietu danych Leica DISTO (32-bit float Little Endian w metrach).
 */
export function parseLeicaDistoPacket(dataView: DataView): number | null {
  if (dataView.byteLength < 4) return null;
  // Leica wysyła odległość jako IEEE 754 float little endian
  const distance = dataView.getFloat32(0, true);
  if (isNaN(distance) || distance <= 0 || distance > 200) {
    return null;
  }
  return Number(distance.toFixed(4));
}

/**
 * Dekoder pakietu danych Bosch GLM (format komendy pomiaru).
 * W zależności od wersji firmware:
 * - 4-bajtowy uint32 (jednostka 0.05 mm lub 0.1 mm)
 * - lub IEEE float32
 */
export function parseBoschGlmPacket(dataView: DataView): number | null {
  if (dataView.byteLength < 4) return null;

  // Sprawdź czy to nagłówek pakietu Bosch (np. 0xC0 lub 0x3B w bajcie 0)
  if (dataView.byteLength >= 7 && dataView.getUint8(0) === 0xc0) {
    // Odległość zazwyczaj na pozycjach 3..6 w 0.05 mm
    const rawVal = dataView.getUint32(3, true);
    const distanceMeters = (rawVal * 0.05) / 1000;
    if (distanceMeters > 0.05 && distanceMeters < 250) {
      return Number(distanceMeters.toFixed(4));
    }
  }

  // Fallback 1: Float32 little-endian
  const asFloat = dataView.getFloat32(0, true);
  if (!isNaN(asFloat) && asFloat > 0.05 && asFloat < 250) {
    return Number(asFloat.toFixed(4));
  }

  // Fallback 2: Uint32 w mm
  const asMm = dataView.getUint32(0, true) / 1000;
  if (asMm > 0.05 && asMm < 250) {
    return Number(asMm.toFixed(4));
  }

  return null;
}

/**
 * Dekoder strumienia znakowego ASCII (Nordic UART, MiLESEEY, SNDWAY, Parkside).
 * Np. "12.345m\r\n", "D: 3.421m", "4250mm"
 */
export function parseAsciiDistanceString(text: string): number | null {
  const clean = text.trim();
  // Szukaj liczby z jednostką m lub mm
  const mmMatch = clean.match(/([0-9]+(?:[.,][0-9]+)?)\s*mm/i);
  if (mmMatch) {
    const val = parseFloat(mmMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return Number((val / 1000).toFixed(4));
  }

  const mMatch = clean.match(/([0-9]+(?:[.,][0-9]+)?)\s*m?/i);
  if (mMatch) {
    const val = parseFloat(mMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0.01 && val < 300) {
      return Number(val.toFixed(4));
    }
  }

  return null;
}

/**
 * Uniwersalny dekoder bufora danych dalmierza BLE.
 */
export function decodeLaserDataView(dataView: DataView, deviceName?: string): number | null {
  const name = (deviceName || '').toLowerCase();

  if (name.includes('disto')) {
    const leicaVal = parseLeicaDistoPacket(dataView);
    if (leicaVal !== null) return leicaVal;
  }

  if (name.includes('bosch') || name.includes('glm') || name.includes('plr')) {
    const boschVal = parseBoschGlmPacket(dataView);
    if (boschVal !== null) return boschVal;
  }

  // Spróbuj odkodować jako string ASCII
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(dataView);
    const asciiVal = parseAsciiDistanceString(text);
    if (asciiVal !== null) return asciiVal;
  } catch {
    // Ignoruj błąd dekodera
  }

  // Spróbuj formatu Leica
  const leicaFallback = parseLeicaDistoPacket(dataView);
  if (leicaFallback !== null) return leicaFallback;

  // Spróbuj formatu Bosch
  const boschFallback = parseBoschGlmPacket(dataView);
  if (boschFallback !== null) return boschFallback;

  return null;
}

export interface BluetoothConnectionOptions {
  onMeasurement: (event: LaserMeasurementEvent) => void;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error') => void;
  onError?: (error: Error) => void;
  playBeep?: boolean;
  haptic?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

/**
 * Klasa zarządzająca połączeniem BLE z dalmierzem laserowym.
 */
export class BluetoothLaserMeterClient {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;
  private isConnected = false;
  private isReconnecting = false;
  private manualDisconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private options: BluetoothConnectionOptions;

  constructor(options: BluetoothConnectionOptions) {
    this.options = {
      playBeep: true,
      haptic: true,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getReconnecting(): boolean {
    return this.isReconnecting;
  }

  public getDeviceName(): string | null {
    return this.device?.name || null;
  }

  /**
   * Otwiera natywny selektor urządzeń Bluetooth w przeglądarce i łączy się z dalmierzem.
   */
  public async connect(): Promise<boolean> {
    if (!isWebBluetoothSupported()) {
      const err = new Error('Web Bluetooth API nie jest obsługiwane w tej przeglądarce. Użyj Chrome lub Edge na Androidzie/PC.');
      this.options.onError?.(err);
      this.options.onStatusChange?.('error');
      return false;
    }

    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    try {
      this.options.onStatusChange?.('connecting');

      // Filtry dla znanych marek dalmierzy oraz opcja acceptAllDevices
      const nav = navigator as any;
      this.device = await nav.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'DISTO' },
          { namePrefix: 'Bosch' },
          { namePrefix: 'GLM' },
          { namePrefix: 'PLR' },
          { namePrefix: 'Mileseey' },
          { namePrefix: 'SNDWAY' },
          { services: [BLE_SERVICES.LEICA_DISTO_SERVICE] },
          { services: [BLE_SERVICES.BOSCH_GLM_SERVICE] },
          { services: [BLE_SERVICES.NORDIC_UART_SERVICE] },
        ],
        optionalServices: [
          BLE_SERVICES.LEICA_DISTO_SERVICE,
          BLE_SERVICES.BOSCH_GLM_SERVICE,
          BLE_SERVICES.NORDIC_UART_SERVICE,
          'generic_access',
          'device_information',
        ],
      });

      if (!this.device) {
        this.options.onStatusChange?.('disconnected');
        return false;
      }

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      this.server = await this.device.gatt.connect();

      // Przeszukaj usługi i podepnij nasłuchiwanie notyfikacji
      await this.setupNotifications();

      this.isConnected = true;
      this.options.onStatusChange?.('connected');

      if (this.options.playBeep) playMeasurementBeep();
      if (this.options.haptic) triggerHapticFeedback();

      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // Użytkownik anulował okno wyboru
        this.options.onStatusChange?.('disconnected');
        return false;
      }
      this.options.onError?.(err);
      this.options.onStatusChange?.('error');
      return false;
    }
  }

  private async setupNotifications(): Promise<void> {
    if (!this.server) return;

    // Próba podpięcia Leica DISTO
    try {
      const leicaService = await this.server.getPrimaryService(BLE_SERVICES.LEICA_DISTO_SERVICE);
      const char = await leicaService.getCharacteristic(BLE_SERVICES.LEICA_DISTO_CHAR_DISTANCE);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e: any) => this.handleCharacteristicValueChanged(e, 'leica'));
      this.characteristic = char;
      return;
    } catch {
      // Szukaj innych serwisów
    }

    // Próba podpięcia Bosch GLM
    try {
      const boschService = await this.server.getPrimaryService(BLE_SERVICES.BOSCH_GLM_SERVICE);
      const char = await boschService.getCharacteristic(BLE_SERVICES.BOSCH_GLM_CHAR_DATA);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e: any) => this.handleCharacteristicValueChanged(e, 'bosch'));
      this.characteristic = char;
      return;
    } catch {
      // Szukaj dalej
    }

    // Próba podpięcia Nordic UART (MiLESEEY / SNDWAY)
    try {
      const nusService = await this.server.getPrimaryService(BLE_SERVICES.NORDIC_UART_SERVICE);
      const char = await nusService.getCharacteristic(BLE_SERVICES.NORDIC_UART_CHAR_TX);
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (e: any) => this.handleCharacteristicValueChanged(e, 'nordic_uart'));
      this.characteristic = char;
      return;
    } catch {
      // Brak pasującego serwisu
    }
  }

  private handleCharacteristicValueChanged(event: any, brand: LaserMeterBrand): void {
    const value: DataView = event.target.value;
    if (!value) return;

    const distance = decodeLaserDataView(value, this.device?.name);
    if (distance !== null && distance > 0) {
      if (this.options.playBeep) playMeasurementBeep();
      if (this.options.haptic) triggerHapticFeedback();

      this.options.onMeasurement({
        distanceMeters: distance,
        timestamp: Date.now(),
        deviceName: this.device?.name || 'Dalmierz Laserowy',
        brand,
      });
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.characteristic = null;
    this.server = null;

    if (this.manualDisconnect) {
      this.isReconnecting = false;
      this.options.onStatusChange?.('disconnected');
      return;
    }

    const shouldAutoReconnect = this.options.autoReconnect ?? true;
    const maxAttempts = this.options.maxReconnectAttempts ?? 5;

    if (shouldAutoReconnect && this.device && this.reconnectAttempts < maxAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      this.options.onStatusChange?.('reconnecting');
      const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts - 1));

      this.reconnectTimeoutId = setTimeout(async () => {
        if (this.manualDisconnect) return;
        try {
          if (!this.device?.gatt) throw new Error('Brak interfejsu GATT');
          this.server = await this.device.gatt.connect();
          await this.setupNotifications();
          this.isConnected = true;
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          this.options.onStatusChange?.('connected');
          if (this.options.playBeep) playMeasurementBeep();
        } catch {
          if (!this.manualDisconnect) {
            this.handleDisconnect();
          }
        }
      }, delay);
    } else {
      this.isReconnecting = false;
      this.options.onStatusChange?.('disconnected');
    }
  }

  public disconnect(): void {
    this.manualDisconnect = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  /**
   * Symuluje pomiar dalmierza (przydatne do testowania i demonstracji bez fizycznego sprzętu).
   */
  public simulateMeasurement(distanceMeters: number): void {
    if (this.options.playBeep) playMeasurementBeep();
    if (this.options.haptic) triggerHapticFeedback();

    this.options.onMeasurement({
      distanceMeters: Number(distanceMeters.toFixed(3)),
      timestamp: Date.now(),
      deviceName: 'Symulator Dalmierza BLE',
      brand: 'simulator',
    });
  }
}
