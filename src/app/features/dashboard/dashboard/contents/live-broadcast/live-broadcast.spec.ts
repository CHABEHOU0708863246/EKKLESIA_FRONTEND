import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveBroadcast } from './live-broadcast';

describe('LiveBroadcast', () => {
  let component: LiveBroadcast;
  let fixture: ComponentFixture<LiveBroadcast>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveBroadcast]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveBroadcast);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
