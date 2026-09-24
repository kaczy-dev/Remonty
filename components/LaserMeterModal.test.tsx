import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LaserMeterModal } from './LaserMeterModal';

describe('LaserMeterModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LaserMeterModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with target fields and Bluetooth connect button when open', () => {
    render(
      <LaserMeterModal
        isOpen={true}
        onClose={vi.fn()}
        currentTargetField="width"
      />
    );

    expect(screen.getByText('Dalmierz Laserowy Bluetooth')).toBeInTheDocument();
    expect(screen.getByText('Połącz z Dalmierzem (BLE)')).toBeInTheDocument();
    expect(screen.getByText('Długość ściany')).toBeInTheDocument();
    expect(screen.getByText('Szerokość ściany')).toBeInTheDocument();
  });

  it('allows switching target field and entering simulation mode', () => {
    const onSelectTargetField = vi.fn();
    const onApplyMeasurement = vi.fn();

    render(
      <LaserMeterModal
        isOpen={true}
        onClose={vi.fn()}
        currentTargetField="length"
        onSelectTargetField={onSelectTargetField}
        onApplyMeasurement={onApplyMeasurement}
      />
    );

    // Switch field to Height
    const heightBtn = screen.getByText('Wysokość ściany');
    fireEvent.click(heightBtn);
    expect(onSelectTargetField).toHaveBeenCalledWith('height');

    // Click simulator button
    const simBtn = screen.getByText(/Włącz tryb symulatora/i);
    fireEvent.click(simBtn);

    expect(screen.getByText(/Tryb Symulatora/i)).toBeInTheDocument();
    expect(screen.getByText(/Symuluj strzał laserem/i)).toBeInTheDocument();

    // Click one of the test shot buttons e.g. 2.65 m
    const shotBtn = screen.getByText('2.65 m');
    fireEvent.click(shotBtn);

    expect(onApplyMeasurement).toHaveBeenCalledWith(2.65, 'height');
  });

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<LaserMeterModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Zamknij');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
