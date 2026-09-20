import { describe, it, expect } from 'vitest';
import { calculateTargetDimensions } from './image-compressor';

describe('calculateTargetDimensions', () => {
  it('keeps dimensions unchanged if already smaller than max bounds', () => {
    const res = calculateTargetDimensions(800, 600, 1920, 1080);
    expect(res).toEqual({ width: 800, height: 600 });
  });

  it('scales down landscape image preserving aspect ratio', () => {
    // 3840x2160 (4K landscape) -> 1920x1080
    const res = calculateTargetDimensions(3840, 2160, 1920, 1080);
    expect(res).toEqual({ width: 1920, height: 1080 });
  });

  it('scales down portrait photo from smartphone (e.g. 3024x4032)', () => {
    // Smartphone portrait: 3024 x 4032 (3:4 ratio) with max 1920 x 1080
    const res = calculateTargetDimensions(3024, 4032, 1920, 1080);
    // Height 1080 is the limiting factor: 1080 / 4032 = 0.267857...
    // Width: round(3024 * 0.267857) = 810
    expect(res.height).toBe(1080);
    expect(res.width).toBe(810);
  });

  it('scales down square photo preserving 1:1 aspect ratio', () => {
    const res = calculateTargetDimensions(3000, 3000, 1920, 1080);
    expect(res.height).toBe(1080);
    expect(res.width).toBe(1080);
  });
});
