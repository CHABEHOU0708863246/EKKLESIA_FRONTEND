import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyZone } from './my-zone';

describe('MyZone', () => {
  let component: MyZone;
  let fixture: ComponentFixture<MyZone>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyZone]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyZone);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
