import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as THREE from 'three';
import { Export3DModal } from './Export3DModal';
import { Room } from '@/types/renovation';

vi.mock('@/lib/exporters/model-3d-exporter', () => {
  return {
    exportToGLB: vi.fn().mockResolvedValue({
      blob: new Blob(['glb-binary'], { type: 'model/gltf-binary' }),
      url: 'blob:mock-glb-url',
      filename: 'pokoj_salon.glb',
      sizeBytes: 1024,
    }),
    exportToUSDZ: vi.fn().mockResolvedValue({
      blob: new Blob(['usdz-binary'], { type: 'model/vnd.usdz+zip' }),
      url: 'blob:mock-usdz-url',
      filename: 'pokoj_ar_salon.usdz',
      sizeBytes: 512,
    }),
    triggerFileDownload: vi.fn(),
    launchAppleARQuickLook: vi.fn(),
    detectDevicePlatform: vi.fn().mockReturnValue({
      isIOS: false,
      isAndroid: false,
      isMobile: false,
    }),
  };
});

const mockRoom: Room = {
  id: 'room-test-1',
  name: 'Salon Wypoczynkowy',
  type: 'salon',
  width: 4.5,
  length: 5.5,
  height: 2.7,
  area: 24.75,
  perimeter: 20.0,
  wallArea: 54.0,
  furniture: [
    {
      id: 'f1',
      name: 'Sofa',
      iconType: 'sofa',
      x: 2,
      y: 2,
      width: 2.0,
      height: 0.9,
      rotation: 0,
      color: '#384252',
    },
  ],
  outlets: [],
  openings: [],
  notes: '',
  photoUrl: '',
  design: {
    floorType: 'Drewno dębowe',
    floorColor: '#e2e8f0',
    wallType: 'Gładź gipsowa',
    wallColor: '#ffffff',
    ceilingColor: '#ffffff',
    lightingTempK: 4000,
  },
};

describe('Export3DModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Export3DModal
        isOpen={false}
        onClose={vi.fn()}
        room={mockRoom}
        sceneObject={new THREE.Group()}
      />
    );

    expect(screen.queryByTestId('export-3d-modal')).not.toBeInTheDocument();
  });

  it('renders room details and export buttons when open', () => {
    render(
      <Export3DModal
        isOpen={true}
        onClose={vi.fn()}
        room={mockRoom}
        sceneObject={new THREE.Group()}
      />
    );

    expect(screen.getByTestId('export-3d-modal')).toBeInTheDocument();
    expect(screen.getByText('Salon Wypoczynkowy')).toBeInTheDocument();
    expect(screen.getByText(/4.50 × 5.50 m/i)).toBeInTheDocument();
    expect(screen.getByText(/Meble:/i)).toBeInTheDocument();

    expect(screen.getByTestId('export-glb-btn')).toBeInTheDocument();
    expect(screen.getByTestId('export-usdz-btn')).toBeInTheDocument();
    expect(screen.getByTestId('launch-ar-btn')).toBeInTheDocument();
  });

  it('triggers exportToGLB and triggerFileDownload on GLB button click', async () => {
    const { exportToGLB, triggerFileDownload } = await import('@/lib/exporters/model-3d-exporter');

    render(
      <Export3DModal
        isOpen={true}
        onClose={vi.fn()}
        room={mockRoom}
        sceneObject={new THREE.Group()}
      />
    );

    const glbBtn = screen.getByTestId('export-glb-btn');
    fireEvent.click(glbBtn);

    await waitFor(() => {
      expect(exportToGLB).toHaveBeenCalledTimes(1);
      expect(triggerFileDownload).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/Pomyślnie wygenerowano:/i)).toBeInTheDocument();
    expect(screen.getByText(/pokoj_salon.glb/i)).toBeInTheDocument();
  });

  it('triggers exportToUSDZ and triggerFileDownload on USDZ button click', async () => {
    const { exportToUSDZ, triggerFileDownload } = await import('@/lib/exporters/model-3d-exporter');

    render(
      <Export3DModal
        isOpen={true}
        onClose={vi.fn()}
        room={mockRoom}
        sceneObject={new THREE.Group()}
      />
    );

    const usdzBtn = screen.getByTestId('export-usdz-btn');
    fireEvent.click(usdzBtn);

    await waitFor(() => {
      expect(exportToUSDZ).toHaveBeenCalledTimes(1);
      expect(triggerFileDownload).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/Pomyślnie wygenerowano:/i)).toBeInTheDocument();
    expect(screen.getByText(/pokoj_ar_salon.usdz/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();

    render(
      <Export3DModal
        isOpen={true}
        onClose={onCloseMock}
        room={mockRoom}
        sceneObject={new THREE.Group()}
      />
    );

    const closeBtn = screen.getByTitle('Zamknij');
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
