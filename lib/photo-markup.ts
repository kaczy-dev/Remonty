/**
 * Foto-Wymiarowanie (Photo Markup & Dimensioning)
 * Modele i funkcje pomocnicze do nanoszenia wymiarów i znaczników instalacyjnych na zdjęcia budowlane.
 */

export type PinType =
  | 'socket_230v'
  | 'socket_400v'
  | 'switch'
  | 'light'
  | 'water_in'
  | 'water_out'
  | 'radiator'
  | 'vent'
  | 'issue'
  | 'note';

export interface DimensionLine {
  id: string;
  x1: number; // 0..1 znormalizowana pozycja X początku
  y1: number; // 0..1 znormalizowana pozycja Y początku
  x2: number; // 0..1 znormalizowana pozycja X końca
  y2: number; // 0..1 znormalizowana pozycja Y końca
  value: string; // np. "2.45 m" lub "60 cm"
  label?: string; // np. "Szerokość wnęki"
  color: string;
}

export interface InstallationPin {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  type: PinType;
  label: string;
  color: string;
}

export interface PhotoMarkupData {
  dimensions: DimensionLine[];
  pins: InstallationPin[];
}

export const PIN_CONFIG: Record<
  PinType,
  { label: string; iconSymbol: string; defaultColor: string; category: string }
> = {
  socket_230v: {
    label: 'Gniazdo 230V',
    iconSymbol: '⚡',
    defaultColor: '#f59e0b', // bursztynowy
    category: 'Elektryka',
  },
  socket_400v: {
    label: 'Siła 400V (Indukcja)',
    iconSymbol: '⚡⚡',
    defaultColor: '#ef4444', // czerwony
    category: 'Elektryka',
  },
  switch: {
    label: 'Włącznik światła',
    iconSymbol: '💡',
    defaultColor: '#fbbf24',
    category: 'Elektryka',
  },
  light: {
    label: 'Punkt oświetleniowy',
    iconSymbol: '✨',
    defaultColor: '#eab308',
    category: 'Elektryka',
  },
  water_in: {
    label: 'Podejście wody (Z/C)',
    iconSymbol: '💧',
    defaultColor: '#0ea5e9', // błękitny
    category: 'Hydraulika',
  },
  water_out: {
    label: 'Odpływ kanalizacyjny',
    iconSymbol: '🚿',
    defaultColor: '#06b6d4',
    category: 'Hydraulika',
  },
  radiator: {
    label: 'Grzejnik / C.O.',
    iconSymbol: '🔥',
    defaultColor: '#f97316',
    category: 'Instalacje',
  },
  vent: {
    label: 'Kratka wentylacyjna',
    iconSymbol: '❄️',
    defaultColor: '#64748b',
    category: 'Instalacje',
  },
  issue: {
    label: 'Usterka / Nierówność',
    iconSymbol: '⚠️',
    defaultColor: '#dc2626',
    category: 'Inspekcja',
  },
  note: {
    label: 'Notatka na ścianie',
    iconSymbol: '📝',
    defaultColor: '#10b981',
    category: 'Ogólne',
  },
};

/**
 * Oblicza odległość euklidesową pomiędzy dwoma znormalizowanymi punktami.
 */
export function calculateNormalizedDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Generuje unikalny identyfikator elementu
 */
