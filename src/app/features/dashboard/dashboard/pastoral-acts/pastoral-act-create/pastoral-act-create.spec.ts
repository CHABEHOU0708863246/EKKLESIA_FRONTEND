import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastoralActCreate } from './pastoral-act-create';

describe('PastoralActCreate', () => {
  let component: PastoralActCreate;
  let fixture: ComponentFixture<PastoralActCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastoralActCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastoralActCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
