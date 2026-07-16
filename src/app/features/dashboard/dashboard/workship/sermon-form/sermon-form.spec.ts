import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SermonForm } from './sermon-form';

describe('SermonForm', () => {
  let component: SermonForm;
  let fixture: ComponentFixture<SermonForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SermonForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SermonForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
