import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicEventRegistration } from './public-event-registration';

describe('PublicEventRegistration', () => {
  let component: PublicEventRegistration;
  let fixture: ComponentFixture<PublicEventRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicEventRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicEventRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
