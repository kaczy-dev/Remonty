import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

describe('KeyboardShortcutsModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders shortcuts list when open', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Skróty klawiszowe')).toBeInTheDocument();
    expect(screen.getByText(/Otwórz Command Palette/i)).toBeInTheDocument();
    expect(screen.getByText(/Przełącz na poprzednie pomieszczenie/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Zamknij');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
