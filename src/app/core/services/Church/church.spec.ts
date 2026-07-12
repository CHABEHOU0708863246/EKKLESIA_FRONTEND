import { TestBed } from '@angular/core/testing';

import { Church } from './church';

describe('Church', () => {
  let service: Church;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Church);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
