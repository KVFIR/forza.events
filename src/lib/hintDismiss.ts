const PREFIX = 'forza.hint.';

export function isHintDismissed(id: string): boolean {
  try {
    return localStorage.getItem(PREFIX + id) === '1';
  } catch {
    return false;
  }
}

export function dismissHint(id: string): void {
  try {
    localStorage.setItem(PREFIX + id, '1');
  } catch {
    /* quota / private mode */
  }
}
