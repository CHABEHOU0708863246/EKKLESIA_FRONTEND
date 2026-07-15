import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceAttendance } from './service-attendance';

describe('ServiceAttendance', () => {
  let component: ServiceAttendance;
  let fixture: ComponentFixture<ServiceAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceAttendance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceAttendance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
