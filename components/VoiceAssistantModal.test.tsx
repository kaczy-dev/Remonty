// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { VoiceAssistantModal } from './VoiceAssistantModal';

describe('VoiceAssistantModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <VoiceAssistantModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with microphone button and preset commands when open', () => {
    render(
      <VoiceAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        currentRoomName="Salon Główny"
      />
    );

    expect(screen.getByText('Asystent Głosowy „Wolne Ręce”')).toBeDefined();
    expect(screen.getByText(/Salon Główny/)).toBeDefined();
    expect(screen.getByLabelText('Rozpocznij nasłuchiwanie głosu')).toBeDefined();
    expect(screen.getByText(/„szerokość 3,45”/)).toBeDefined();
  });

  it('executes manual text input command and invokes onApplyCommand callback', () => {
    const onApplyCommandMock = vi.fn();
    render(
      <VoiceAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        onApplyCommand={onApplyCommandMock}
      />
    );

    const input = screen.getByPlaceholderText(/Wpisz komendę/i);
    const submitBtn = screen.getByText('Wyślij');

    fireEvent.change(input, { target: { value: 'szerokość 4 metry 20' } });
    fireEvent.click(submitBtn);

    expect(onApplyCommandMock).toHaveBeenCalledTimes(1);
    const cmd = onApplyCommandMock.mock.calls[0][0];
    expect(cmd.type).toBe('SET_DIMENSION');
    expect(cmd.dimensionPayload?.target).toBe('width');
    expect(cmd.dimensionPayload?.value).toBe(4.2);

    // Should display last command feedback
    expect(screen.getByText(/Ustawiono szerokość: 4.20 m/i)).toBeDefined();
  });

  it('executes preset fast-tag button when clicked', () => {
    const onApplyCommandMock = vi.fn();
    render(
      <VoiceAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        onApplyCommand={onApplyCommandMock}
      />
    );

    const presetBtn = screen.getByText(/„wydatek 120 zł klej”/);
    fireEvent.click(presetBtn);

    expect(onApplyCommandMock).toHaveBeenCalled();
    const cmd = onApplyCommandMock.mock.calls[0][0];
    expect(cmd.type).toBe('ADD_EXPENSE');
    expect(cmd.expensePayload?.amount).toBe(120);
  });

  it('toggles cheat sheet hints display', () => {
    render(
      <VoiceAssistantModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByText('Wzorce mowy');
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Przykładowe zwroty rozpoznawane przez asystenta/i)).toBeDefined();
  });
});
