import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  ArrowRightLeft,
  MapPin,
  Undo2,
  Trash2,
  Download,
  Share2,
  Copy,
  Check,
  Bluetooth,
  Save,
  Tag,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DimensionLine,
  InstallationPin,
  PhotoMarkupData,
  PinType,
  PIN_CONFIG,
  generateElementId,
  renderDimensionLineToCanvas,
  renderPinToCanvas,
  exportMarkedPhotoBlob,
} from '@/lib/photo-markup';
import { LaserMeterModal } from './LaserMeterModal';

interface PhotoMarkupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhotoUrl?: string | null;
  onSaveToProject?: (photoBlob: Blob, markupData: PhotoMarkupData) => void;
  roomName?: string;
}

export const PhotoMarkupModal: React.FC<PhotoMarkupModalProps> = ({
  isOpen,
  onClose,
  initialPhotoUrl,
  onSaveToProject,
  roomName = 'Pokój',
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [activeTool, setActiveTool] = useState<'dimension' | 'pin' | 'select'>('dimension');
  const [selectedPinType, setSelectedPinType] = useState<PinType>('socket_230v');
  const [dimensions, setDimensions] = useState<DimensionLine[]>([]);
  const [pins, setPins] = useState<InstallationPin[]>([]);
  const [history, setHistory] = useState<Array<{ dimensions: DimensionLine[]; pins: InstallationPin[] }>>([]);

  // Rysowanie nowej linii
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentLine, setCurrentLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Edycja aktywnego elementu
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('1.00 m');
  const [editLabel, setEditLabel] = useState<string>('');

  // Statusy eksportu
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showLaserModal, setShowLaserModal] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
    }
  }, [initialPhotoUrl]);

  // Zapisz stan do historii przed modyfikacją
  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-15), { dimensions: [...dimensions], pins: [...pins] }]);
  }, [dimensions, pins]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setDimensions(previous.dimensions);
    setPins(previous.pins);
    setSelectedElementId(null);
  };

  const handleClear = () => {
    if (dimensions.length === 0 && pins.length === 0) return;
    pushHistory();
    setDimensions([]);
    setPins([]);
    setSelectedElementId(null);
  };

  // Re-renderowanie canvasu nakładki
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rysuj zatwierdzone linie wymiarowe
    for (const line of dimensions) {
      renderDimensionLineToCanvas(ctx, line, canvas.width, canvas.height);

      // Zaznaczenie aktywnej linii
      if (line.id === selectedElementId) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(line.x1 * canvas.width, line.y1 * canvas.height, 8, 0, Math.PI * 2);
        ctx.arc(line.x2 * canvas.width, line.y2 * canvas.height, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Rysuj aktualnie ciągniętą linię
    if (isDrawing && currentLine) {
      renderDimensionLineToCanvas(
        ctx,
        {
          id: 'temp',
          x1: currentLine.x1,
          y1: currentLine.y1,
          x2: currentLine.x2,
          y2: currentLine.y2,
          value: editValue || '---',
          label: editLabel,
          color: '#2dd4bf',
        },
        canvas.width,
        canvas.height
      );
    }

    // Rysuj zatwierdzone pinezki
    for (const pin of pins) {
      renderPinToCanvas(ctx, pin, canvas.width, canvas.height);

      if (pin.id === selectedElementId) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pin.x * canvas.width, pin.y * canvas.height, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [dimensions, pins, isDrawing, currentLine, editValue, editLabel, selectedElementId]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Dopasowanie rozmiaru Canvas do załadowanego obrazka
  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (img && canvas) {
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      redrawCanvas();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      handleImageLoad();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Obliczenie znormalizowanych współrzędnych kliknięcia (0..1)
  const getNormalizedCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Obsługa kliknięć i rysowania
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getNormalizedCoords(e);

    if (activeTool === 'dimension') {
      setIsDrawing(true);
      setDrawingStart({ x, y });
      setCurrentLine({ x1: x, y1: y, x2: x, y2: y });
    } else if (activeTool === 'pin') {
      pushHistory();
      const config = PIN_CONFIG[selectedPinType];
      const newPin: InstallationPin = {
        id: generateElementId('pin'),
        x,
        y,
        type: selectedPinType,
        label: config.label,
        color: config.defaultColor,
      };
      setPins((prev) => [...prev, newPin]);
      setSelectedElementId(newPin.id);
      setEditLabel(newPin.label);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingStart) return;
    const { x, y } = getNormalizedCoords(e);
    setCurrentLine({
      x1: drawingStart.x,
      y1: drawingStart.y,
      x2: x,
      y2: y,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentLine) return;
    setIsDrawing(false);

    const dx = currentLine.x2 - currentLine.x1;
    const dy = currentLine.y2 - currentLine.y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Jeśli linia jest za krótka, zignoruj
    if (dist > 0.03) {
      pushHistory();
      const newLine: DimensionLine = {
        id: generateElementId('dim'),
        x1: currentLine.x1,
        y1: currentLine.y1,
        x2: currentLine.x2,
        y2: currentLine.y2,
        value: editValue || '1.00 m',
        label: editLabel || 'Wymiar',
        color: '#14b8a6',
      };
      setDimensions((prev) => [...prev, newLine]);
      setSelectedElementId(newLine.id);
    }

    setDrawingStart(null);
    setCurrentLine(null);
  };

  // Aktualizacja wartości aktywnego elementu
  const handleUpdateActiveValue = (val: string) => {
    setEditValue(val);
    if (!selectedElementId) return;
    setDimensions((prev) =>
      prev.map((d) => (d.id === selectedElementId ? { ...d, value: val } : d))
    );
  };

  const handleUpdateActiveLabel = (lbl: string) => {
    setEditLabel(lbl);
    if (!selectedElementId) return;
    setDimensions((prev) =>
      prev.map((d) => (d.id === selectedElementId ? { ...d, label: lbl } : d))
    );
    setPins((prev) =>
      prev.map((p) => (p.id === selectedElementId ? { ...p, label: lbl } : p))
    );
  };

  // Usunięcie aktywnego elementu
  const handleDeleteActiveElement = () => {
    if (!selectedElementId) return;
    pushHistory();
    setDimensions((prev) => prev.filter((d) => d.id !== selectedElementId));
    setPins((prev) => prev.filter((p) => p.id !== selectedElementId));
    setSelectedElementId(null);
  };

  // Wgranie nowego zdjęcia
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      setDimensions([]);
      setPins([]);
      setHistory([]);
      setSelectedElementId(null);
    }
  };

  // Zapisz do projektu
  const handleSaveToProject = async () => {
    if (!imageRef.current) return;
    try {
      const blob = await exportMarkedPhotoBlob(imageRef.current, { dimensions, pins });
      onSaveToProject?.(blob, { dimensions, pins });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Błąd zapisu zdjęcia z wymiarami:', err);
    }
  };

  // Pobierz obraz jako plik JPG
  const handleDownloadImage = async () => {
    if (!imageRef.current) return;
    try {
      const blob = await exportMarkedPhotoBlob(imageRef.current, { dimensions, pins });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obmiar-foto-${roomName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Błąd pobierania zdjęcia:', err);
    }
  };

  // Kopiuj do schowka jako obrazek
  const handleCopyToClipboard = async () => {
    if (!imageRef.current || !navigator.clipboard) return;
    try {
      const blob = await exportMarkedPhotoBlob(imageRef.current, { dimensions, pins });
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/jpeg': blob,
        }),
      ]);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (err) {
      // Fallback
      console.warn('Clipboard write image not supported, downloading instead:', err);
      handleDownloadImage();
    }
  };

  // Udostępnij przez Web Share API (WhatsApp, SMS itp.)
  const handleShare = async () => {
    if (!imageRef.current) return;
    try {
      const blob = await exportMarkedPhotoBlob(imageRef.current, { dimensions, pins });
      const file = new File([blob], `obmiar-${roomName}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Foto-Wymiarowanie: ${roomName}`,
          text: `Zestawienie wymiarów i instalacji dla: ${roomName}`,
        });
      } else {
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Błąd udostępniania:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Foto-Wymiarowanie • {roomName}
              </h2>
              <p className="text-xs text-slate-400">Narysuj strzałki wymiarowe i dodaj punkty instalacyjne</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Przycisk dalmierza BLE */}
            <button
              onClick={() => setShowLaserModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Połącz z dalmierzem Bluetooth"
            >
              <Bluetooth className="w-4 h-4" />
              <span className="hidden sm:inline">Dalmierz BLE</span>
            </button>

            {/* Zmień zdjęcie */}
            <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Wgraj zdjęcie</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Toolbox */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-900/90 text-xs">
          {/* Wybór narzędzia */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTool('dimension')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                activeTool === 'dimension'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Wymiar (Strzałka)</span>
            </button>
            <button
              onClick={() => setActiveTool('pin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                activeTool === 'pin'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Pinezka instalacji</span>
            </button>
          </div>

          {/* Szybki wybór rodzaju pinezki */}
          {activeTool === 'pin' && (
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {(
                [
                  'socket_230v',
                  'socket_400v',
                  'switch',
                  'water_in',
                  'water_out',
                  'radiator',
                  'vent',
                  'issue',
                ] as PinType[]
              ).map((type) => {
                const cfg = PIN_CONFIG[type];
                const isActive = selectedPinType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedPinType(type)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition ${
                      isActive
                        ? 'bg-teal-950/80 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{cfg.iconSymbol}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Przyciski cofania i czyszczenia */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
              title="Cofnij ostatnią akcję"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              disabled={dimensions.length === 0 && pins.length === 0}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 disabled:opacity-30 transition"
              title="Wyczyść wszystkie naniesione wymiary"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Workspace: Photo + Canvas Overlay */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-3 select-none"
        >
          {photoUrl ? (
            <div className="relative max-w-full max-h-full inline-block shadow-2xl rounded-2xl overflow-hidden border border-slate-800">
              <img
                ref={imageRef}
                src={photoUrl}
                alt="Zdjęcie ściany do obmiaru"
                onLoad={handleImageLoad}
                className="max-h-[60vh] sm:max-h-[66vh] w-auto object-contain block pointer-events-none"
              />
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              />
            </div>
          ) : (
            <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl max-w-md">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Brak zdjęcia pokoju</h3>
              <p className="text-xs text-slate-400 mb-4">
                Zrób zdjęcie aparatem telefonu lub wybierz plik z galerii, aby nanieść wymiary ściany i instalacji.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-teal-500/20 transition">
                <Camera className="w-4 h-4" />
                <span>Zrób zdjęcie / Wgraj z galerii</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          )}
        </div>

        {/* Active Item Inspector & Quick Dimension Bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Edytor aktywnego wymiaru */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Wartość wymiaru:</span>
            <input
              type="text"
              value={editValue}
              onChange={(e) => handleUpdateActiveValue(e.target.value)}
              placeholder="np. 2.40 m lub 85 cm"
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-teal-300 font-mono font-bold text-xs w-28 focus:outline-none focus:border-teal-500"
            />
            {/* Szybkie presety budowlane */}
            <div className="flex items-center gap-1">
              {['45 cm', '60 cm', '85 cm', '1.20 m', '2.05 m', '2.60 m'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleUpdateActiveValue(preset)}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-800 transition active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={editLabel}
              onChange={(e) => handleUpdateActiveLabel(e.target.value)}
              placeholder="Etykieta (np. Odpływ)"
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs w-36 focus:outline-none focus:border-teal-500 ml-1"
            />

            {selectedElementId && (
              <button
                onClick={handleDeleteActiveElement}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs transition"
                title="Usuń zaznaczony element"
              >
                Usuń zaznaczony
              </button>
            )}
          </div>

          {/* Przyciski Eksportu & Udostępniania */}
          <div className="flex items-center gap-2 ml-auto">
            {onSaveToProject && (
              <button
                onClick={handleSaveToProject}
                className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savedSuccess ? 'Zapisano w projekcie!' : 'Zapisz w Dzienniku'}</span>
              </button>
            )}

            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Kopiuj zdjęcie z wymiarami do schowka"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? 'Skopiowano!' : 'Kopiuj'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Pobierz plik JPG z wymiarami"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pobierz JPG</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Wyślij (WhatsApp)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dalmierz BLE modal */}
      <LaserMeterModal
        isOpen={showLaserModal}
        onClose={() => setShowLaserModal(false)}
        currentTargetField="custom"
        onApplyMeasurement={(dist) => {
          handleUpdateActiveValue(`${dist.toFixed(3)} m`);
          setShowLaserModal(false);
        }}
      />
    </div>
  );
};
