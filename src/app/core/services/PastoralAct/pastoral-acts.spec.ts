import { TestBed } from '@angular/core/testing';

import { PastoralActs } from './pastoral-acts';

describe('PastoralActs', () => {
  let service: PastoralActs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PastoralActs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
