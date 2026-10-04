import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizePolishText,
  parsePolishWordsToNumber,
  extractDimensionMeters,
  guessExpenseCategory,
  parseVoiceCommand,
  speakPolish,
  playVoiceSoundCue,
} from './speech-parser';

describe('Speech Parser (Polish Construction Voice Assistant)', () => {
  describe('normalizePolishText', () => {
    it('lowercases and cleans punctuation and whitespace', () => {
      expect(normalizePolishText('  Szerokość:   3,45 METRA!? ')).toBe('szerokość: 3,45 metra');
    });
  });

  describe('parsePolishWordsToNumber', () => {
    it('parses single numeric strings', () => {
      expect(parsePolishWordsToNumber(['3.45'])).toBe(3.45);
      expect(parsePolishWordsToNumber(['120'])).toBe(120);
    });

    it('parses "i pół" / "pół"', () => {
      expect(parsePolishWordsToNumber(['pół'])).toBe(0.5);
      expect(parsePolishWordsToNumber(['dwa', 'i', 'pół'])).toBe(2.5);
      expect(parsePolishWordsToNumber(['trzy', 'pół'])).toBe(3.5);
    });

    it('parses "przecinek" decimals', () => {
      expect(parsePolishWordsToNumber(['trzy', 'przecinek', 'cztery'])).toBe(3.4);
      expect(parsePolishWordsToNumber(['dwa', 'przecinek', 'pięć'])).toBe(2.5);
    });

    it('parses compound numbers up to thousands', () => {
      expect(parsePolishWordsToNumber(['sto', 'dwadzieścia'])).toBe(120);
      expect(parsePolishWordsToNumber(['trzysta', 'pięćdziesiąt'])).toBe(350);
      expect(parsePolishWordsToNumber(['tysiąc', 'dwieście'])).toBe(1200);
    });
  });

  describe('extractDimensionMeters', () => {
    it('extracts meters and centimeters format ("3 metry 40")', () => {
      expect(extractDimensionMeters('3 metry 40')).toBe(3.4);
      expect(extractDimensionMeters('4 metry 25 cm')).toBe(4.25);
      expect(extractDimensionMeters('2m 80cm')).toBe(2.8);
    });

    it('extracts centimeter values ("340 cm" or "85 centymetrów")', () => {
      expect(extractDimensionMeters('340 cm')).toBe(3.4);
      expect(extractDimensionMeters('85 centymetrów')).toBe(0.85);
      expect(extractDimensionMeters('3400 mm')).toBe(3.4);
    });

    it('extracts decimal meters ("3,45 m" or "3.45")', () => {
      expect(extractDimensionMeters('3,45 m')).toBe(3.45);
      expect(extractDimensionMeters('2.65 metra')).toBe(2.65);
    });

    it('extracts bare construction numbers in typical cm range', () => {
      expect(extractDimensionMeters('340')).toBe(3.4);
      expect(extractDimensionMeters('260')).toBe(2.6);
    });

    it('extracts spoken phrases ("dwa i pół metra")', () => {
      expect(extractDimensionMeters('dwa i pół metra')).toBe(2.5);
    });
  });

  describe('guessExpenseCategory', () => {
    it('detects labor for contractors', () => {
      expect(guessExpenseCategory('zaliczka dla glazurnika')).toBe('Robocizna / Ekipa');
      expect(guessExpenseCategory('robocizna malowanie')).toBe('Robocizna / Ekipa');
    });

    it('detects tools', () => {
      expect(guessExpenseCategory('nowy wałek i pędzel')).toBe('Narzędzia i sprzęt');
      expect(guessExpenseCategory('tarcza diamentowa')).toBe('Narzędzia i sprzęt');
    });

    it('detects transport or debris', () => {
      expect(guessExpenseCategory('transport płyt')).toBe('Transport i wniesienie');
      expect(guessExpenseCategory('kontener na gruz')).toBe('Wywóz gruzu i utylizacja');
    });

    it('detects finishes and materials', () => {
      expect(guessExpenseCategory('farba lateksowa biała')).toBe('Wykończenie i dekoracje');
      expect(guessExpenseCategory('klej do siatki')).toBe('Materiały budowlane');
    });
  });

  describe('parseVoiceCommand', () => {
    it('parses dimension commands: width', () => {
      const res = parseVoiceCommand('szerokość 3 metry 40');
      expect(res.type).toBe('SET_DIMENSION');
      expect(res.dimensionPayload?.target).toBe('width');
      expect(res.dimensionPayload?.value).toBe(3.4);
      expect(res.feedbackText).toContain('3.40 m');
    });

    it('parses dimension commands: length', () => {
      const res = parseVoiceCommand('długość 4 i pół metra');
      expect(res.type).toBe('SET_DIMENSION');
      expect(res.dimensionPayload?.target).toBe('length');
      expect(res.dimensionPayload?.value).toBe(4.5); // "4 i pół" = 4.5m
    });

    it('parses dimension commands: height', () => {
      const res = parseVoiceCommand('wysokość 2,65');
      expect(res.type).toBe('SET_DIMENSION');
      expect(res.dimensionPayload?.target).toBe('height');
      expect(res.dimensionPayload?.value).toBe(2.65);
    });

    it('parses dimension commands: diagonals', () => {
      const d1 = parseVoiceCommand('przekątna jeden 5 metrów 20');
      expect(d1.type).toBe('SET_DIMENSION');
      expect(d1.dimensionPayload?.target).toBe('diagonal1');
      expect(d1.dimensionPayload?.value).toBe(5.2);

      const d2 = parseVoiceCommand('przekątna 2: 5,18');
      expect(d2.type).toBe('SET_DIMENSION');
      expect(d2.dimensionPayload?.target).toBe('diagonal2');
      expect(d2.dimensionPayload?.value).toBe(5.18);
    });

    it('parses expense commands with title and amount in PLN', () => {
      const res = parseVoiceCommand('dodaj wydatek 120 zł na klej do płytek');
      expect(res.type).toBe('ADD_EXPENSE');
      expect(res.expensePayload?.amount).toBe(120);
      expect(res.expensePayload?.title).toContain('Klej do płytek');
      expect(res.expensePayload?.category).toBe('Materiały budowlane');
    });

    it('parses openings (window / door)', () => {
      const win = parseVoiceCommand('dodaj okno 120 na 140');
      expect(win.type).toBe('ADD_OPENING');
      expect(win.openingPayload?.type).toBe('window');
      expect(win.openingPayload?.width).toBe(1.2);
      expect(win.openingPayload?.height).toBe(1.4);

      const door = parseVoiceCommand('dodaj drzwi 90 na 200');
      expect(door.type).toBe('ADD_OPENING');
      expect(door.openingPayload?.type).toBe('door');
      expect(door.openingPayload?.width).toBe(0.9);
      expect(door.openingPayload?.height).toBe(2);
    });

    it('parses Polish trade door sizes (osiemdziesiątki, dziewięćdziesiątki)', () => {
      const d80 = parseVoiceCommand('dodaj drzwi osiemdziesiątki');
      expect(d80.type).toBe('ADD_OPENING');
      expect(d80.openingPayload?.type).toBe('door');
      expect(d80.openingPayload?.width).toBe(0.9);
      expect(d80.openingPayload?.height).toBe(2.05);

      const d90 = parseVoiceCommand('drzwi dziewięćdziesiątki');
      expect(d90.type).toBe('ADD_OPENING');
      expect(d90.openingPayload?.width).toBe(1.0);
      expect(d90.openingPayload?.height).toBe(2.05);
    });

    it('parses verbal window and door dimensions ("metr dwadzieścia na metr czterdzieści")', () => {
      const win = parseVoiceCommand('okno metr dwadzieścia na metr czterdzieści');
      expect(win.type).toBe('ADD_OPENING');
      expect(win.openingPayload?.type).toBe('window');
      expect(win.openingPayload?.width).toBe(1.2);
      expect(win.openingPayload?.height).toBe(1.4);
    });

    it('parses instant actions (laser, next room, save, connect, multishot, freeze, torch, square, materials)', () => {
      const laser = parseVoiceCommand('laser');
      expect(laser.type).toBe('TRIGGER_ACTION');
      expect(laser.actionPayload?.action).toBe('laser_measure');

      const next = parseVoiceCommand('następne pomieszczenie');
      expect(next.type).toBe('TRIGGER_ACTION');
      expect(next.actionPayload?.action).toBe('next_room');

      const save = parseVoiceCommand('zapisz projekt');
      expect(save.type).toBe('TRIGGER_ACTION');
      expect(save.actionPayload?.action).toBe('save');

      const conn = parseVoiceCommand('połącz dalmierz');
      expect(conn.type).toBe('TRIGGER_ACTION');
      expect(conn.actionPayload?.action).toBe('laser_connect');

      const multi = parseVoiceCommand('kolejka pomiarów');
      expect(multi.type).toBe('TRIGGER_ACTION');
      expect(multi.actionPayload?.action).toBe('laser_multishot');

      const freeze = parseVoiceCommand('zamroź kadr');
      expect(freeze.type).toBe('TRIGGER_ACTION');
      expect(freeze.actionPayload?.action).toBe('camera_freeze');

      const torch = parseVoiceCommand('włącz latarkę');
      expect(torch.type).toBe('TRIGGER_ACTION');
      expect(torch.actionPayload?.action).toBe('camera_torch');

      const square = parseVoiceCommand('wyprostuj kąty');
      expect(square.type).toBe('TRIGGER_ACTION');
      expect(square.actionPayload?.action).toBe('auto_square');

      const mat = parseVoiceCommand('ile farby');
      expect(mat.type).toBe('TRIGGER_ACTION');
      expect(mat.actionPayload?.action).toBe('calculate_materials');
    });

    it('parses notes and defects', () => {
      const note = parseVoiceCommand('notatka sprawdzić rurę odpływową');
      expect(note.type).toBe('ADD_NOTE');
      expect(note.notePayload?.isDefect).toBe(false);
      expect(note.notePayload?.note).toContain('sprawdzić rurę odpływową');

      const defect = parseVoiceCommand('usterka pęknięty tynk przy suficie');
      expect(defect.type).toBe('ADD_NOTE');
      expect(defect.notePayload?.isDefect).toBe(true);
      expect(defect.notePayload?.note).toContain('pęknięty tynk');
    });

    it('returns UNKNOWN for unrecognizable commands', () => {
      const unk = parseVoiceCommand('jaki dzisiaj obiad');
      expect(unk.type).toBe('UNKNOWN');
      expect(unk.feedbackText).toContain('Nie rozpoznano');
    });
  });

  describe('Audio Cues & Speech Synthesis', () => {
    it('safely executes speakPolish without error when window.speechSynthesis is mocked', () => {
      const cancelMock = vi.fn();
      const speakMock = vi.fn();
      const getVoicesMock = vi.fn().mockReturnValue([{ lang: 'pl-PL', name: 'Zosia' }]);

      (window as any).speechSynthesis = {
        cancel: cancelMock,
        speak: speakMock,
        getVoices: getVoicesMock,
      };
      (window as any).SpeechSynthesisUtterance = class {
        text: string;
        lang = '';
        constructor(text: string) {
          this.text = text;
        }
      };

      const onEnd = vi.fn();
      speakPolish('Ustawiono szerokość', onEnd);
      expect(cancelMock).toHaveBeenCalled();
      expect(speakMock).toHaveBeenCalled();
    });

    it('safely handles playVoiceSoundCue', () => {
      expect(() => playVoiceSoundCue('listening')).not.toThrow();
      expect(() => playVoiceSoundCue('success')).not.toThrow();
      expect(() => playVoiceSoundCue('error')).not.toThrow();
    });
  });
});
