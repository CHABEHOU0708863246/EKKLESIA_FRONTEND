import { TestBed } from '@angular/core/testing';

import { PastortAppointment } from './pastort-appointment';

describe('PastortAppointment', () => {
  let service: PastortAppointment;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PastortAppointment);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
