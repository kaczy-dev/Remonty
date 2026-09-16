'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  VideoOff, 
  RefreshCw, 
  Ruler, 
  Grid, 
  Sliders, 
  Check, 
  AlertCircle,
  Crosshair,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  Magnet,
  Compass,
  Layers,
  Undo2,
  Trash2,
  Plus
} from 'lucide-react';

interface CameraMeasurementScannerProps {
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  onApplyMeasuredDimensions?: (width: number, length: number, height: number) => void;
  className?: string;
}

type MeasurementMode = 'wall_width' | 'wall_height' | 'free_measure';
type ScannerToolMode = 'laser_2pt' | 'polygon_trace';

export const CameraMeasurementScanner: React.FC<CameraMeasurementScannerProps> = ({
  roomWidth,
  roomLength,
  roomHeight,
  onApplyMeasuredDimensions,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera & Stream states
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner Tool Mode (2-Point Laser vs Multi-Point Polygon Floor/Wall Outline)
  const [scannerToolMode, setScannerToolMode] = useState<ScannerToolMode>('laser_2pt');

  // Interactive Grid & Measurement Overlay settings
  const [gridDensity, setGridDensity] = useState<number>(20); // Grid spacing in cm (10cm, 20cm, 50cm, 100cm)
  const [gridOpacity, setGridOpacity] = useState<number>(0.55);
  const [showSubGrid, setShowSubGrid] = useState<boolean>(true);
  const [showCenterCrosshair, setShowCenterCrosshair] = useState<boolean>(true);
  const [showHorizonGuide, setShowHorizonGuide] = useState<boolean>(true);
  const [gridColor, setGridColor] = useState<string>('#2dd4bf'); // teal
  const [activeMeasureMode, setActiveMeasureMode] = useState<MeasurementMode>('wall_width');

  // Edge Snapping (Sobel Luminance Gradient Filter)
  const [isEdgeSnapEnabled, setIsEdgeSnapEnabled] = useState<boolean>(true);
  const [hasSnappedFlash, setHasSnappedFlash] = useState<boolean>(false);

  // Gyroscope-based Leveling / Artificial Horizon
  const [deviceTilt, setDeviceTilt] = useState<{
    gamma: number; // Roll left/right in degrees
    beta: number;  // Pitch forward/backward
    isSensorActive: boolean;
    manualOffsetDeg: number;
  }>({
    gamma: 0,
    beta: 0,
    isSensorActive: false,
    manualOffsetDeg: 0,
  });

  // Interactive 2-Point Laser Tape Measurement on Video
  const [pointA, setPointA] = useState<{ x: number; y: number } | null>({ x: 25, y: 50 });
  const [pointB, setPointB] = useState<{ x: number; y: number } | null>({ x: 75, y: 50 });
  const [activeDraggingPoint, setActiveDraggingPoint] = useState<'A' | 'B' | null>(null);

  // Multi-point polygon tracing vertices (percentages 0..100)
  const [polygonPoints, setPolygonPoints] = useState<Array<{ id: string; x: number; y: number }>>([
    { id: 'p1', x: 20, y: 35 },
    { id: 'p2', x: 80, y: 35 },
    { id: 'p3', x: 80, y: 75 },
    { id: 'p4', x: 20, y: 75 },
  ]);
  const [activeDraggingPolyIdx, setActiveDraggingPolyIdx] = useState<number | null>(null);

  // Calibration Scale (Estimated ratio meters per frame width at typical ~2.5m distance)
  const [estimatedDistanceMeters, setEstimatedDistanceMeters] = useState<number>(2.6);
  const [calibratedFovAngle, setCalibratedFovAngle] = useState<number>(68); // Typical smartphone camera horizontal FOV ~65-72 deg

  // Width of visible frame at distance D: W_visible = 2 * D * tan(FOV/2)
  const visibleFrameWidthMeters = 2 * estimatedDistanceMeters * Math.tan((calibratedFovAngle * Math.PI) / 360);
  const aspect = 16 / 9;
  const visibleFrameHeightMeters = visibleFrameWidthMeters / aspect;
  
  // 2-Point Laser Distance
  const calculateRealDistance = useCallback((): number => {
    if (!pointA || !pointB) return 0;
    const dxPercent = (pointB.x - pointA.x) / 100;
    const dyPercent = (pointB.y - pointA.y) / 100;

    const dxMeters = dxPercent * visibleFrameWidthMeters;
    const dyMeters = dyPercent * visibleFrameHeightMeters;

    return Math.sqrt(dxMeters * dxMeters + dyMeters * dyMeters);
  }, [pointA, pointB, visibleFrameWidthMeters, visibleFrameHeightMeters]);

  const measuredDistanceM = calculateRealDistance();

  // Multi-Point Polygon Metrics: Perimeter & Real-World Area (Shoelace formula)
  const calculatePolygonMetrics = useCallback(() => {
    if (polygonPoints.length < 3) return { perimeterM: 0, areaM2: 0, segmentDistances: [] as number[] };

    const segmentDistances: number[] = [];
    let perimeter = 0;

    for (let i = 0; i < polygonPoints.length; i++) {
      const nextIdx = (i + 1) % polygonPoints.length;
      const p1 = polygonPoints[i];
      const p2 = polygonPoints[nextIdx];

      const dxM = ((p2.x - p1.x) / 100) * visibleFrameWidthMeters;
      const dyM = ((p2.y - p1.y) / 100) * visibleFrameHeightMeters;
      const segDist = Math.hypot(dxM, dyM);
      segmentDistances.push(segDist);
      perimeter += segDist;
    }

    let shoelaceSum = 0;
    for (let i = 0; i < polygonPoints.length; i++) {
      const nextIdx = (i + 1) % polygonPoints.length;
      const p1 = polygonPoints[i];
      const p2 = polygonPoints[nextIdx];

      const x1M = (p1.x / 100) * visibleFrameWidthMeters;
      const y1M = (p1.y / 100) * visibleFrameHeightMeters;
      const x2M = (p2.x / 100) * visibleFrameWidthMeters;
      const y2M = (p2.y / 100) * visibleFrameHeightMeters;

      shoelaceSum += x1M * y2M - x2M * y1M;
    }
    const areaM2 = Math.abs(shoelaceSum) / 2;

    return { perimeterM: perimeter, areaM2, segmentDistances };
  }, [polygonPoints, visibleFrameWidthMeters, visibleFrameHeightMeters]);

  const polygonMetrics = calculatePolygonMetrics();

  // Gyroscope Leveling listener
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setDeviceTilt((prev) => ({
          ...prev,
          gamma: Math.round(e.gamma! * 10) / 10,
          beta: Math.round(e.beta! * 10) / 10,
          isSensorActive: true,
        }));
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  const effectiveRoll = deviceTilt.isSensorActive ? deviceTilt.gamma : deviceTilt.manualOffsetDeg;
  const isLevel = Math.abs(effectiveRoll) <= 0.6;

  // Sobel Edge Snapping Helper
  const snapToEdgeIfNear = (targetX: number, targetY: number): { x: number; y: number } => {
    if (!isEdgeSnapEnabled || !videoRef.current || !isStreaming) {
      return { x: targetX, y: targetY };
    }

    try {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
        offscreenCanvasRef.current.width = 160;
        offscreenCanvasRef.current.height = 90;
      }
      const canvas = offscreenCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return { x: targetX, y: targetY };

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const pxX = Math.round((targetX / 100) * canvas.width);
      const pxY = Math.round((targetY / 100) * canvas.height);

      const rad = 6;
      const startX = Math.max(1, pxX - rad);
      const startY = Math.max(1, pxY - rad);
      const w = Math.min(canvas.width - 2, pxX + rad) - startX;
      const h = Math.min(canvas.height - 2, pxY + rad) - startY;
      if (w <= 2 || h <= 2) return { x: targetX, y: targetY };

      const imgData = ctx.getImageData(startX, startY, w, h);
      const data = imgData.data;

      const getLum = (col: number, row: number) => {
        const idx = (row * w + col) * 4;
        return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      };

      let maxGrad = 0;
      let bestLocalX = pxX;
      let bestLocalY = pxY;

      for (let r = 1; r < h - 1; r++) {
        for (let c = 1; c < w - 1; c++) {
          const gx = getLum(c + 1, r) - getLum(c - 1, r);
          const gy = getLum(c, r + 1) - getLum(c, r - 1);
          const grad = Math.abs(gx) + Math.abs(gy);
          if (grad > maxGrad) {
            maxGrad = grad;
            bestLocalX = startX + c;
            bestLocalY = startY + r;
          }
        }
      }

      if (maxGrad > 36) {
        const snappedXPct = Math.round(((bestLocalX / canvas.width) * 100) * 10) / 10;
        const snappedYPct = Math.round(((bestLocalY / canvas.height) * 100) * 10) / 10;
        setHasSnappedFlash(true);
        setTimeout(() => setHasSnappedFlash(false), 500);
        return { x: snappedXPct, y: snappedYPct };
      }
    } catch {
      // Fallback if security restricts reading canvas
    }

    return { x: targetX, y: targetY };
  };

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start Camera Stream via navigator.mediaDevices.getUserMedia
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Twoja przeglądarka lub środowisko nie obsługuje interfejsu navigator.mediaDevices.getUserMedia.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsStreaming(true);
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      // If environment camera failed, try user/webcam fallback
      if (mode === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(() => {});
              setIsStreaming(true);
              setFacingMode('user');
            };
          }
          return;
        } catch {
          // Fall through to error handler
        }
      }

      const errorMessage = err instanceof Error ? err.message : 'Brak dostępu do kamery';
      setCameraError(
        `Nie udało się uruchomić kamery (${errorMessage}). Upewnij się, że zezwolono na dostęp do kamery w przeglądarce.`
      );
      setIsStreaming(false);
    }
  }, [facingMode]);

  // Switch facing mode (back/front camera)
  const handleToggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Automatically start camera when component mounts
  useEffect(() => {
    let isMounted = true;
    const initCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setCameraError('Twoja przeglądarka lub środowisko nie obsługuje interfejsu navigator.mediaDevices.getUserMedia.');
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) {
              videoRef.current?.play().catch(() => {});
              setIsStreaming(true);
            }
          };
        }
      } catch (err: unknown) {
        if (isMounted) {
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (!isMounted) {
              fallbackStream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.onloadedmetadata = () => {
                if (isMounted) {
                  videoRef.current?.play().catch(() => {});
                  setIsStreaming(true);
                  setFacingMode('user');
                }
              };
            }
          } catch {
            const errorMessage = err instanceof Error ? err.message : 'Brak dostępu do kamery';
            setCameraError(`Nie udało się uruchomić kamery (${errorMessage}).`);
          }
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Quick Presets for Measurement Mode
  const handleSetMeasurementMode = (mode: MeasurementMode) => {
    setActiveMeasureMode(mode);
    if (mode === 'wall_width') {
      setPointA({ x: 15, y: 50 });
      setPointB({ x: 85, y: 50 });
    } else if (mode === 'wall_height') {
      setPointA({ x: 50, y: 15 });
      setPointB({ x: 50, y: 85 });
    } else {
      setPointA({ x: 30, y: 35 });
      setPointB({ x: 70, y: 65 });
    }
  };

  // Interactive drag / click on video canvas
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    if (scannerToolMode === 'polygon_trace') {
      // Check if clicked near an existing polygon vertex
      let closestIdx = -1;
      let minPolyDist = Infinity;
      polygonPoints.forEach((p, idx) => {
        const d = Math.hypot(clickX - p.x, clickY - p.y);
        if (d < minPolyDist) {
          minPolyDist = d;
          closestIdx = idx;
        }
      });

      if (minPolyDist < 6 && closestIdx !== -1) {
        setActiveDraggingPolyIdx(closestIdx);
      } else {
        // Add new vertex to polygon
        const snapped = snapToEdgeIfNear(clickX, clickY);
        setPolygonPoints((prev) => [
          ...prev,
          { id: `poly-${Date.now()}`, x: Math.round(snapped.x * 10) / 10, y: Math.round(snapped.y * 10) / 10 },
        ]);
      }
      return;
    }

    // Laser 2-Point Mode
    if (!pointA || !pointB) return;

    const distA = Math.hypot(clickX - pointA.x, clickY - pointA.y);
    const distB = Math.hypot(clickX - pointB.x, clickY - pointB.y);

    if (distA < 10) {
      setActiveDraggingPoint('A');
    } else if (distB < 10) {
      setActiveDraggingPoint('B');
    } else {
      const snapped = snapToEdgeIfNear(clickX, clickY);
      if (distA < distB) {
        setPointA({ x: Math.round(snapped.x * 10) / 10, y: Math.round(snapped.y * 10) / 10 });
      } else {
        setPointB({ x: Math.round(snapped.x * 10) / 10, y: Math.round(snapped.y * 10) / 10 });
      }
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const rawY = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));

    if (scannerToolMode === 'polygon_trace' && activeDraggingPolyIdx !== null) {
      const snapped = snapToEdgeIfNear(rawX, rawY);
      setPolygonPoints((prev) =>
        prev.map((p, i) =>
          i === activeDraggingPolyIdx
            ? { ...p, x: Math.round(snapped.x * 10) / 10, y: Math.round(snapped.y * 10) / 10 }
            : p
        )
      );
      return;
    }

    if (!activeDraggingPoint) return;
    const snapped = snapToEdgeIfNear(rawX, rawY);

    if (activeDraggingPoint === 'A') {
      setPointA({ x: Math.round(snapped.x * 10) / 10, y: Math.round(snapped.y * 10) / 10 });
    } else if (activeDraggingPoint === 'B') {
      setPointB({ x: Math.round(snapped.x * 10) / 10, y: Math.round(snapped.y * 10) / 10 });
    }
  };

  const handleContainerPointerUp = () => {
    setActiveDraggingPoint(null);
    setActiveDraggingPolyIdx(null);
  };

  // Polygon actions
  const handleUndoPolygonPoint = () => {
    if (polygonPoints.length <= 3) return;
    setPolygonPoints((prev) => prev.slice(0, -1));
  };

  const handleClearPolygon = () => {
    setPolygonPoints([
      { id: 'p1', x: 25, y: 35 },
      { id: 'p2', x: 75, y: 35 },
      { id: 'p3', x: 75, y: 75 },
      { id: 'p4', x: 25, y: 75 },
    ]);
  };

  // Apply to Room Geometry
  const handleApplyToRoom = () => {
    if (!onApplyMeasuredDimensions) return;
    if (scannerToolMode === 'polygon_trace') {
      // Apply polygon area to room dimensions
      const side = Math.sqrt(Math.max(1, polygonMetrics.areaM2));
      const roundedSide = Math.round(side * 100) / 100;
      onApplyMeasuredDimensions(roundedSide, roundedSide, roomHeight);
      return;
    }

    const roundedM = Math.round(measuredDistanceM * 100) / 100;
    if (roundedM <= 0.1) return;

    if (activeMeasureMode === 'wall_width') {
      onApplyMeasuredDimensions(roundedM, roomLength, roomHeight);
    } else if (activeMeasureMode === 'wall_height') {
      onApplyMeasuredDimensions(roomWidth, roomLength, roundedM);
    } else {
      onApplyMeasuredDimensions(roomWidth, roundedM, roomHeight);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Header Bar with Status & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Skaner Optyczny z Żyroskopem & Magnesem Krawędzi
              </h3>
              {isStreaming && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Kamera aktywna
                </span>
              )}
              {isLevel && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
                  <Compass className="w-3 h-3 text-emerald-400" />
                  Poziom 0.0°
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatyczne przyciąganie do narożników (Sobel CV), poziomica żyroskopowa i obrys wielokątny podłóg/ścian.
            </p>
          </div>
        </div>

        {/* Camera Controls & Tool Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Tool mode toggle */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setScannerToolMode('laser_2pt')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                scannerToolMode === 'laser_2pt'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Laser 2-pkt</span>
            </button>
            <button
              onClick={() => setScannerToolMode('polygon_trace')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                scannerToolMode === 'polygon_trace'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Wielokąt (Obrys)</span>
            </button>
          </div>

          {isStreaming ? (
            <>
              <button
                id="toggle-camera-facing-btn"
                onClick={handleToggleCamera}
                title="Przełącz aparat (przód/tył)"
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">{facingMode === 'environment' ? 'Aparat Główny' : 'Przedni'}</span>
              </button>
              <button
                id="stop-camera-btn"
                onClick={stopCamera}
                className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Zatrzymaj</span>
              </button>
            </>
          ) : (
            <button
              id="start-camera-btn"
              onClick={() => startCamera()}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-900/30 hover:bg-teal-500 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Włącz Kamerę</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport & Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Interactive Video Viewport with SVG Grid Overlay */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          
          <div 
            className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-950 shadow-2xl select-none cursor-crosshair group touch-none"
            onPointerDown={handleContainerPointerDown}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={handleContainerPointerUp}
          >
            {/* Real Hardware Video Stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isStreaming ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Offline / Placeholder Screen if Camera Not Streaming */}
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-xs space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <Camera className="h-8 w-8 animate-pulse" />
                </div>
                <div className="max-w-md space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">
                    Kamera jest wyłączona lub oczekuje na uprawnienia
                  </h4>
                  <p className="text-xs text-slate-400">
                    Kliknij przycisk poniżej, aby uruchomić podgląd na żywo z obiektywu i nałożyć precyzyjną siatkę metryczną oraz poziomnicę.
                  </p>
                </div>
                {cameraError && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-950/50 border border-amber-800/80 p-3 text-xs text-amber-300 max-w-md text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{cameraError}</span>
                  </div>
                )}
                <button
                  onClick={() => startCamera()}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-teal-500 transition"
                >
                  Uruchom Kamerę Urządzenia
                </button>
              </div>
            )}

            {/* Visual Snap Flash Notification Badge */}
            {hasSnappedFlash && (
              <div className="absolute top-3 right-3 z-30 pointer-events-none flex items-center gap-1.5 rounded-full bg-teal-400 text-slate-950 px-3 py-1 text-[11px] font-extrabold shadow-xl animate-bounce">
                <Magnet className="w-3.5 h-3.5" />
                <span>PRZYCIĄGNIĘTO DO KRAWĘDZI (SOBEL)</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SVG ACCURATE REAL-TIME DIMENSIONAL METRIC GRID & HUD OVERLAY              */}
            {/* ========================================================================= */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="metric-subgrid"
                  width={`${gridDensity / 4}%`}
                  height={`${(gridDensity / 4) * (16 / 9)}%`}
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="100%" y2="0" stroke={gridColor} strokeWidth="0.1" strokeOpacity={gridOpacity * 0.35} />
                  <line x1="0" y1="0" x2="0" y2="100%" stroke={gridColor} strokeWidth="0.1" strokeOpacity={gridOpacity * 0.35} />
                </pattern>

                <pattern
                  id="metric-grid"
                  width={`${gridDensity}%`}
                  height={`${gridDensity * (16 / 9)}%`}
                  patternUnits="userSpaceOnUse"
                >
                  {showSubGrid && <rect width="100%" height="100%" fill="url(#metric-subgrid)" />}
                  <line x1="0" y1="0" x2="100%" y2="0" stroke={gridColor} strokeWidth="0.25" strokeOpacity={gridOpacity} />
                  <line x1="0" y1="0" x2="0" y2="100%" stroke={gridColor} strokeWidth="0.25" strokeOpacity={gridOpacity} />
                  <circle cx="0" cy="0" r="0.4" fill={gridColor} fillOpacity={gridOpacity * 1.2} />
                </pattern>
              </defs>

              {/* Grid Canvas Fill */}
              <rect width="100%" height="100%" fill="url(#metric-grid)" />

              {/* Gyroscope Artificial Horizon Level Guide Line */}
              {showHorizonGuide && (
                <g transform={`rotate(${-effectiveRoll}, 50, 50)`}>
                  <line
                    x1="-50"
                    y1="50"
                    x2="150"
                    y2="50"
                    stroke={isLevel ? '#10b981' : '#38bdf8'}
                    strokeWidth={isLevel ? '0.6' : '0.35'}
                    strokeDasharray={isLevel ? 'none' : '2 1.5'}
                    strokeOpacity={isLevel ? 0.95 : 0.75}
                  />
                  {/* Pitch ladder marks */}
                  <line x1="42" y1="45" x2="58" y2="45" stroke={isLevel ? '#10b981' : '#38bdf8'} strokeWidth="0.25" strokeOpacity="0.6" />
                  <line x1="42" y1="55" x2="58" y2="55" stroke={isLevel ? '#10b981' : '#38bdf8'} strokeWidth="0.25" strokeOpacity="0.6" />
                  <text
                    x="50"
                    y="48"
                    textAnchor="middle"
                    fill={isLevel ? '#10b981' : '#38bdf8'}
                    fontSize="2.4"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isLevel ? `POZIOM: 0.0° [IDEALNY]` : `KĄT POCHYLENIA: ${effectiveRoll > 0 ? '+' : ''}${effectiveRoll.toFixed(1)}°`}
                  </text>
                </g>
              )}

              {/* Center Crosshair Lens */}
              {showCenterCrosshair && (
                <g transform="translate(50, 50)">
                  <circle r="4" fill="none" stroke={gridColor} strokeWidth="0.35" strokeOpacity="0.85" />
                  <circle r="0.6" fill={gridColor} />
                  <line x1="-7" y1="0" x2="-4" y2="0" stroke={gridColor} strokeWidth="0.4" />
                  <line x1="4" y1="0" x2="7" y2="0" stroke={gridColor} strokeWidth="0.4" />
                  <line x1="0" y1="-7" x2="0" y2="-4" stroke={gridColor} strokeWidth="0.4" />
                  <line x1="0" y1="4" x2="0" y2="7" stroke={gridColor} strokeWidth="0.4" />
                </g>
              )}

              {/* Multi-point Polygon Floor/Wall Outline Mode */}
              {scannerToolMode === 'polygon_trace' && polygonPoints.length >= 3 && (
                <g>
                  {/* Semi-transparent Polygon Interior Fill */}
                  <polygon
                    points={polygonPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(45, 212, 191, 0.16)"
                    stroke="#2dd4bf"
                    strokeWidth="0.75"
                    strokeDasharray="2 1"
                  />

                  {/* Segment distance pills */}
                  {polygonPoints.map((p1, idx) => {
                    const nextIdx = (idx + 1) % polygonPoints.length;
                    const p2 = polygonPoints[nextIdx];
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    const dist = polygonMetrics.segmentDistances[idx] || 0;

                    return (
                      <g key={`seg-${idx}`} transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-10"
                          y="-3.5"
                          width="20"
                          height="5"
                          rx="1.2"
                          fill="#090d16"
                          fillOpacity="0.92"
                          stroke="#2dd4bf"
                          strokeWidth="0.3"
                        />
                        <text
                          x="0"
                          y="-0.6"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#2dd4bf"
                          fontSize="2.2"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {dist.toFixed(2)} m
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Laser Measurement Line between Point A and Point B (Laser 2pt mode) */}
              {scannerToolMode === 'laser_2pt' && pointA && pointB && (
                <g>
                  <line
                    x1={pointA.x}
                    y1={pointA.y}
                    x2={pointB.x}
                    y2={pointB.y}
                    stroke="#0d9488"
                    strokeWidth="1.2"
                    strokeOpacity="0.4"
                  />
                  <line
                    x1={pointA.x}
                    y1={pointA.y}
                    x2={pointB.x}
                    y2={pointB.y}
                    stroke="#14b8a6"
                    strokeWidth="0.5"
                    strokeDasharray="1 0.5"
                  />

                  {(() => {
                    const midX = (pointA.x + pointB.x) / 2;
                    const midY = (pointA.y + pointB.y) / 2;
                    return (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-14"
                          y="-5"
                          width="28"
                          height="6.5"
                          rx="1.5"
                          fill="#090d16"
                          fillOpacity="0.92"
                          stroke="#2dd4bf"
                          strokeWidth="0.4"
                        />
                        <text
                          x="0"
                          y="-1"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#2dd4bf"
                          fontSize="2.9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {measuredDistanceM.toFixed(2)} m
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>

            {/* 2-Point Laser Drag Handles */}
            {scannerToolMode === 'laser_2pt' && (
              <>
                {pointA && (
                  <div
                    style={{ left: `${pointA.x}%`, top: `${pointA.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center z-20 group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/30 border-2 border-teal-300 text-teal-200 text-xs font-bold shadow-lg shadow-teal-500/50 hover:scale-110 transition-transform">
                      A
                    </div>
                    <span className="mt-1 rounded bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-mono text-teal-300 border border-teal-500/30 whitespace-nowrap">
                      Początek pomiaru
                    </span>
                  </div>
                )}

                {pointB && (
                  <div
                    style={{ left: `${pointB.x}%`, top: `${pointB.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center z-20 group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/30 border-2 border-amber-300 text-amber-200 text-xs font-bold shadow-lg shadow-amber-500/50 hover:scale-110 transition-transform">
                      B
                    </div>
                    <span className="mt-1 rounded bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-500/30 whitespace-nowrap">
                      Koniec pomiaru
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Polygon Vertex Drag Handles */}
            {scannerToolMode === 'polygon_trace' &&
              polygonPoints.map((pt, idx) => (
                <div
                  key={pt.id}
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center z-20 group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600/80 border-2 border-teal-300 text-white text-[11px] font-bold shadow-lg hover:scale-120 transition-transform">
                    {idx + 1}
                  </div>
                </div>
              ))}

            {/* Bottom HUD Bar */}
            <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/85 backdrop-blur-md px-3.5 py-2 text-xs border border-slate-800 text-slate-300 z-10">
              <div className="flex items-center gap-3">
                {scannerToolMode === 'laser_2pt' ? (
                  <span className="flex items-center gap-1 font-mono text-teal-400 font-semibold">
                    <Ruler className="w-3.5 h-3.5" />
                    Długość odcinka: {measuredDistanceM.toFixed(2)} m ({Math.round(measuredDistanceM * 100)} cm)
                  </span>
                ) : (
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-teal-300 font-bold">
                      Powierzchnia: {polygonMetrics.areaM2.toFixed(2)} m²
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">
                      Obwód: {polygonMetrics.perimeterM.toFixed(2)} mb ({polygonPoints.length} wierzchołków)
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  id="apply-measurement-to-room-btn"
                  onClick={handleApplyToRoom}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-500 transition shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {scannerToolMode === 'polygon_trace'
                      ? `Zastosuj pole (${polygonMetrics.areaM2.toFixed(2)} m²) do pokoju`
                      : `Zastosuj do ${activeMeasureMode === 'wall_width' ? 'szerokości' : activeMeasureMode === 'wall_height' ? 'wysokości' : 'długości'}`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guidance Info */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                {scannerToolMode === 'laser_2pt' ? (
                  <>Przeciągaj punkty <strong>A</strong> i <strong>B</strong>. Magnes krawędzi (Sobel) sam przyciąga do linii narożnika.</>
                ) : (
                  <>Klikaj po obrazie, aby dodać wierzchołki wielokąta. Przeciągaj punkty, by dopasować kontur posadzki.</>
                )}
              </span>
            </div>

            {scannerToolMode === 'polygon_trace' && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleUndoPolygonPoint}
                  disabled={polygonPoints.length <= 3}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] text-slate-300 disabled:opacity-40 transition"
                  title="Cofnij ostatni punkt"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Cofnij</span>
                </button>
                <button
                  onClick={handleClearPolygon}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] text-slate-300 transition"
                  title="Zresetuj wielokąt do prostokąta"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Grid Controls & Calibration Panel */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Edge Snapping & Gyroscope HUD Card */}
          <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-2">
                <Magnet className="w-4 h-4 text-teal-400" />
                Magnes Krawędzi & Żyroskop
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isLevel ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}>
                {isLevel ? 'POZIOM OK' : 'POCHYŁ'}
              </span>
            </div>

            {/* Edge snap toggle */}
            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pt-1">
              <span className="flex items-center gap-1.5">
                <Magnet className="w-3.5 h-3.5 text-teal-400" />
                <span>Magnes do krawędzi ścian (Sobel CV):</span>
              </span>
              <input
                type="checkbox"
                checked={isEdgeSnapEnabled}
                onChange={(e) => setIsEdgeSnapEnabled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-teal-500 accent-teal-500 h-4 w-4 cursor-pointer"
              />
            </label>

            {/* Gyroscope Roll Slider (or Sensor Display) */}
            <div className="space-y-1.5 pt-2 border-t border-teal-500/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {deviceTilt.isSensorActive ? 'Żyroskop urządzenia:' : 'Kąt poziomicy (kalibracja):'}
                </span>
                <span className={`font-mono font-bold ${isLevel ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {effectiveRoll > 0 ? '+' : ''}{effectiveRoll.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.1"
                value={effectiveRoll}
                onChange={(e) =>
                  setDeviceTilt((prev) => ({
                    ...prev,
                    manualOffsetDeg: parseFloat(e.target.value),
                    isSensorActive: false,
                  }))
                }
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-15° lewo</span>
                <button
                  onClick={() => setDeviceTilt((prev) => ({ ...prev, manualOffsetDeg: 0 }))}
                  className="text-teal-400 underline hover:text-teal-300"
                >
                  Ustaw idealne 0.0°
                </button>
                <span>+15° prawo</span>
              </div>
            </div>
          </div>

          {/* Measurement Mode Selector (Only when in 2-point laser mode) */}
          {scannerToolMode === 'laser_2pt' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                Kierunek Pomiaru Lasera
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSetMeasurementMode('wall_width')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border ${
                    activeMeasureMode === 'wall_width'
                      ? 'border-teal-500 bg-teal-950/50 text-teal-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Szerokość</span>
                  <span className="text-[10px] font-mono text-slate-500">Poziomo</span>
                </button>

                <button
                  onClick={() => handleSetMeasurementMode('wall_height')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border ${
                    activeMeasureMode === 'wall_height'
                      ? 'border-teal-500 bg-teal-950/50 text-teal-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Wysokość</span>
                  <span className="text-[10px] font-mono text-slate-500">Pionowo</span>
                </button>

                <button
                  onClick={() => handleSetMeasurementMode('free_measure')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border ${
                    activeMeasureMode === 'free_measure'
                      ? 'border-teal-500 bg-teal-950/50 text-teal-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Dowolny</span>
                  <span className="text-[10px] font-mono text-slate-500">Ukośny</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Settings & Density */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Ustawienia Siatki Metrycznej
            </h4>

            {/* Grid Spacing / Density Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Podziałka siatki:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { density: 10, label: '10 cm' },
                  { density: 20, label: '20 cm' },
                  { density: 50, label: '50 cm' },
                  { density: 100, label: '100 cm' },
                ].map((item) => (
                  <button
                    key={item.density}
                    onClick={() => setGridDensity(item.density)}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      gridDensity === item.density
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Przezroczystość siatki:</span>
                <span className="font-mono text-teal-400">{Math.round(gridOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={gridOpacity}
                onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Grid Color Theme */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Kolor linii pomiarowych:</label>
              <div className="flex items-center gap-2">
                {[
                  { color: '#2dd4bf', label: 'Turkus' },
                  { color: '#38bdf8', label: 'Błękit' },
                  { color: '#eab308', label: 'Złoty' },
                  { color: '#ec4899', label: 'Róż laser' },
                  { color: '#ffffff', label: 'Biały' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setGridColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      gridColor === c.color ? 'border-white scale-110 shadow-md' : 'border-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Podsiatka milimetrowa (sub-grid):</span>
                <input
                  type="checkbox"
                  checked={showSubGrid}
                  onChange={(e) => setShowSubGrid(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 accent-teal-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Centralny celownik optyczny:</span>
                <input
                  type="checkbox"
                  checked={showCenterCrosshair}
                  onChange={(e) => setShowCenterCrosshair(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 accent-teal-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Wirtualna poziomica horyzontu:</span>
                <input
                  type="checkbox"
                  checked={showHorizonGuide}
                  onChange={(e) => setShowHorizonGuide(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 accent-teal-500 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* Distance & Calibration Module */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Kalibracja Optyczna
            </h4>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Szacowany dystans do ściany:</span>
                <span className="font-mono text-teal-400 font-bold">{estimatedDistanceMeters.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.1"
                value={estimatedDistanceMeters}
                onChange={(e) => setEstimatedDistanceMeters(parseFloat(e.target.value))}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1.0m (blisko)</span>
                <span>3.0m (pokój)</span>
                <span>6.0m (daleko)</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">Aktualne wymiary pomieszczenia:</div>
              <div className="flex justify-between font-mono text-slate-400">
                <span>Szerokość: <strong className="text-slate-200">{roomWidth.toFixed(2)} m</strong></span>
                <span>Długość: <strong className="text-slate-200">{roomLength.toFixed(2)} m</strong></span>
                <span>Wysokość: <strong className="text-slate-200">{roomHeight.toFixed(2)} m</strong></span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
