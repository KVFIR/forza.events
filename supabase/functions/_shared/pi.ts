/** FH6 PI → class (matches src/lib/pi.ts). */
export function piToClass(pi: number): string {
  const p = Math.min(999, Math.max(100, Math.round(pi)));
  if (p >= 901) return 'R';
  if (p >= 801) return 'S2';
  if (p >= 701) return 'S1';
  if (p >= 601) return 'A';
  if (p >= 501) return 'B';
  if (p >= 401) return 'C';
  return 'D';
}

export function formatMaxPi(maxPi: number): string {
  const p = Math.min(999, Math.max(100, Math.round(maxPi)));
  return `${piToClass(p)} ${p}`;
}
