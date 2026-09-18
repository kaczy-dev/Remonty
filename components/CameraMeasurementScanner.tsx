'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  VideoOff,
  RefreshCw,
  Ruler,
  Sliders,
  Check,
  AlertCircle,
  Crosshair,
  Info,
  Layers,
  Undo2,
  Trash2
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
  // Guards against a race between the mount effect and a manual startCamera() call:
  // only the most recently issued request is allowed to assign streamRef/video.
  const cameraRequestIdRef = useRef(0);

  // Camera & Stream states
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner Tool Mode (2-Point Laser vs Multi-Point Polygon Floor/Wall Outline)
  const [scannerToolMode, setScannerToolMode] = useState<ScannerToolMode>('laser_2pt');

  // Fixed grid overlay preset (cosmetic controls removed — no measurement impact)
  const gridDensity = 20;
  const gridOpacity = 0.55;
  const gridColor = '#2dd4bf'; // teal

  const [activeMeasureMode, setActiveMeasureMode] = useState<MeasurementMode>('wall_width');

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

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1; // invalidate any in-flight startCamera() request
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start Camera Stream via navigator.mediaDevices.getUserMedia.
  // Every call is tagged with a request id; if a newer call started while this one
  // was awaiting permission/hardware, this one's stream is stopped instead of being
  // assigned — this is what prevents the mount-effect/manual-toggle stream leak.
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    const requestId = ++cameraRequestIdRef.current;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Twoja przeglądarka lub środowisko nie obsługuje interfejsu navigator.mediaDevices.getUserMedia.');
      return;
    }

    const applyStream = (stream: MediaStream, resolvedMode: 'environment' | 'user') => {
      if (requestId !== cameraRequestIdRef.current) {
        // A newer request superseded this one — discard this stream instead of leaking it.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (requestId === cameraRequestIdRef.current) {
            videoRef.current?.play().catch(() => {});
            setIsStreaming(true);
            if (resolvedMode !== mode) setFacingMode(resolvedMode);
          }
        };
      }
    };

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
      applyStream(stream, mode);
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      // If environment camera failed, try user/webcam fallback
      if (mode === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          applyStream(fallbackStream, 'user');
          return;
        } catch {
          // Fall through to error handler
        }
      }

      if (requestId !== cameraRequestIdRef.current) return;
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
    queueMicrotask(() => startCamera('environment'));

    return () => {
      cameraRequestIdRef.current += 1; // invalidate any in-flight request from this instance
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setPolygonPoints((prev) => [
          ...prev,
          { id: `poly-${Date.now()}`, x: Math.round(clickX * 10) / 10, y: Math.round(clickY * 10) / 10 },
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
    } else if (distA < distB) {
      setPointA({ x: Math.round(clickX * 10) / 10, y: Math.round(clickY * 10) / 10 });
    } else {
      setPointB({ x: Math.round(clickX * 10) / 10, y: Math.round(clickY * 10) / 10 });
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const rawY = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));

    if (scannerToolMode === 'polygon_trace' && activeDraggingPolyIdx !== null) {
      setPolygonPoints((prev) =>
        prev.map((p, i) =>
          i === activeDraggingPolyIdx
            ? { ...p, x: Math.round(rawX * 10) / 10, y: Math.round(rawY * 10) / 10 }
            : p
        )
      );
      return;
    }

    if (!activeDraggingPoint) return;

    if (activeDraggingPoint === 'A') {
      setPointA({ x: Math.round(rawX * 10) / 10, y: Math.round(rawY * 10) / 10 });
    } else if (activeDraggingPoint === 'B') {
      setPointB({ x: Math.round(rawX * 10) / 10, y: Math.round(rawY * 10) / 10 });
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
                Skaner Optyczny — Pomiar Laserowy i Obrys Wielokątny
              </h3>
              {isStreaming && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Kamera aktywna
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pomiar 2-punktowy (laser) lub obrys wielokątny podłogi/ściany z realną powierzchnią i obwodem.
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
                  id="metric-grid"
                  width={`${gridDensity}%`}
                  height={`${gridDensity * (16 / 9)}%`}
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="100%" y2="0" stroke={gridColor} strokeWidth="0.25" strokeOpacity={gridOpacity} />
                  <line x1="0" y1="0" x2="0" y2="100%" stroke={gridColor} strokeWidth="0.25" strokeOpacity={gridOpacity} />
                  <circle cx="0" cy="0" r="0.4" fill={gridColor} fillOpacity={gridOpacity * 1.2} />
                </pattern>
              </defs>

              {/* Grid Canvas Fill */}
              <rect width="100%" height="100%" fill="url(#metric-grid)" />

              {/* Center Crosshair Lens */}
              <g transform="translate(50, 50)">
                <circle r="4" fill="none" stroke={gridColor} strokeWidth="0.35" strokeOpacity="0.85" />
                <circle r="0.6" fill={gridColor} />
                <line x1="-7" y1="0" x2="-4" y2="0" stroke={gridColor} strokeWidth="0.4" />
                <line x1="4" y1="0" x2="7" y2="0" stroke={gridColor} strokeWidth="0.4" />
                <line x1="0" y1="-7" x2="0" y2="-4" stroke={gridColor} strokeWidth="0.4" />
                <line x1="0" y1="4" x2="0" y2="7" stroke={gridColor} strokeWidth="0.4" />
              </g>

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
                  <>Przeciągaj punkty <strong>A</strong> i <strong>B</strong>, aby zmierzyć odcinek na obrazie.</>
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

        {/* Right: Calibration Panel */}
        <div className="lg:col-span-4 space-y-4">

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
