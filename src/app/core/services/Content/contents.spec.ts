import { TestBed } from '@angular/core/testing';

import { Contents } from './contents';

describe('Contents', () => {
  let service: Contents;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Contents);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
