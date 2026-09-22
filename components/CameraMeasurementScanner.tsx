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
  Trash2,
  Flashlight,
  FlashlightOff,
  Pause,
  Play,
  Compass,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard,
  Target,
} from 'lucide-react';
import { MagnifierLoupe } from './MagnifierLoupe';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { ScaleCalibrationModal, AppliedCalibration } from './ScaleCalibrationModal';
import { applyPitchTiltCorrection } from '@/lib/scale-calibration';

interface CameraMeasurementScannerProps {
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  onApplyMeasuredDimensions?: (
    width: number,
    length: number,
    height: number,
    polygonVertices?: { x: number; y: number }[]
  ) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frozenCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef(0);

  // Camera & Stream states
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Freeze Frame (Still photo capture mode for jitter-free measurement on ladder)
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  // Hardware Torch state
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);

  // Container dimensions for responsive Magnifier Loupe positioning
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  // Virtual Bubble Level (Device Orientation)
  const orientation = useDeviceOrientation();

  // Scanner Tool Mode (2-Point Laser vs Multi-Point Polygon Outline)
  const [scannerToolMode, setScannerToolMode] = useState<ScannerToolMode>('laser_2pt');

  // Fixed grid overlay preset
  const gridDensity = 20;
  const gridOpacity = 0.55;
  const gridColor = '#2dd4bf'; // teal

  const [activeMeasureMode, setActiveMeasureMode] = useState<MeasurementMode>('wall_width');

  // Interactive 2-Point Laser Tape Measurement on Video
  const [pointA, setPointA] = useState<{ x: number; y: number } | null>({ x: 25, y: 50 });
  const [pointB, setPointB] = useState<{ x: number; y: number } | null>({ x: 75, y: 50 });
  const [activeDraggingPoint, setActiveDraggingPoint] = useState<'A' | 'B' | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<'A' | 'B' | number>('A');

  // Laser history stack for Undo
  const [laserHistory, setLaserHistory] = useState<
    Array<{ pointA: { x: number; y: number }; pointB: { x: number; y: number } }>
  >([]);

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
  const [calibratedFovAngle, setCalibratedFovAngle] = useState<number>(68);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);
  const [calibrationProfile, setCalibrationProfile] = useState<{
    label: string;
    isCustom: boolean;
  }>({
    label: 'Domyślna optyczna (2.6 m)',
    isCustom: false,
  });
  const [enablePitchCompensation, setEnablePitchCompensation] = useState<boolean>(true);

  // Width of visible frame at distance D: W_visible = 2 * D * tan(FOV/2)
  const visibleFrameWidthMeters = 2 * estimatedDistanceMeters * Math.tan((calibratedFovAngle * Math.PI) / 360);
  const aspect = 16 / 9;
  const visibleFrameHeightMeters = visibleFrameWidthMeters / aspect;

  const handleApplyCalibration = useCallback((calib: AppliedCalibration) => {
    setEstimatedDistanceMeters(calib.estimatedDistanceMeters);
    setCalibrationProfile({
      label: calib.presetLabel,
      isCustom: calib.presetId === 'custom',
    });
  }, []);

  const updateContainerRect = useCallback(() => {
    if (containerRef.current) {
      setContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateContainerRect();
    window.addEventListener('resize', updateContainerRect);
    return () => window.removeEventListener('resize', updateContainerRect);
  }, [updateContainerRect]);

  // Record laser state for Undo
  const pushLaserHistory = useCallback(() => {
    if (pointA && pointB) {
      setLaserHistory((prev) => [...prev.slice(-15), { pointA: { ...pointA }, pointB: { ...pointB } }]);
    }
  }, [pointA, pointB]);

  const handleUndoLaser = () => {
    if (laserHistory.length === 0) return;
    const last = laserHistory[laserHistory.length - 1];
    setLaserHistory((prev) => prev.slice(0, -1));
    setPointA(last.pointA);
    setPointB(last.pointB);
  };

  // 2-Point Laser Distance (with optional DeviceOrientation pitch/tilt compensation)
  const calculateRealDistance = useCallback((): number => {
    if (!pointA || !pointB) return 0;
    const dxPercent = (pointB.x - pointA.x) / 100;
    const dyPercent = (pointB.y - pointA.y) / 100;

    const dxMeters = dxPercent * visibleFrameWidthMeters;
    let dyMeters = dyPercent * visibleFrameHeightMeters;

    if (enablePitchCompensation && orientation.pitch !== null) {
      dyMeters = applyPitchTiltCorrection(
        dyMeters,
        orientation.pitch,
        activeMeasureMode === 'wall_height' ? 90 : 45
      );
    }

    return Math.sqrt(dxMeters * dxMeters + dyMeters * dyMeters);
  }, [
    pointA,
    pointB,
    visibleFrameWidthMeters,
    visibleFrameHeightMeters,
    enablePitchCompensation,
    orientation.pitch,
    activeMeasureMode,
  ]);

  const measuredDistanceM = calculateRealDistance();

  // Multi-Point Polygon Metrics: Perimeter & Real-World Area (Shoelace formula with pitch tilt correction)
  const calculatePolygonMetrics = useCallback(() => {
    if (polygonPoints.length < 3) return { perimeterM: 0, areaM2: 0, segmentDistances: [] as number[] };

    const segmentDistances: number[] = [];
    let perimeter = 0;

    for (let i = 0; i < polygonPoints.length; i++) {
      const nextIdx = (i + 1) % polygonPoints.length;
      const p1 = polygonPoints[i];
      const p2 = polygonPoints[nextIdx];

      const dxM = ((p2.x - p1.x) / 100) * visibleFrameWidthMeters;
      let dyM = ((p2.y - p1.y) / 100) * visibleFrameHeightMeters;
      if (enablePitchCompensation && orientation.pitch !== null) {
        dyM = applyPitchTiltCorrection(dyM, orientation.pitch, 45);
      }
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
      let y1M = (p1.y / 100) * visibleFrameHeightMeters;
      const x2M = (p2.x / 100) * visibleFrameWidthMeters;
      let y2M = (p2.y / 100) * visibleFrameHeightMeters;

      if (enablePitchCompensation && orientation.pitch !== null) {
        y1M = applyPitchTiltCorrection(y1M, orientation.pitch, 45);
        y2M = applyPitchTiltCorrection(y2M, orientation.pitch, 45);
      }

      shoelaceSum += x1M * y2M - x2M * y1M;
    }
    const areaM2 = Math.abs(shoelaceSum) / 2;

    return { perimeterM: perimeter, areaM2, segmentDistances };
  }, [
    polygonPoints,
    visibleFrameWidthMeters,
    visibleFrameHeightMeters,
    enablePitchCompensation,
    orientation.pitch,
  ]);

  const polygonMetrics = calculatePolygonMetrics();

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsTorchOn(false);
    setIsTorchSupported(false);
  }, []);

  // Start Camera Stream via navigator.mediaDevices.getUserMedia
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    const requestId = ++cameraRequestIdRef.current;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Twoja przeglądarka lub środowisko nie obsługuje kamery internetowej.');
      return;
    }

    const applyStream = (stream: MediaStream, resolvedMode: 'environment' | 'user') => {
      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = stream;

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const trackWithCaps = track as unknown as { getCapabilities?: () => { torch?: boolean } };
        const caps = typeof trackWithCaps.getCapabilities === 'function' ? trackWithCaps.getCapabilities() : {};
        setIsTorchSupported(Boolean(caps?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (requestId === cameraRequestIdRef.current) {
            videoRef.current?.play().catch(() => {});
            setIsStreaming(true);
            setIsFrozen(false);
            if (resolvedMode !== mode) setFacingMode(resolvedMode);
            updateContainerRect();
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
      if (mode === 'environment') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          applyStream(fallbackStream, 'user');
          return;
        } catch {
          // Fall through
        }
      }

      if (requestId !== cameraRequestIdRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Brak dostępu do kamery';
      setCameraError(
        `Nie udało się uruchomić kamery (${errorMessage}). Upewnij się, że przyznano uprawnienia do aparatu.`
      );
      setIsStreaming(false);
    }
  }, [facingMode, updateContainerRect]);

  // Switch facing mode (back/front camera)
  const handleToggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !isTorchOn;
      const trackWithTorch = track as unknown as { applyConstraints: (c: unknown) => Promise<void> };
      await trackWithTorch.applyConstraints({ advanced: [{ torch: nextState }] });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed', err);
    }
  };

  // Freeze / Unfreeze Frame for jitter-free measurement on ladder
  const handleToggleFreeze = () => {
    if (isFrozen) {
      setIsFrozen(false);
    } else {
      if (videoRef.current && frozenCanvasRef.current) {
        const v = videoRef.current;
        const c = frozenCanvasRef.current;
        c.width = v.videoWidth || v.clientWidth || 1280;
        c.height = v.videoHeight || v.clientHeight || 720;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          setIsFrozen(true);
        }
      }
    }
  };

  // D-pad micro-step adjustments (+/- 0.3% ≈ 2-3 mm)
  const handleNudgePoint = (dxPercent: number, dyPercent: number) => {
    if (scannerToolMode === 'laser_2pt') {
      const target = selectedPoint === 'B' ? 'B' : 'A';
      pushLaserHistory();
      if (target === 'A' && pointA) {
        setPointA({
          x: Math.max(1, Math.min(99, Math.round((pointA.x + dxPercent) * 10) / 10)),
          y: Math.max(1, Math.min(99, Math.round((pointA.y + dyPercent) * 10) / 10)),
        });
      } else if (target === 'B' && pointB) {
        setPointB({
          x: Math.max(1, Math.min(99, Math.round((pointB.x + dxPercent) * 10) / 10)),
          y: Math.max(1, Math.min(99, Math.round((pointB.y + dyPercent) * 10) / 10)),
        });
      }
    } else if (scannerToolMode === 'polygon_trace' && typeof selectedPoint === 'number') {
      setPolygonPoints((prev) =>
        prev.map((p, idx) =>
          idx === selectedPoint
            ? {
                ...p,
                x: Math.max(1, Math.min(99, Math.round((p.x + dxPercent) * 10) / 10)),
                y: Math.max(1, Math.min(99, Math.round((p.y + dyPercent) * 10) / 10)),
              }
            : p
        )
      );
    }
  };

  // Automatically start camera on mount
  useEffect(() => {
    queueMicrotask(() => startCamera('environment'));
    return () => {
      cameraRequestIdRef.current += 1;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick Presets for Measurement Mode
  const handleSetMeasurementMode = (mode: MeasurementMode) => {
    pushLaserHistory();
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

  // Safe Interactive Drag with Anti-Accidental Jump Protection
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setContainerRect(rect);
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    if (scannerToolMode === 'polygon_trace') {
      let closestIdx = -1;
      let minPolyDist = Infinity;
      polygonPoints.forEach((p, idx) => {
        const d = Math.hypot(clickX - p.x, clickY - p.y);
        if (d < minPolyDist) {
          minPolyDist = d;
          closestIdx = idx;
        }
      });

      // Drag existing vertex if tapped near it (tolerance 7%)
      if (minPolyDist < 7 && closestIdx !== -1) {
        setActiveDraggingPolyIdx(closestIdx);
        setSelectedPoint(closestIdx);
      } else {
        // Add new vertex only if explicitly clicking in blank area
        setSelectedPoint(polygonPoints.length);
        setPolygonPoints((prev) => [
          ...prev,
          { id: `poly-${Date.now()}`, x: Math.round(clickX * 10) / 10, y: Math.round(clickY * 10) / 10 },
        ]);
      }
      return;
    }

    // Laser 2-Point Mode: Anti-accidental jump protection
    if (!pointA || !pointB) return;

    const distA = Math.hypot(clickX - pointA.x, clickY - pointA.y);
    const distB = Math.hypot(clickX - pointB.x, clickY - pointB.y);

    if (distA < 9) {
      pushLaserHistory();
      setActiveDraggingPoint('A');
      setSelectedPoint('A');
    } else if (distB < 9) {
      pushLaserHistory();
      setActiveDraggingPoint('B');
      setSelectedPoint('B');
    } else {
      // If tapped outside handles, just select nearest point for D-pad adjustment WITHOUT teleporting!
      if (distA < distB) {
        setSelectedPoint('A');
      } else {
        setSelectedPoint('B');
      }
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const rawY = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));

    if (scannerToolMode === 'polygon_trace' && activeDraggingPolyIdx !== null) {
      let finalX = rawX;
      let finalY = rawY;
      const prevIdx = (activeDraggingPolyIdx - 1 + polygonPoints.length) % polygonPoints.length;
      const nextIdx = (activeDraggingPolyIdx + 1) % polygonPoints.length;
      const prevP = polygonPoints[prevIdx];
      const nextP = polygonPoints[nextIdx];

      // Magnetic snap to horizontal or vertical alignment with neighbors (threshold: 2.2%)
      if (prevP && Math.abs(rawX - prevP.x) < 2.2) finalX = prevP.x;
      if (prevP && Math.abs(rawY - prevP.y) < 2.2) finalY = prevP.y;
      if (nextP && Math.abs(rawX - nextP.x) < 2.2) finalX = nextP.x;
      if (nextP && Math.abs(rawY - nextP.y) < 2.2) finalY = nextP.y;

      setPolygonPoints((prev) =>
        prev.map((p, i) =>
          i === activeDraggingPolyIdx
            ? { ...p, x: Math.round(finalX * 10) / 10, y: Math.round(finalY * 10) / 10 }
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
      if (polygonPoints.length < 3) return;
      const metricVertices = polygonPoints.map((p) => ({
        x: (p.x / 100) * visibleFrameWidthMeters,
        y: (p.y / 100) * visibleFrameHeightMeters,
      }));
      const minX = Math.min(...metricVertices.map((v) => v.x));
      const minY = Math.min(...metricVertices.map((v) => v.y));
      const maxX = Math.max(...metricVertices.map((v) => v.x));
      const maxY = Math.max(...metricVertices.map((v) => v.y));

      const boundingW = Math.max(0.5, Math.round((maxX - minX) * 100) / 100);
      const boundingL = Math.max(0.5, Math.round((maxY - minY) * 100) / 100);

      const normalizedPoly = metricVertices.map((v) => ({
        x: Math.round((v.x - minX) * 100) / 100,
        y: Math.round((v.y - minY) * 100) / 100,
      }));

      onApplyMeasuredDimensions(boundingW, boundingL, roomHeight, normalizedPoly);
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

  // Determine which point the loupe should magnify right now
  const activeLoupePoint =
    activeDraggingPoint === 'A'
      ? pointA
      : activeDraggingPoint === 'B'
      ? pointB
      : activeDraggingPolyIdx !== null
      ? polygonPoints[activeDraggingPolyIdx]
      : null;

  const activeLoupeLabel =
    activeDraggingPoint === 'A'
      ? 'Punkt A'
      : activeDraggingPoint === 'B'
      ? 'Punkt B'
      : activeDraggingPolyIdx !== null
      ? `Narożnik ${activeDraggingPolyIdx + 1}`
      : undefined;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header & Quick Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Skaner & Wirtualna Miarka Optyczna</h3>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2 py-0.5 rounded-md">
                <Sparkles className="w-3 h-3 text-teal-400" />
                Lupa 3× & Poziomnica
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pomiary na żywo lub na stopklatce z lupą dotykową i wskaźnikiem poziomu
            </p>
          </div>
        </div>

        {/* Toolbar actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tool Mode Switcher */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setScannerToolMode('laser_2pt')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                scannerToolMode === 'polygon_trace'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Obrys Posadzki</span>
            </button>
          </div>

          {/* Freeze Frame Button */}
          {isStreaming && (
            <button
              type="button"
              onClick={handleToggleFreeze}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-xs ${
                isFrozen
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isFrozen ? 'Wznów podgląd na żywo z kamery' : 'Zamroź kadr do spokojnego pomiaru'}
            >
              {isFrozen ? (
                <>
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                  <span>Wznów na żywo</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-teal-400" />
                  <span>Zamroź kadr</span>
                </>
              )}
            </button>
          )}

          {/* Torch toggle */}
          {isStreaming && !isFrozen && isTorchSupported && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isTorchOn
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isTorchOn ? 'Wyłącz latarkę LED' : 'Włącz latarkę LED'}
            >
              {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
            </button>
          )}

          {/* Camera Switcher (front/back) */}
          {isStreaming && (
            <button
              onClick={handleToggleCamera}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              title="Przełącz aparat (tył / przód)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{facingMode === 'environment' ? 'Główny' : 'Przedni'}</span>
            </button>
          )}

          {/* Camera Power Toggle */}
          {isStreaming ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition cursor-pointer"
            >
              <VideoOff className="w-3.5 h-3.5" />
              <span>Wyłącz</span>
            </button>
          ) : (
            <button
              onClick={() => startCamera()}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400 transition cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Włącz Kamerę</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport & Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Video / Frozen Viewport */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div
            ref={containerRef}
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
                isStreaming && !isFrozen ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />

            {/* Frozen Canvas for Still Measurement without camera jitter */}
            <canvas
              ref={frozenCanvasRef}
              className={`w-full h-full object-cover ${isFrozen ? 'block' : 'hidden'}`}
            />

            {/* Offline / Placeholder Screen if Camera Not Streaming */}
            {!isStreaming && !isFrozen && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-xs space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <Camera className="h-8 w-8 animate-pulse" />
                </div>
                <div className="max-w-md space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Kamera jest wyłączona</h4>
                  <p className="text-xs text-slate-400">
                    Uruchom podgląd na żywo, aby dokonać precyzyjnych pomiarów laserowych lub obrysu posadzki.
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
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-teal-500 transition cursor-pointer"
                >
                  Uruchom Kamerę Urządzenia
                </button>
              </div>
            )}

            {/* Virtual Bubble Level Indicator Overlay */}
            {orientation.isSupported && isStreaming && (
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2 rounded-xl bg-slate-950/85 backdrop-blur-md px-3 py-1.5 border border-slate-800 text-xs shadow-lg">
                <Compass
                  className={`w-3.5 h-3.5 ${orientation.isLevel ? 'text-emerald-400' : 'text-slate-400'}`}
                />
                <span className="text-[11px] font-mono text-slate-300">
                  {orientation.isLevel ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      POZIOM {orientation.roll !== null ? `${Math.abs(orientation.roll).toFixed(1)}°` : ''}
                    </span>
                  ) : (
                    <span>Poziom: {orientation.roll !== null ? `${orientation.roll.toFixed(1)}°` : '--'}</span>
                  )}
                </span>
                {/* Bubble Bar */}
                <div className="w-14 h-2 bg-slate-800 rounded-full relative overflow-hidden flex items-center justify-center border border-slate-700">
                  <div className="w-0.5 h-full bg-slate-500 absolute" />
                  <div
                    className={`w-2 h-2 rounded-full absolute transition-all duration-75 ${
                      orientation.isLevel ? 'bg-emerald-400 scale-125' : 'bg-teal-400'
                    }`}
                    style={{
                      left: `calc(50% + ${Math.max(-22, Math.min(22, (orientation.roll || 0) * 3))}px - 4px)`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Freeze Badge */}
            {isFrozen && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-xl bg-sky-950/90 border border-sky-400/50 px-3 py-1.5 text-xs text-sky-200 backdrop-blur-md shadow-lg font-semibold">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>Kadr zamrożony (Tryb precyzyjny)</span>
              </div>
            )}

            {/* Magnifier Loupe (3x Zoom above dragged point) */}
            <MagnifierLoupe
              sourceElement={isFrozen ? frozenCanvasRef.current : videoRef.current}
              point={activeLoupePoint}
              containerRect={containerRect}
              zoom={3}
              size={130}
              label={activeLoupeLabel}
              visible={Boolean(activeLoupePoint)}
            />

            {/* SVG ACCURATE METRIC GRID & HUD OVERLAY */}
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

              {/* Laser Measurement Line between Point A and Point B */}
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
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center z-20 group ${
                      selectedPoint === 'A' ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950 rounded-full' : ''
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/40 border-2 border-teal-300 text-teal-100 text-xs font-bold shadow-lg shadow-teal-500/50 hover:scale-110 transition-transform">
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
                    className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center z-20 group ${
                      selectedPoint === 'B' ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 rounded-full' : ''
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/40 border-2 border-amber-300 text-amber-100 text-xs font-bold shadow-lg shadow-amber-500/50 hover:scale-110 transition-transform">
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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center z-20 group ${
                    selectedPoint === idx ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950 rounded-full' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600/90 border-2 border-teal-300 text-white text-xs font-bold shadow-lg hover:scale-120 transition-transform">
                    {idx + 1}
                  </div>
                </div>
              ))}

            {/* Sub-pixel Nudge D-pad (Mikro-kroki do precyzyjnego celowania) */}
            <div className="absolute right-3 bottom-14 z-30 flex flex-col items-center bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
              <span className="text-[9px] font-mono text-slate-400 mb-0.5">
                D-Pad: <strong className="text-teal-300">{scannerToolMode === 'laser_2pt' ? `Pkt ${selectedPoint}` : `Pkt ${(typeof selectedPoint === 'number' ? selectedPoint + 1 : 1)}`}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleNudgePoint(0, -0.3)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Mikro-krok w górę"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNudgePoint(-0.3, 0)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Mikro-krok w lewo"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {scannerToolMode === 'laser_2pt' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPoint(selectedPoint === 'B' ? 'A' : 'B')}
                    className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold font-mono border border-teal-500/40 cursor-pointer"
                    title="Zmień punkt A/B"
                  >
                    {selectedPoint === 'B' ? 'B' : 'A'}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-teal-400 font-bold px-1">
                    #{(typeof selectedPoint === 'number' ? selectedPoint + 1 : 1)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleNudgePoint(0.3, 0)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Mikro-krok w prawo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleNudgePoint(0, 0.3)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Mikro-krok w dół"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom HUD Bar */}
            <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/90 backdrop-blur-md px-3.5 py-2 text-xs border border-slate-800 text-slate-300 z-20">
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
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-500 transition shadow-sm cursor-pointer"
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

          {/* Quick Guidance Info & Undo Controls */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                {scannerToolMode === 'laser_2pt' ? (
                  <>
                    Przeciągaj punkty <strong>A</strong> i <strong>B</strong> – lupa 3× ułatwia trafienie w narożnik. Użyj D-Pada do mikro-kroków.
                  </>
                ) : (
                  <>
                    Klikaj po obrazie, aby dodać wierzchołki wielokąta. Przeciągaj punkty, by dopasować kontur posadzki.
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {scannerToolMode === 'laser_2pt' && (
                <button
                  onClick={handleUndoLaser}
                  disabled={laserHistory.length === 0}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-300 disabled:opacity-40 transition cursor-pointer"
                  title="Cofnij ostatnie przesunięcie punktu"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Cofnij</span>
                </button>
              )}

              {scannerToolMode === 'polygon_trace' && (
                <>
                  <button
                    onClick={handleUndoPolygonPoint}
                    disabled={polygonPoints.length <= 3}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] text-slate-300 disabled:opacity-40 transition cursor-pointer"
                    title="Cofnij ostatni punkt"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Cofnij</span>
                  </button>
                  <button
                    onClick={handleClearPolygon}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] text-slate-300 transition cursor-pointer"
                    title="Zresetuj wielokąt do prostokąta"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Calibration Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Measurement Mode Selector */}
          {scannerToolMode === 'laser_2pt' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                Kierunek Pomiaru Lasera
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSetMeasurementMode('wall_width')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border cursor-pointer ${
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
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border cursor-pointer ${
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
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition border cursor-pointer ${
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Kalibracja Optyczna Skali
              </h4>
              <span className="text-[10px] font-mono text-teal-400/80 bg-teal-950/60 border border-teal-800/60 px-2 py-0.5 rounded-full">
                {calibrationProfile.label}
              </span>
            </div>

            {/* Launch Calibration Modal Button */}
            <button
              type="button"
              id="open-scale-calibration-modal-btn"
              onClick={() => setIsCalibrationModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 py-2.5 px-3 text-xs font-bold text-teal-200 transition shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-teal-400" />
              <span>Kalibruj wg Wzorca (Karta / A4 / Własny)</span>
            </button>

            {/* Manual Distance Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Dystans kamery (skala):</span>
                <span className="font-mono text-teal-400 font-bold">{estimatedDistanceMeters.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.05"
                value={estimatedDistanceMeters}
                onChange={(e) => setEstimatedDistanceMeters(parseFloat(e.target.value))}
                className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5m (makro)</span>
                <span>2.6m (standard)</span>
                <span>6.0m (duża sala)</span>
              </div>
            </div>

            {/* Device Tilt / Pitch Compensation Toggle */}
            <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePitchCompensation}
                    onChange={(e) => setEnablePitchCompensation(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                  />
                  <span>Kompensacja kąta nachylenia (Pitch)</span>
                </label>
                {orientation.pitch !== null && (
                  <span className="text-[10px] font-mono font-bold text-teal-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {orientation.pitch > 0 ? `+${orientation.pitch.toFixed(1)}°` : `${orientation.pitch.toFixed(1)}°`}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Koryguje perspektywiczne skróty pionowe przy celowaniu w posadzkę lub sufit pod kątem.
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">Aktualne wymiary pomieszczenia:</div>
              <div className="flex justify-between font-mono text-slate-400">
                <span>
                  Szerokość: <strong className="text-slate-200">{roomWidth.toFixed(2)} m</strong>
                </span>
                <span>
                  Długość: <strong className="text-slate-200">{roomLength.toFixed(2)} m</strong>
                </span>
                <span>
                  Wysokość: <strong className="text-slate-200">{roomHeight.toFixed(2)} m</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Scale Calibration Modal */}
          <ScaleCalibrationModal
            isOpen={isCalibrationModalOpen}
            onClose={() => setIsCalibrationModalOpen(false)}
            onApplyCalibration={handleApplyCalibration}
            currentEstimatedDistance={estimatedDistanceMeters}
            currentFovAngle={calibratedFovAngle}
          />
        </div>
      </div>
    </div>
  );
};
