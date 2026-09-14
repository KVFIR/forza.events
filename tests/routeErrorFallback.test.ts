import {describe, expect, it} from 'vitest';
import {isChunkLoadError} from '../src/components/RouteErrorFallback';

describe('isChunkLoadError', () => {
  it('matches Vite dynamic import failures after a 502', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://forza.events/assets/index-DIdWe9GX.js',
        ),
      ),
    ).toBe(true);
  });

  it('matches Firefox and MIME failures', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'error loading dynamically imported module: https://forza.events/assets/x.js',
        ),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to load module script: Expected a JavaScript module but the server responded with a MIME type of "text/html"',
        ),
      ),
    ).toBe(true);
  });

  it('does not treat unrelated render errors as chunk failures', () => {
    expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false);
  });
});
