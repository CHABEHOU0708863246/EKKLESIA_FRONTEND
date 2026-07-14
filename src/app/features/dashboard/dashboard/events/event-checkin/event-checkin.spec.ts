import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventCheckin } from './event-checkin';

describe('EventCheckin', () => {
  let component: EventCheckin;
  let fixture: ComponentFixture<EventCheckin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventCheckin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventCheckin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
