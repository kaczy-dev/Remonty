// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { CameraMeasurementScanner } from './CameraMeasurementScanner';

describe('CameraMeasurementScanner Component', () => {
  const originalImage = window.Image;
  const originalFileReader = window.FileReader;

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn(), getCapabilities: () => ({ torch: true }) }],
          getVideoTracks: () => [{ stop: vi.fn(), applyConstraints: vi.fn() }],
        }),
      },
      configurable: true,
    });

    // Mock HTMLCanvasElement.prototype.getContext for jsdom
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(64 * 36 * 4).fill(120),
      }),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillRect: vi.fn(),
    }) as any;

    // Mock Image for photo loading
    window.Image = class {
      onload: (() => void) | null = null;
      naturalWidth = 1920;
      naturalHeight = 1080;
      width = 1920;
      height = 1080;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 5);
      }
    } as any;

    // Mock FileReader for photo upload
    window.FileReader = class {
      onload: ((e: any) => void) | null = null;
      readAsDataURL() {
        setTimeout(() => {
          this.onload?.({ target: { result: 'data:image/jpeg;base64,mockphoto' } });
        }, 5);
      }
    } as any;
  });

  afterEach(() => {
    window.Image = originalImage;
    window.FileReader = originalFileReader;
  });

  it('renders measurement scanner with D-pad controls and preset buttons', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Skaner & Wirtualna Miarka Optyczna')).toBeDefined();
    expect(screen.getByText('Laser 2-pkt')).toBeDefined();
    expect(screen.getByText('Obrys Posadzki')).toBeDefined();
    expect(screen.getByText(/D-Pad:/)).toBeDefined();
  });

  it('allows nudging point A coordinates with D-Pad controls', async () => {
    const onApply = vi.fn();
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={onApply}
        />
      );
    });

    // Initial button text for point A
    const pointToggleButton = screen.getByTitle('Zmień punkt A/B');
    expect(pointToggleButton.textContent).toBe('A');

    // Nudge right
    const nudgeRightBtn = screen.getByTitle('Mikro-krok w prawo');
    await act(async () => {
      fireEvent.click(nudgeRightBtn);
    });

    // Undo button should now be enabled
    const undoBtn = screen.getByTitle('Cofnij ostatnie przesunięcie punktu');
    expect(undoBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(undoBtn);
    });
  });

  it('opens scale calibration modal and allows calibrating via reference object', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    const openCalibBtn = screen.getByText('Kalibruj wg Wzorca (Karta / A4 / Własny)');
    await act(async () => {
      fireEvent.click(openCalibBtn);
    });

    expect(screen.getByText('Kalibracja Optyczna Skali Pomiaru')).toBeDefined();
    const applyCalibBtn = screen.getByText('Zastosuj Kalibrację');
    await act(async () => {
      fireEvent.click(applyCalibBtn);
    });

    // Modal closed
    expect(screen.queryByText('Kalibracja Optyczna Skali Pomiaru')).toBeNull();
  });

  it('allows toggling pitch tilt compensation checkbox', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    const pitchCheckbox = screen.getByLabelText('Kompensacja kąta nachylenia (Pitch)') as HTMLInputElement;
    expect(pitchCheckbox.checked).toBe(true);

    await act(async () => {
      fireEvent.click(pitchCheckbox);
    });
    expect(pitchCheckbox.checked).toBe(false);
  });

  it('allows toggling AI edge detection assist button', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    const aiEdgeBtn = screen.getByTitle('Wykrywanie krawędzi i przyciąganie do listew/narożników');
    expect(aiEdgeBtn).toBeDefined();
    expect(aiEdgeBtn.textContent).toContain('AI Krawędzie');

    await act(async () => {
      fireEvent.click(aiEdgeBtn);
    });
    expect(aiEdgeBtn.textContent).toContain('AI Krawędzie');
  });

  it('renders fallback toolbar buttons for native camera capture, photo upload, and diagnostics', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Aparat Foto')).toBeDefined();
    expect(screen.getByText('Wgraj')).toBeDefined();
    expect(screen.getByTitle('Informacje diagnostyczne (rozdzielczość, FPS, światło, kąt)')).toBeDefined();
  });

  it('toggles diagnostic HUD overlay with resolution, FPS, lighting, and pitch info', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    const diagToggle = screen.getByTitle('Informacje diagnostyczne (rozdzielczość, FPS, światło, kąt)');
    await act(async () => {
      fireEvent.click(diagToggle);
    });

    expect(screen.getByText('Diagnostyka Skanera')).toBeDefined();
    expect(screen.getByText('Rozdzielczość:')).toBeDefined();
    expect(screen.getByText('Klatki (FPS):')).toBeDefined();
    expect(screen.getByText('Oświetlenie:')).toBeDefined();
  });

  it('allows selecting new construction presets in ScaleCalibrationModal (poziomica, gres, płyta g-k)', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    const openCalibBtn = screen.getByText('Kalibruj wg Wzorca (Karta / A4 / Własny)');
    await act(async () => {
      fireEvent.click(openCalibBtn);
    });

    // Filter by Poziomice
    const toolFilterBtn = screen.getByText('Poziomice');
    await act(async () => {
      fireEvent.click(toolFilterBtn);
    });

    // Click 100 cm level
    const level100Btn = screen.getByText('Poziomica budowlana 100 cm');
    await act(async () => {
      fireEvent.click(level100Btn);
    });

    expect(screen.getByText('Baza wzorca:')).toBeDefined();
    expect(screen.getAllByText('1.00 m').length).toBeGreaterThan(0);

    // Confirm calibration
    const applyBtn = screen.getByText('Zastosuj Kalibrację');
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    // Profile badge should reflect applied preset
    expect(screen.getByText('Poziomica budowlana 100 cm')).toBeDefined();
  });

  it('applies measured dimension to room and shows confirmation feedback toast', async () => {
    const onApply = vi.fn();
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={onApply}
        />
      );
    });

    const applyBtn = screen.getByText(/Zastosuj do/);
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    expect(onApply).toHaveBeenCalled();
    // Feedback toast appears
    expect(screen.getByText(/Zastosowano /)).toBeDefined();
  });

  it('handles photo upload from file input and enters frozen frame measurement mode', async () => {
    await act(async () => {
      render(
        <CameraMeasurementScanner
          roomWidth={4.5}
          roomLength={5.2}
          roomHeight={2.6}
          onApplyMeasuredDimensions={vi.fn()}
        />
      );
    });

    const fileInput = screen.getByLabelText('Wybierz zdjęcie z galerii') as HTMLInputElement;
    const file = new File(['mock'], 'zdjecie-budowa.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
      // Allow simulated async Image.onload / FileReader.onload
      await new Promise((r) => setTimeout(r, 30));
    });

    // Should display photo source badge and live camera return button
    expect(screen.getByText(/zdjecie-budowa\.jpg/)).toBeDefined();
    expect(screen.getByText('Kamera na żywo')).toBeDefined();
  });
});

