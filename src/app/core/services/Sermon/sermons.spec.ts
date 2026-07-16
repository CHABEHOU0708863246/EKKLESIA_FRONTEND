import { TestBed } from '@angular/core/testing';

import { Sermons } from './sermons';

describe('Sermons', () => {
  let service: Sermons;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sermons);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
