import { TestBed } from '@angular/core/testing';

import { PublicRegistrationService } from './public-registration-service';

describe('PublicRegistrationService', () => {
  let service: PublicRegistrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PublicRegistrationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
