import { TestBed } from '@angular/core/testing';

import { PastorAppointmentService } from './pastort-appointment';

describe('PastorAppointmentService', () => {
  let service: PastorAppointmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PastorAppointmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
