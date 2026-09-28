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

  it('toggles attic roof mode and triggers onUpdateAtticRoof', () => {
    const onUpdateAtticRoofMock = vi.fn();

    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
        onUpdateAtticRoof={onUpdateAtticRoofMock}
      />
    );

    // Look for the attic toggle in 3D tab
    const atticToggle = screen.getByTestId('attic-toggle');
    expect(atticToggle).not.toBeChecked();

    fireEvent.click(atticToggle);

    expect(onUpdateAtticRoofMock).toHaveBeenCalledWith(
      'test-room-1',
      expect.objectContaining({
        isAttic: true,
      })
    );
  });

  it('renders attic metrics and allows adjusting knee wall and pitch when attic is enabled', () => {
    const onUpdateAtticRoofMock = vi.fn();
    const atticRoom: Room = {
      ...mockRoom,
      atticRoof: {
        isAttic: true,
        kneeWallHeightM: 1.0,
        roofPitchDeg: 42,
        slopeWall: 'both_sides',
        hasSkylight: true,
      },
    };

    render(
      <ViewRoomScanMeasure
        room={atticRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
        onUpdateAtticRoof={onUpdateAtticRoofMock}
      />
    );

    // Attic badge in top bar
    expect(screen.getByText(/Użytkowa \(PN-ISO\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Połać skosu G-K/i)).toBeInTheDocument();

    // Attic card elements
    const kneeSlider = screen.getByTestId('knee-wall-slider');
    expect(kneeSlider).toBeInTheDocument();

    fireEvent.change(kneeSlider, { target: { value: '1.20' } });
    expect(onUpdateAtticRoofMock).toHaveBeenCalledWith(
      'test-room-1',
      expect.objectContaining({
        kneeWallHeightM: 1.2,
      })
    );

    // Norm info box should be visible
    expect(screen.getByText(/Norma PN-ISO 9836/i)).toBeInTheDocument();
  });

  it('renders Diagonals Inspector, calculates ideal diagonal, and assesses PN-B-10100 thresholds', () => {
    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    // Switch to blueprint tab
    const blueprintTabBtn = screen.getByRole('button', { name: /Rzut 2D/i });
    fireEvent.click(blueprintTabBtn);

    // Diagonals Inspector Card should be present
    expect(screen.getByTestId('diagonals-inspector-card')).toBeInTheDocument();
    expect(screen.getByText(/Asystent Kątów Prostych & Przekątnych/i)).toBeInTheDocument();

    // For 4.0m x 5.0m, ideal diagonal is sqrt(16 + 25) = sqrt(41) ~ 6.403 m
    expect(screen.getByText('6.403 m')).toBeInTheDocument();

    const d1Input = screen.getByTestId('input-diagonal-d1');
    const d2Input = screen.getByTestId('input-diagonal-d2');

    // Case 1: Difference <= 5 mm (Ideal)
    fireEvent.change(d1Input, { target: { value: '6.402' } });
    fireEvent.change(d2Input, { target: { value: '6.405' } });
    expect(screen.getByText('Idealny kąt prosty (odchyłka w normie PN-B-10100)')).toBeInTheDocument();
    expect(screen.getByText('3 mm')).toBeInTheDocument();

    // Case 2: Difference 6-15 mm (Minor skew)
    fireEvent.change(d1Input, { target: { value: '6.400' } });
    fireEvent.change(d2Input, { target: { value: '6.412' } });
    expect(screen.getByText('Drobny skos (do wyrównania klejem lub tynkiem)')).toBeInTheDocument();
    expect(screen.getByText('12 mm')).toBeInTheDocument();

    // Case 3: Difference > 15 mm (Out of square)
    fireEvent.change(d1Input, { target: { value: '6.380' } });
    fireEvent.change(d2Input, { target: { value: '6.425' } });
    expect(
      screen.getByText('Wyraźny brak kąta prostego (wymaga korekty tynkarskiej lub przedścianki G-K)')
    ).toBeInTheDocument();
    expect(screen.getByText('45 mm')).toBeInTheDocument();
  });

  it('triggers onUpdateRoomDimensions when +/- 1cm or +/- 5cm micro-adjust buttons are clicked', () => {
    const onUpdateRoomDimensionsMock = vi.fn();

    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={onUpdateRoomDimensionsMock}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    // In 3D tab: width = 4.0, length = 5.0, height = 2.5
    // Click +1cm for width
    const add1cmButtons = screen.getAllByTitle('Dodaj 1 cm');
    fireEvent.click(add1cmButtons[0]);
    expect(onUpdateRoomDimensionsMock).toHaveBeenCalledWith(
      'test-room-1',
      4.01,
      5.0,
      2.5,
      undefined
    );

    // Click -5cm for width (4.01m - 0.05m = 3.96m)
    const sub5cmButtons = screen.getAllByTitle('Odejmij 5 cm');
    fireEvent.click(sub5cmButtons[0]);
    expect(onUpdateRoomDimensionsMock).toHaveBeenCalledWith(
      'test-room-1',
      3.96,
      5.0,
      2.5,
      undefined
    );
  });

  it('copies formatted room dimensions to clipboard in SMS / WhatsApp format', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const copyBtn = screen.getByTestId('copy-summary-btn');
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];

    // Verify SMS / WhatsApp format matches contractor expectations
    expect(copiedText).toContain('Salon Testowy: 4.00m x 5.00m, H=2.50m');
    expect(copiedText).toContain('Pow. podłogi: 20.00m²');
    expect(copiedText).toContain('Obwód: 18.00m');
    expect(copiedText).toContain('Pow. ścian netto: 40.5m²');

    // Visual feedback after click
    expect(await screen.findByText(/Skopiowano obmiar!/i)).toBeInTheDocument();
  });

  it('allows switching between Diagonals, Rule 3-4-5, and Ceiling Heights sub-tabs', () => {
    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const blueprintTabBtn = screen.getByRole('button', { name: /Rzut 2D/i });
    fireEvent.click(blueprintTabBtn);

    // Switch to Rule 3-4-5
    const rule345Btn = screen.getByRole('button', { name: /Reguła 3-4-5/i });
    fireEvent.click(rule345Btn);
    expect(screen.getByText(/Wybierz trójkąt wzorcowy/i)).toBeInTheDocument();
    expect(screen.getByText(/Przyprostokątna A/i)).toBeInTheDocument();

    // Switch to Ceiling Heights
    const ceilingBtn = screen.getByRole('button', { name: /Strop \(4 Rogi\)/i });
    fireEvent.click(ceilingBtn);
    expect(screen.getAllByText(/USKOK STROPU/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lewy-Tył \(NW\)/i)).toBeInTheDocument();
  });

  it('opens Bluetooth Laser Meter Modal when clicking Dalmierz BLE button', () => {
    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const laserBtn = screen.getByTestId('open-laser-modal-btn');
    fireEvent.click(laserBtn);

    expect(screen.getByText('Dalmierz Laserowy Bluetooth')).toBeInTheDocument();
    expect(screen.getByText('Połącz z Dalmierzem (BLE)')).toBeInTheDocument();
  });

  it('opens Photo Markup Modal when clicking Foto-Wymiarowanie button', () => {
    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={vi.fn()}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const photoMarkupBtn = screen.getByTestId('open-photo-markup-btn');
    fireEvent.click(photoMarkupBtn);

    expect(screen.getByText(/Foto-Wymiarowanie • Salon Testowy/i)).toBeInTheDocument();
    expect(screen.getByText('Wymiar (Strzałka)')).toBeInTheDocument();
    expect(screen.getByText('Pinezka instalacji')).toBeInTheDocument();
  });

  it('opens Hands-Free Voice Assistant Modal when clicking Głos Wolne Ręce button and applies dimension command', () => {
    const onUpdateRoomDimensionsMock = vi.fn();
    render(
      <ViewRoomScanMeasure
        room={mockRoom}
        onUpdateRoomDimensions={onUpdateRoomDimensionsMock}
        onAddFurniture={vi.fn()}
        onAddOutlet={vi.fn()}
      />
    );

    const voiceBtn = screen.getByTestId('open-voice-modal-btn');
    fireEvent.click(voiceBtn);

    expect(screen.getByText('Asystent Głosowy „Wolne Ręce”')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Wpisz komendę/i);
    const submitBtn = screen.getByText('Wyślij');
    fireEvent.change(input, { target: { value: 'szerokość 3,80' } });
    fireEvent.click(submitBtn);

    expect(onUpdateRoomDimensionsMock).toHaveBeenCalledWith(
      'test-room-1',
      3.8,
      mockRoom.length,
      mockRoom.height,
      mockRoom.polygonVertices
    );
  });
});


