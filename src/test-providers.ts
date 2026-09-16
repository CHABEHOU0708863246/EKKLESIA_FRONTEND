import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

/**
 * Providers communs à TOUS les tests (`@angular/build:unit-test` → providersFile).
 *
 * Sans eux, chaque spec de composant échouait sur
 * `NG0201: No provider found for ActivatedRoute` (RouterLink) ou HttpClient dès
 * qu'un composant injectait un service. Les specs peuvent toujours surcharger
 * ces providers localement dans leur propre `TestBed.configureTestingModule`.
 */
const testProviders: (Provider | EnvironmentProviders)[] = [
  // Route joker vide : les composants qui redirigent (ex. /auth/login quand le
  // token manque) ne provoquent plus « NG04002: Cannot match any routes ».
  provideRouter([{ path: '**', children: [] }]),
  provideHttpClient(),
  provideHttpClientTesting(),
];

export default testProviders;
