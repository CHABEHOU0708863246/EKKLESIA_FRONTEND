import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentForm } from './content-form';

describe('ContentForm', () => {
  let component: ContentForm;
  let fixture: ComponentFixture<ContentForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
