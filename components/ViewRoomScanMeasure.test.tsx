import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewRoomScanMeasure } from './ViewRoomScanMeasure';
import { Room } from '@/types/renovation';

vi.mock('@/components/Room3DViewer', () => ({
  Room3DViewer: () => <div data-testid="mock-room-3d-viewer" />,
}));

const mockRoom: Room = {
  id: 'test-room-1',
  name: 'Salon Testowy',
  type: 'salon',
  width: 4.0,
  length: 5.0,
  height: 2.5,
  area: 20.0,
  perimeter: 18.0,
  wallArea: 40.5, // 18 * 2.5 = 45; minus window (1.2 * 1.4 = 1.68) and door (0.9 * 2.05 = 1.845) => 41.475
  openings: [
    {
      id: 'op-win-1',
      type: 'window',
      name: 'Okno Salonowe',
      width: 1.2,
      height: 1.4,
      wall: 'left',
    },
    {
      id: 'op-door-1',
      type: 'door',
      name: 'Drzwi Pokojowe',
      width: 0.9,
      height: 2.0,
      wall: 'right',
    },
  ],
  furniture: [],
  outlets: [],
  notes: '',
  photoUrl: '',
  design: {
    floorType: 'Panele winylowe',
    floorColor: '#e2e8f0',
    wallType: 'Gładź gipsowa',
    wallColor: '#ffffff',
    ceilingColor: '#ffffff',
    lightingTempK: 4000,
  },
};

describe('ViewRoomScanMeasure Component', () => {
  it('renders room openings list and displays deductions', () => {
    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    // Switch to blueprint tab to view dimensions & openings cards
    const blueprintTabBtn = screen.getByRole('button', { name: /Rzut 2D/i });
    fireEvent.click(blueprintTabBtn);

    // Openings Card Header
    expect(screen.getByText(/Stolarka Otworowa/i)).toBeInTheDocument();
    expect(screen.getByText('2 szt.')).toBeInTheDocument();

    // Check Window and Door names (rendered both on SVG floorplan and in Stolarka Otworowa card)
    expect(screen.getAllByText('Okno Salonowe').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Drzwi Pokojowe').length).toBeGreaterThanOrEqual(2);

    // Check area deductions
    // Window: 1.2 * 1.4 = 1.68 m2
    expect(screen.getByText('-1.68 m²')).toBeInTheDocument();
    // Door: 0.9 * 2.0 = 1.80 m2
    expect(screen.getByText('-1.80 m²')).toBeInTheDocument();
  });

  it('triggers onDeleteOpening when delete button is clicked', () => {
    const onDeleteOpeningMock = vi.fn();

    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onDeleteOpening={onDeleteOpeningMock}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const blueprintTabBtn = screen.getByRole('button', { name: /Rzut 2D/i });
    fireEvent.click(blueprintTabBtn);

    const deleteButtons = screen.getAllByTitle('Usuń otwór');
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[0]);
    expect(onDeleteOpeningMock).toHaveBeenCalledWith('test-room-1', 'op-win-1');
  });

  it('opens add opening modal and adds a new opening', () => {
    const onAddOpeningMock = vi.fn();

    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddOpening={onAddOpeningMock}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const blueprintTabBtn = screen.getByRole('button', { name: /Rzut 2D/i });
    fireEvent.click(blueprintTabBtn);

    const addWindowBtn = screen.getByRole('button', { name: /\+ Dodaj Okno/i });
    fireEvent.click(addWindowBtn);

    // Modal should appear
    expect(screen.getByText('Dodaj Okno')).toBeInTheDocument();

    // Click submit button in modal
    const submitBtn = screen.getByRole('button', { name: /Dodaj do Pomieszczenia i Przelicz Ściany/i });
    fireEvent.click(submitBtn);

    expect(onAddOpeningMock).toHaveBeenCalledTimes(1);
    expect(onAddOpeningMock).toHaveBeenCalledWith(
      'test-room-1',
      expect.objectContaining({
        type: 'window',
        width: 1.2,
        height: 1.4,
        wall: 'left',
      })
    );
  });

  it('renders custom polygon outline in 2D blueprint when polygonVertices are provided', () => {
    const polygonRoom: Room = {
      ...mockRoom,
      polygonVertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 2, y: 3 },
        { x: 2, y: 5 },
        { x: 0, y: 5 },
      ],
    };

    const { container } = render(
      <ViewRoomScanMeasure
        room={polygonRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const blueprintTabBtn = screen.getByRole('button', { name: /Rzut 2D/i });
    fireEvent.click(blueprintTabBtn);

    const polygonElement = container.querySelector('polygon');
    expect(polygonElement).not.toBeNull();
  });
});
