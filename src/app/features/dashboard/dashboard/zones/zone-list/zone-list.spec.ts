import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneList } from './zone-list';

describe('ZoneList', () => {
  let component: ZoneList;
  let fixture: ComponentFixture<ZoneList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoneList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
