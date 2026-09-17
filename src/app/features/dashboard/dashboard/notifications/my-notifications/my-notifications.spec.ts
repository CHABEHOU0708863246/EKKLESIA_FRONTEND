import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyNotifications } from './my-notifications';

describe('MyNotifications', () => {
  let component: MyNotifications;
  let fixture: ComponentFixture<MyNotifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyNotifications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyNotifications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
