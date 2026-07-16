import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SermonList } from './sermon-list';

describe('SermonList', () => {
  let component: SermonList;
  let fixture: ComponentFixture<SermonList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SermonList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SermonList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
