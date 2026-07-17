import { TestBed } from '@angular/core/testing';

import { Budjets } from './budjets';

describe('Budjets', () => {
  let service: Budjets;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Budjets);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
