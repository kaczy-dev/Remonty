import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoMarkupModal } from './PhotoMarkupModal';

describe('PhotoMarkupModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <PhotoMarkupModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with tools and controls when open', () => {
    render(
      <PhotoMarkupModal
        isOpen={true}
        onClose={vi.fn()}
        roomName="Salon"
      />
    );

    expect(screen.getByText(/Foto-Wymiarowanie • Salon/i)).toBeInTheDocument();
    expect(screen.getByText('Wymiar (Strzałka)')).toBeInTheDocument();
    expect(screen.getByText('Pinezka instalacji')).toBeInTheDocument();
    expect(screen.getByText('Pobierz JPG')).toBeInTheDocument();
    expect(screen.getByText(/Wyślij \(WhatsApp\)/i)).toBeInTheDocument();
  });

  it('allows switching between Dimension and Pin tools and displays pin categories', () => {
    render(<PhotoMarkupModal isOpen={true} onClose={vi.fn()} />);

    const pinToolBtn = screen.getByText('Pinezka instalacji');
    fireEvent.click(pinToolBtn);

    expect(screen.getByText('Gniazdo 230V')).toBeInTheDocument();
    expect(screen.getByText('Siła 400V (Indukcja)')).toBeInTheDocument();
    expect(screen.getByText('Włącznik światła')).toBeInTheDocument();
    expect(screen.getByText('Podejście wody (Z/C)')).toBeInTheDocument();
  });

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<PhotoMarkupModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Zamknij');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
