import { TestBed } from '@angular/core/testing';

import { Offerings } from './offerings';

describe('Offerings', () => {
  let service: Offerings;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Offerings);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
