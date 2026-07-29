import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventChurchStats } from './event-church-stats';

describe('EventChurchStats', () => {
  let component: EventChurchStats;
  let fixture: ComponentFixture<EventChurchStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventChurchStats]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventChurchStats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
