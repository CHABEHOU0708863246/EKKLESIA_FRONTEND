import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferingDashboard } from './offering-dashboard';

describe('OfferingDashboard', () => {
  let component: OfferingDashboard;
  let fixture: ComponentFixture<OfferingDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferingDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
