import { TestBed } from '@angular/core/testing';

import { Dashboards } from './dashboards';

describe('Dashboards', () => {
  let service: Dashboards;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Dashboards);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
