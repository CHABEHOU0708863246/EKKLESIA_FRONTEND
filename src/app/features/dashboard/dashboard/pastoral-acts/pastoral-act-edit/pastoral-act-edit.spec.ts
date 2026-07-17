import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastoralActEdit } from './pastoral-act-edit';

describe('PastoralActEdit', () => {
  let component: PastoralActEdit;
  let fixture: ComponentFixture<PastoralActEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastoralActEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastoralActEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
