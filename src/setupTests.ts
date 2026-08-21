import '@testing-library/jest-dom/vitest';

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// jsdom has no WebGL and logs a noisy "not implemented" error for any context
// it doesn't support. Return null instead, which is also the path a real
// browser without WebGL2 takes — the headline falls back to plain DOM text.
const realGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function getContext(
  this: HTMLCanvasElement,
  contextId: string,
  ...args: unknown[]
) {
  if (contextId === 'webgl' || contextId === 'webgl2') return null;
  return (realGetContext as (...a: unknown[]) => unknown).call(
    this,
    contextId,
    ...args
  );
} as typeof HTMLCanvasElement.prototype.getContext;
