import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberCreate } from './member-create';

describe('MemberCreate', () => {
  let component: MemberCreate;
  let fixture: ComponentFixture<MemberCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