export function generateElementId(prefix = 'elem'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Rysuje wektorową strzałkę wymiarową na kontekście Canvas 2D
 */
export function renderDimensionLineToCanvas(
  ctx: CanvasRenderingContext2D,
  line: DimensionLine,
  canvasWidth: number,
  canvasHeight: number
): void {
  const startX = line.x1 * canvasWidth;
  const startY = line.y1 * canvasHeight;
  const endX = line.x2 * canvasWidth;
  const endY = line.y2 * canvasHeight;

  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 5) return;

  ctx.save();
  ctx.strokeStyle = line.color || '#14b8a6';
  ctx.fillStyle = line.color || '#14b8a6';
  ctx.lineWidth = Math.max(3, Math.round(canvasWidth * 0.003));
  ctx.lineCap = 'round';

  // Główna linia
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Groty strzałek (na początku i końcu)
  const arrowHeadSize = Math.max(12, Math.round(canvasWidth * 0.012));

  // Grot początkowy
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(
    startX + arrowHeadSize * Math.cos(angle + Math.PI / 6),
    startY + arrowHeadSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.moveTo(startX, startY);
  ctx.lineTo(
    startX + arrowHeadSize * Math.cos(angle - Math.PI / 6),
    startY + arrowHeadSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.stroke();

  // Grot końcowy
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
    endY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
    endY - arrowHeadSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.stroke();

  // Etykieta wymiaru w centrum linii
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const text = line.label ? `${line.label}: ${line.value}` : line.value;
  const fontSize = Math.max(14, Math.round(canvasWidth * 0.016));
  ctx.font = `bold ${fontSize}px sans-serif`;

  const textMetrics = ctx.measureText(text);
  const textW = textMetrics.width;
  const paddingX = 8;
  const paddingY = 4;
  const boxH = fontSize + paddingY * 2;
  const boxW = textW + paddingX * 2;

  // Tło etykiety dla maksymalnego kontrastu na budowie
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // ciemny slate
  ctx.strokeStyle = line.color || '#14b8a6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH, 6);
  } else {
    ctx.rect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
  }
  ctx.fill();
  ctx.stroke();

  // Tekst wymiaru
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, midX, midY);

  ctx.restore();
}

/**
 * Rysuje znacznik instalacyjny na kontekście Canvas 2D
 */
export function renderPinToCanvas(
  ctx: CanvasRenderingContext2D,
  pin: InstallationPin,
  canvasWidth: number,
  canvasHeight: number
): void {
  const px = pin.x * canvasWidth;
  const py = pin.y * canvasHeight;
  const config = PIN_CONFIG[pin.type] || PIN_CONFIG.note;
  const pinColor = pin.color || config.defaultColor;

  ctx.save();

  const radius = Math.max(16, Math.round(canvasWidth * 0.018));

  // Cień znacznika
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  // Koło z tłem
  ctx.fillStyle = pinColor;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Symbol / Ikona wewnątrz
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const iconSize = Math.round(radius * 1.1);
  ctx.font = `${iconSize}px sans-serif`;
  ctx.fillText(config.iconSymbol, px, py);

  // Etykieta pod znacznikiem
  if (pin.label) {
    const fontSize = Math.max(12, Math.round(canvasWidth * 0.013));
    ctx.font = `600 ${fontSize}px sans-serif`;
    const metrics = ctx.measureText(pin.label);
    const boxW = metrics.width + 12;
    const boxH = fontSize + 8;
    const labelY = py + radius + 12;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = pinColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(px - boxW / 2, labelY - boxH / 2, boxW, boxH, 4);
    } else {
      ctx.rect(px - boxW / 2, labelY - boxH / 2, boxW, boxH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(pin.label, px, labelY);
  }

  ctx.restore();
}

/**
 * Renderuje pełne zdjęcie z naniesionymi wymiarami i znacznikami na element Canvas
 * i zwraca jako Blob JPEG gotowy do pobrania lub udostępnienia.
 */
export async function exportMarkedPhotoBlob(
  imageElement: HTMLImageElement,
  data: PhotoMarkupData,
  quality = 0.92
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.naturalWidth || imageElement.width || 1920;
  canvas.height = imageElement.naturalHeight || imageElement.height || 1080;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Nie udało się utworzyć kontekstu 2D dla Canvas');

  // Narysuj bazowe zdjęcie
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  // Narysuj wszystkie linie wymiarowe
  for (const line of data.dimensions) {
    renderDimensionLineToCanvas(ctx, line, canvas.width, canvas.height);
  }

  // Narysuj wszystkie pinezki instalacyjne
  for (const pin of data.pins) {
    renderPinToCanvas(ctx, pin, canvas.width, canvas.height);
  }

  // Dodaj dyskretny znak wodny z datą pomiaru
  ctx.save();
  const dateStr = new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const watermarkText = `Remonty • Obmiar budowlany (${dateStr})`;
  ctx.font = `500 ${Math.max(12, Math.round(canvas.width * 0.011))}px sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.textAlign = 'right';
  ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Błąd generowania pliku graficznego z Canvas'));
      },
      'image/jpeg',
      quality
    );
  });
}
