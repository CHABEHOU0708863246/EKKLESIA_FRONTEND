import { describe, expect, it } from 'vitest';
import { IMAGE_LIMITS, formatBytes, validateImageFile } from './image-tools';

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('validateImageFile', () => {
  it('refuse un fichier absent', () => {
    const result = validateImageFile(null);
    expect(result.ok).toBe(false);
  });

  it('refuse un type non image (PDF)', () => {
    const result = validateImageFile(makeFile('doc.pdf', 'application/pdf', 10));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });

  it('refuse un fichier trop lourd', () => {
    const result = validateImageFile(makeFile('big.jpg', 'image/jpeg', IMAGE_LIMITS.maxInputBytes + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FILE_TOO_LARGE');
  });

  it('accepte une image valide', () => {
    const result = validateImageFile(makeFile('photo.png', 'image/png', 1024));
    expect(result.ok).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formate les octets, kilo-octets et méga-octets', () => {
    expect(formatBytes(500)).toBe('500 o');
    expect(formatBytes(2048)).toBe('2 Ko');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 Mo');
  });
});
