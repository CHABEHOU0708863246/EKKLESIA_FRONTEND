import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChurchEdit } from './church-edit';

describe('ChurchEdit', () => {
  let component: ChurchEdit;
  let fixture: ComponentFixture<ChurchEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChurchEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChurchEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
