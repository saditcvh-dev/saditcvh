import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionMatrix } from './permission-matrix';

describe('PermissionMatrix', () => {
  let component: PermissionMatrix;
  let fixture: ComponentFixture<PermissionMatrix>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionMatrix]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionMatrix);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
