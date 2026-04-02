export type Region = 'vlaanderen' | 'wallonie' | 'brussel';

/**
 * Belgian postal code → region mapping.
 *
 * Brussel/BHG:  1000–1299
 * Wallonie:     1300–1499, 4000–7999
 * Vlaanderen:   1500–3999, 8000–9999
 */
export function deriveRegion(postalCode: string): Region | null {
  const code = parseInt(postalCode, 10);
  if (isNaN(code) || code < 1000 || code > 9999) return null;

  if (code >= 1000 && code <= 1299) return 'brussel';
  if (code >= 1300 && code <= 1499) return 'wallonie';
  if (code >= 1500 && code <= 3999) return 'vlaanderen';
  if (code >= 4000 && code <= 7999) return 'wallonie';
  if (code >= 8000 && code <= 9999) return 'vlaanderen';

  return null;
}
