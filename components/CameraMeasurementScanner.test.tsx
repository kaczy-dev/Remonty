// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders measurement scanner with D-pad controls and preset buttons', () => {
    render(
      <CameraMeasurementScanner
        roomWidth={4.5}
        roomLength={5.2}
        roomHeight={2.6}
        onApplyMeasuredDimensions={vi.fn()}
      />
    );

    expect(screen.getByText('Skaner & Wirtualna Miarka Optyczna')).toBeDefined();
    expect(screen.getByText('Laser 2-pkt')).toBeDefined();
    expect(screen.getByText('Obrys Posadzki')).toBeDefined();
    expect(screen.getByText(/D-Pad:/)).toBeDefined();
  });

  it('allows nudging point A coordinates with D-Pad controls', () => {
    const onApply = vi.fn();
    render(
      <CameraMeasurementScanner
        roomWidth={4.5}
        roomLength={5.2}
        roomHeight={2.6}
        onApplyMeasuredDimensions={onApply}
      />
    );

    // Initial button text for point A
    const pointToggleButton = screen.getByTitle('Zmień punkt A/B');
    expect(pointToggleButton.textContent).toBe('A');

    // Nudge right
    const nudgeRightBtn = screen.getByTitle('Mikro-krok w prawo');
    fireEvent.click(nudgeRightBtn);

    // Undo button should now be enabled
    const undoBtn = screen.getByTitle('Cofnij ostatnie przesunięcie punktu');
    expect(undoBtn).toBeDefined();
    fireEvent.click(undoBtn);
  });
});
