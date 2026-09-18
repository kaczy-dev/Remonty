import { describe, it, expect } from 'vitest';
import { getLocalExpertAdvice } from './expert-advisor';
import { Room } from '@/types/renovation';

const mockRoom: Room = {
  id: 'test-room',
  name: 'Łazienka testowa',
  type: 'lazienka',
  width: 2.5,
  length: 2.0,
  height: 2.6,
  area: 5.0,
  wallArea: 20.0,
  perimeter: 9.0,
  openings: [],
  furniture: [],
  outlets: [],
  photoUrl: '',
  notes: '',
  design: {
    floorType: 'Gres wielkoformatowy',
    floorColor: '#333333',
    wallType: 'Płytki rektyfikowane',
    wallColor: '#ffffff',
    ceilingColor: '#ffffff',
    lightingTempK: 4000,
  },
};

describe('getLocalExpertAdvice', () => {
  it('handles image inspection requests with PN-B-10110 guidelines', () => {
    const result = getLocalExpertAdvice({
      prompt: 'Oceń to pęknięcie',
      currentRoom: mockRoom,
      currentStep: 'qa',
      hasImage: true,
    });

    expect(result.source).toBe('local_engineering_engine');
    expect(result.advice).toContain('PN-B-10110:2005');
    expect(result.advice).toContain('Odchyłki od płaszczyzny');
  });

  it('provides waterproofing advice for wet zones', () => {
    const result = getLocalExpertAdvice({
      prompt: 'Jak wykonać hydroizolację w kabinie prysznicowej?',
      currentRoom: mockRoom,
      currentStep: 'design',
    });

    expect(result.advice).toContain('Hydroizolacja');
    expect(result.advice).toContain('200 cm');
    expect(result.advice).toContain('Folia w płynie');
  });

  it('provides adhesive and tile advice (PN-EN 12004)', () => {
    const result = getLocalExpertAdvice({
      prompt: 'Jaki klej do gresu na podłogówkę?',
      currentRoom: mockRoom,
      currentStep: 'design',
    });

    expect(result.advice).toContain('C2TE S1');
    expect(result.advice).toContain('Floating-Buttering');
  });

  it('calculates material waste margins accurately', () => {
    const result = getLocalExpertAdvice({
      prompt: 'Ile materiałów i kleju kupić?',
      currentRoom: mockRoom,
      currentStep: 'cost',
    });

    expect(result.advice).toContain('Bilans Materiałowy');
    expect(result.advice).toContain('5.0 m²');
  });
});
