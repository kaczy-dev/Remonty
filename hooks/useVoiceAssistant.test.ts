// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceAssistant } from './useVoiceAssistant';

describe('useVoiceAssistant Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default values and isSupported detection', () => {
    const { result } = renderHook(() => useVoiceAssistant());

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.lastCommand).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.voiceFeedbackEnabled).toBe(true);
    expect(result.current.continuousMode).toBe(false);
  });

  it('executes processTextInput and invokes onCommand callback', () => {
    const onCommandMock = vi.fn();
    const { result } = renderHook(() =>
      useVoiceAssistant({ onCommand: onCommandMock, voiceFeedbackDefault: false })
    );

    act(() => {
      const cmd = result.current.processTextInput('szerokość 3,45');
      expect(cmd.type).toBe('SET_DIMENSION');
      expect(cmd.dimensionPayload?.value).toBe(3.45);
    });

    expect(onCommandMock).toHaveBeenCalledTimes(1);
    expect(result.current.lastCommand?.type).toBe('SET_DIMENSION');
    expect(result.current.history.length).toBe(1);
    expect(result.current.transcript).toBe('szerokość 3,45');
  });

  it('handles simulated SpeechRecognition session lifecycle', () => {
    let mockInstance: any = null;

    class MockSpeechRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onstart: (() => void) | null = null;
      onresult: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        mockInstance = this;
        this.onstart?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }

    (window as any).SpeechRecognition = MockSpeechRecognition;

    const onCommandMock = vi.fn();
    const { result } = renderHook(() =>
      useVoiceAssistant({ onCommand: onCommandMock, voiceFeedbackDefault: false })
    );

    expect(result.current.isSupported).toBe(true);

    // Start listening
    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);

    // Simulate speech event with final transcript
    act(() => {
      mockInstance.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'wysokość 2,60' }], { isFinal: true }),
        ],
      });
    });

    expect(result.current.transcript).toBe('wysokość 2,60');
    expect(result.current.lastCommand?.type).toBe('SET_DIMENSION');
    expect(result.current.lastCommand?.dimensionPayload?.value).toBe(2.6);
    expect(onCommandMock).toHaveBeenCalled();

    // Stop listening
    act(() => {
      result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });

  it('allows toggling voice feedback, continuous mode, and clearing history', () => {
    const { result } = renderHook(() => useVoiceAssistant({ voiceFeedbackDefault: false }));

    act(() => {
      result.current.setVoiceFeedbackEnabled(true);
      result.current.setContinuousMode(true);
      result.current.processTextInput('laser');
    });

    expect(result.current.voiceFeedbackEnabled).toBe(true);
    expect(result.current.continuousMode).toBe(true);
    expect(result.current.history.length).toBe(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.lastCommand).toBeNull();
  });
});
