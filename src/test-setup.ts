/**
 * Environnement de test global (Vitest / jsdom).
 *
 * jsdom n'implémente pas `window.matchMedia`, utilisé par le service de thème
 * (mode clair/sombre). Sans ce polyfill, tout composant qui injecte le thème
 * échoue au rendu de test avec « window.matchMedia is not a function ».
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}
