// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { CameraMeasurementScanner } from './CameraMeasurementScanner';

describe('CameraMeasurementScanner Component', () => {
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
});
