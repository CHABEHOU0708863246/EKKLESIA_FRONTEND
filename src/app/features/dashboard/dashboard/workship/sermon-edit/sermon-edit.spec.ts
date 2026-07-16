import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SermonEdit } from './sermon-edit';

describe('SermonEdit', () => {
  let component: SermonEdit;
  let fixture: ComponentFixture<SermonEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SermonEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SermonEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
