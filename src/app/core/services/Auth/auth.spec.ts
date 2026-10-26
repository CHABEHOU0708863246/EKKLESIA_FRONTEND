import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { environment } from '../../../../environments/environment';

import { Auth } from './auth';
import { Token } from '../Token/token';

describe('Auth', () => {
  let service: Auth;
  let httpMock: HttpTestingController;
  let token: Token;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
    token = TestBed.inject(Token);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it("ne déclenche qu'UN SEUL rafraîchissement pour des appels concurrents", () => {
    vi.spyOn(token, 'getToken').mockReturnValue('access-token-expire');
    vi.spyOn(token, 'getRefreshToken').mockReturnValue('refresh-token-1');
    vi.spyOn(token, 'updateTokens');

    const received: string[] = [];
    service.refreshAccessToken().subscribe((t) => received.push(t));
    service.refreshAccessToken().subscribe((t) => received.push(t));

    const requests = httpMock.match(`${environment.apiUrl}/api/v1/Auth/refresh-token`);
    expect(requests.length).toBe(1);

    requests[0].flush({ token: 'nouveau-token', refreshToken: 'refresh-token-2' });

    expect(received).toEqual(['nouveau-token', 'nouveau-token']);
    expect(token.updateTokens).toHaveBeenCalledTimes(1);
    expect(token.updateTokens).toHaveBeenCalledWith('nouveau-token', 'refresh-token-2');
  });

  it('purge la session quand le refresh est réellement refusé (400)', () => {
    vi.spyOn(token, 'getToken').mockReturnValue('access-token-expire');
    vi.spyOn(token, 'getRefreshToken').mockReturnValue('refresh-token-invalide');
    vi.spyOn(token, 'clearSession');

    let failed = false;
    let emitted = false;
    service.refreshAccessToken().subscribe({
      next: () => (emitted = true),
      error: () => (failed = true),
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/api/v1/Auth/refresh-token`);
    request.flush({ message: 'Refresh token invalide' }, { status: 400, statusText: 'Bad Request' });

    expect(emitted).toBe(false);
    expect(failed).toBe(true);
    expect(token.clearSession).toHaveBeenCalled();
  });
});
