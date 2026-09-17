import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditLogList } from './audit-log-list';

describe('AuditLogList', () => {
  let component: AuditLogList;
  let fixture: ComponentFixture<AuditLogList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditLogList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
