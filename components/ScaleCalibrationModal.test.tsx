/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ScaleCalibrationModal } from './ScaleCalibrationModal';

describe('ScaleCalibrationModal Component', () => {
  it('renders calibration modal with presets when open', () => {
    render(
      <ScaleCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        onApplyCalibration={vi.fn()}
        currentEstimatedDistance={2.6}
        currentFovAngle={68}
      />
    );

    expect(screen.getByText('Kalibracja Optyczna Skali Pomiaru')).toBeDefined();
    expect(screen.getByText('Karta Płatnicza')).toBeDefined();
    expect(screen.getByText('Kartka A4')).toBeDefined();
    expect(screen.getByText('Płytka 60×60')).toBeDefined();
    expect(screen.getByText('Drzwi Standard')).toBeDefined();
    expect(screen.getByText('Własny Wymiar')).toBeDefined();
  });

  it('allows switching to custom dimension and adjusting cm value', () => {
    render(
      <ScaleCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        onApplyCalibration={vi.fn()}
        currentEstimatedDistance={2.6}
        currentFovAngle={68}
      />
    );

    const customBtn = screen.getByText('Własny Wymiar');
    fireEvent.click(customBtn);

    expect(screen.getByText('Wpisz znany wymiar (cm):')).toBeDefined();
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '150' } });
    expect((input as HTMLInputElement).value).toBe('150');
  });

  it('calls onApplyCalibration with calculated scale when clicking Zastosuj', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <ScaleCalibrationModal
        isOpen={true}
        onClose={onClose}
        onApplyCalibration={onApply}
        currentEstimatedDistance={2.6}
        currentFovAngle={68}
      />
    );

    const applyBtn = screen.getByText('Zastosuj Kalibrację');
    fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledTimes(1);
    const calib = onApply.mock.calls[0][0];
    expect(calib.visibleFrameWidthMeters).toBeGreaterThan(0);
    expect(calib.estimatedDistanceMeters).toBeGreaterThan(0);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onApplyCalibration with default distance when clicking Przywróć domyślne', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <ScaleCalibrationModal
        isOpen={true}
        onClose={onClose}
        onApplyCalibration={onApply}
        currentEstimatedDistance={2.6}
        currentFovAngle={68}
      />
    );

    const resetBtn = screen.getByText(/Przywróć domyślne/);
    fireEvent.click(resetBtn);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].estimatedDistanceMeters).toBe(2.6);
    expect(onClose).toHaveBeenCalled();
  });
});
