import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CommandPaletteModal } from './CommandPaletteModal';
import { DEFAULT_RENOVATION_PROJECT } from '@/lib/default-data';

describe('CommandPaletteModal Component', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    project: structuredClone(DEFAULT_RENOVATION_PROJECT),
    activePipelineStep: 'measure' as const,
    theme: 'dark' as const,
    isWakeLockActive: false,
    onSelectPipelineStep: vi.fn(),
    onSelectRoom: vi.fn(),
    onOpenAddExpense: vi.fn(),
    onOpenAddRoomModal: vi.fn(),
    onOpenReportModal: vi.fn(),
    onOpenBackupModal: vi.fn(),
    onOpenAIModal: vi.fn(),
    onOpenProjectSwitcher: vi.fn(),
    onOpenKeyboardShortcuts: vi.fn(),
    onToggleWakeLock: vi.fn(),
    onToggleTheme: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<CommandPaletteModal {...mockProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders search input and initial rooms and stages when open', () => {
    render(<CommandPaletteModal {...mockProps} />);

    expect(screen.getByPlaceholderText(/Szukaj pokoju, etapu lub wpisz akcję/i)).toBeInTheDocument();
    // Default project has rooms: Łazienka z Walk-In, Salon z aneksem
    expect(screen.getByText('Łazienka z Walk-In')).toBeInTheDocument();
    expect(screen.getByText('1. Pomiary & Rzut 2D')).toBeInTheDocument();
    expect(screen.getByText('3. Kosztorys & Wydatki')).toBeInTheDocument();
  });

  it('filters items correctly based on input query', () => {
    render(<CommandPaletteModal {...mockProps} />);
    const input = screen.getByPlaceholderText(/Szukaj pokoju, etapu lub wpisz akcję/i);

    fireEvent.change(input, { target: { value: 'wydatek' } });
    expect(screen.getByText(/Nowy wydatek \/ Skanuj paragon/i)).toBeInTheDocument();
    expect(screen.queryByText('1. Pomiary & Rzut 2D')).toBeNull();
  });

  it('calls onSelectRoom and onClose when clicking a room item', () => {
    render(<CommandPaletteModal {...mockProps} />);
    const roomItem = screen.getByText('Łazienka z Walk-In');

    fireEvent.click(roomItem);
    expect(mockProps.onSelectRoom).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onSelectPipelineStep and onClose when clicking a workflow stage', () => {
    render(<CommandPaletteModal {...mockProps} />);
    const stageItem = screen.getByText('3. Kosztorys & Wydatki');

    fireEvent.click(stageItem);
    expect(mockProps.onSelectPipelineStep).toHaveBeenCalledWith('cost');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('executes quick actions such as toggle wake lock or open report', () => {
    render(<CommandPaletteModal {...mockProps} />);
    const reportItem = screen.getByText('Generuj raport techniczny i kosztorys');

    fireEvent.click(reportItem);
    expect(mockProps.onOpenReportModal).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press or backdrop click', () => {
    render(<CommandPaletteModal {...mockProps} />);
    const input = screen.getByPlaceholderText(/Szukaj pokoju, etapu lub wpisz akcję/i);

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
